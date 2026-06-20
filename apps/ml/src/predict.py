import json
import pickle
from pathlib import Path

import numpy as np
import pandas as pd
from scipy.special import expit

from .constants import SEVERITY_THRESHOLDS, ARTIFACTS_DIR
from .features import Encoders, engineer_severity
from .fingerprint import Fingerprinter
from .logger import get_logger

log = get_logger("gridlock.predict")


def _severity_label(score: float) -> str:
    for threshold, label in SEVERITY_THRESHOLDS:
        if score < threshold:
            return label
    return "Critical"


def find_latest_artifacts() -> Path | None:
    if not ARTIFACTS_DIR.exists():
        return None
    dirs = sorted(ARTIFACTS_DIR.iterdir(), reverse=True)
    for d in dirs:
        if not d.is_dir():
            continue
        # Support both legacy (lgb+cat) and champion (generic) artifact formats
        if (d / "lgb_model_0.txt").exists() or (d / "champion_model.pkl").exists():
            return d
    return None


class Predictor:
    def __init__(self, artifacts_dir: Path | None = None):
        if artifacts_dir is None:
            artifacts_dir = find_latest_artifacts()
        if artifacts_dir is None:
            raise FileNotFoundError("No trained artifacts found")

        self.artifacts_dir = artifacts_dir
        self.timestamp = artifacts_dir.name
        self._champion_model = None  # Generic champion model (any type)
        self._regime_models = None   # Soft-blend regime models
        self._regime_config = None   # Regime routing config

        # Detect artifact format: champion (generic) vs legacy (lgb+cat)
        if (artifacts_dir / "champion_model.pkl").exists():
            self._load_champion_artifacts(artifacts_dir)
        else:
            self._load_legacy_artifacts(artifacts_dir)

        ref_path = artifacts_dir / "reference.parquet"
        self.fingerprinter = Fingerprinter(ref_path) if ref_path.exists() else None

        log.info("Predictor loaded from %s", artifacts_dir)

    def _load_conformal_calibration(self, artifacts_dir: Path):
        """Load conformal calibration residuals for prediction intervals."""
        cal_path = artifacts_dir / "conformal_calibration.json"
        if cal_path.exists():
            with open(cal_path) as f:
                self._conformal_cal = json.load(f)
            log.info("Loaded conformal calibration: %d corridors", len(self._conformal_cal) - 1)
        else:
            self._conformal_cal = None

    def _load_champion_artifacts(self, artifacts_dir: Path):
        """Load generic champion model (any model type from experiments)."""
        with open(artifacts_dir / "champion_model.pkl", "rb") as f:
            self._champion_model = pickle.load(f)

        with open(artifacts_dir / "encoders.pkl", "rb") as f:
            self.encoders: Encoders = pickle.load(f)

        with open(artifacts_dir / "feature_names.json") as f:
            self.feature_names: list[str] = json.load(f)

        conf_path = artifacts_dir / "confidence.json"
        if conf_path.exists():
            with open(conf_path) as f:
                self._conf = json.load(f)
        else:
            self._conf = {"base_confidence": 0.5, "blend_weight": 1.0}

        # No blending needed — single champion model
        self.blend_weight = 1.0
        self.lgb_models = []
        self.cat_model = None
        self._load_conformal_calibration(artifacts_dir)

        # Load regime models for soft-blend routing if available
        regime_path = artifacts_dir / "regime_models.pkl"
        regime_cfg_path = artifacts_dir / "regime_config.json"
        if regime_path.exists() and regime_cfg_path.exists():
            with open(regime_path, "rb") as f:
                self._regime_models = pickle.load(f)
            with open(regime_cfg_path) as f:
                self._regime_config = json.load(f)
            log.info("Loaded regime models (soft-blend, threshold=%.0f min, steepness=%.3f)",
                     self._regime_config["threshold_mins"], self._regime_config["steepness"])

        log.info("Loaded champion model: %s", self._conf.get("champion_model", "unknown"))

    def _load_legacy_artifacts(self, artifacts_dir: Path):
        """Load legacy LGB + CatBoost ensemble artifacts."""
        import lightgbm as lgb
        from catboost import CatBoostRegressor

        # Load multi-seed LGB models
        self.lgb_models = []
        i = 0
        while (artifacts_dir / f"lgb_model_{i}.txt").exists():
            self.lgb_models.append(lgb.Booster(model_file=str(artifacts_dir / f"lgb_model_{i}.txt")))
            i += 1
        if not self.lgb_models:
            raise FileNotFoundError(f"No LGB models found in {artifacts_dir}")

        self.cat_model = CatBoostRegressor()
        self.cat_model.load_model(str(artifacts_dir / "cat_model.cbm"))

        with open(artifacts_dir / "encoders.pkl", "rb") as f:
            self.encoders: Encoders = pickle.load(f)

        with open(artifacts_dir / "feature_names.json") as f:
            self.feature_names: list[str] = json.load(f)

        conf_path = artifacts_dir / "confidence.json"
        if conf_path.exists():
            with open(conf_path) as f:
                self._conf = json.load(f)
        else:
            self._conf = {"base_confidence": 0.7, "blend_weight": 0.5}
        self.blend_weight = self._conf.get("blend_weight", 0.5)
        self._load_conformal_calibration(artifacts_dir)

    def _compute_conformal_interval(self, pred_log: float, corridor: str,
                                    coverage: float = 0.90, severity_label: str = "") -> dict:
        """Compute conformal prediction interval using calibration residuals.

        Returns interval bounds in minutes and the coverage level used.
        Fallback chain: corridor-specific -> severity band -> global, so events on
        corridors without enough calibration data still get severity-scaled bands.
        """
        if self._conformal_cal is None:
            return {"lower_mins": None, "upper_mins": None, "coverage": None, "source": "none"}

        # Select quantile key based on coverage
        q_key = f"q{int(coverage * 100)}"

        # 1) Corridor-specific (exact, then fuzzy substring)
        source = "global"
        cal = self._conformal_cal.get("__global__", {})
        matched = False
        if corridor:
            if corridor in self._conformal_cal:
                cal = self._conformal_cal[corridor]
                source = f"corridor:{corridor}"
                matched = True
            else:
                corridor_lower = corridor.lower()
                for key in self._conformal_cal:
                    if key.startswith("sev:") or key == "__global__":
                        continue
                    if key.lower() in corridor_lower:
                        cal = self._conformal_cal[key]
                        source = f"corridor:{key}"
                        matched = True
                        break

        # 2) Severity band fallback when no corridor calibration is available
        if not matched and severity_label:
            sev_key = f"sev:{severity_label}"
            if sev_key in self._conformal_cal:
                cal = self._conformal_cal[sev_key]
                source = sev_key

        q_value = cal.get(q_key, cal.get("q90", 1.0))
        lower_log = pred_log - q_value
        upper_log = pred_log + q_value
        lower_mins = max(1.0, float(np.expm1(lower_log)))
        upper_mins = float(np.expm1(upper_log))

        return {
            "lower_mins": round(lower_mins, 1),
            "upper_mins": round(upper_mins, 1),
            "coverage": coverage,
            "source": source,
        }

    def _predict_regime_model(self, regime_models: dict, df: pd.DataFrame) -> float:
        """Predict using a single regime model (short or long)."""
        members = regime_models['members']
        meta = regime_models['meta_model']
        enc = regime_models['encoder']
        X_enc = enc.transform(df.copy())
        member_preds = []
        for model, feat_set_name, feat_names_m in members:
            X_m = X_enc.reindex(columns=feat_names_m, fill_value=0)
            member_preds.append(float(model.predict(X_m)[0]))
        meta_X = np.array([member_preds])
        return float(meta.predict(meta_X)[0])

    def predict(self, event: dict) -> dict:
        df = pd.DataFrame([event])

        X = self.encoders.transform(df)
        for col in self.feature_names:
            if col not in X.columns:
                X[col] = 0
        X = X[self.feature_names]

        if self._champion_model is not None:
            # Generic champion model path
            champion_pred_log = float(self._champion_model.predict(X)[0])

            # Soft-blend regime routing if available
            if self._regime_models is not None and self._regime_config is not None:
                threshold = self._regime_config["threshold_mins"]
                steepness = self._regime_config["steepness"]
                champion_pred_mins = float(np.expm1(champion_pred_log))

                short_pred = self._predict_regime_model(self._regime_models['short_models'], df)
                long_pred = self._predict_regime_model(self._regime_models['long_models'], df)

                prob_long = float(expit((champion_pred_mins - threshold) * steepness))
                pred_log = (1 - prob_long) * short_pred + prob_long * long_pred
            else:
                pred_log = champion_pred_log

            # Extract per-member predictions for variance if StackingChampion
            if hasattr(self._champion_model, 'members'):
                individual_preds = []
                for model, feat_set, feat_names_m in self._champion_model.members:
                    X_m = X.copy()
                    for col in feat_names_m:
                        if col not in X_m.columns:
                            X_m[col] = 0
                    X_m = X_m.reindex(columns=feat_names_m, fill_value=0)
                    individual_preds.append(float(model.predict(X_m)[0]))
            else:
                individual_preds = [pred_log]
        else:
            # Legacy LGB + CatBoost ensemble path
            lgb_preds = [float(m.predict(X)[0]) for m in self.lgb_models]
            cat_pred = float(self.cat_model.predict(X)[0])
            individual_preds = lgb_preds + [cat_pred]
            lgb_mean = float(np.mean(lgb_preds))
            pred_log = self.blend_weight * lgb_mean + (1 - self.blend_weight) * cat_pred

        pred_mins = float(np.expm1(pred_log))
        pred_mins = max(1.0, pred_mins)

        sev = engineer_severity(df, predicted_duration=pd.Series([pred_mins], index=df.index))
        sev_score = float(sev.iloc[0])
        sev_label = _severity_label(sev_score)

        # --- Dynamic confidence from ensemble variance ---
        base_conf = self._conf["base_confidence"]
        if len(individual_preds) > 1:
            ensemble_std = float(np.std(individual_preds))
            # Higher disagreement → lower confidence
            # Calibrated: median ensemble std (~0.37) yields no penalty,
            # std > 2x median → significant penalty, std > 3x → max penalty
            median_std = 0.37  # empirical from test set
            excess_std = max(0.0, ensemble_std - median_std)
            variance_penalty = min(excess_std / (2 * median_std) * 0.3, 0.35)
            confidence = max(0.3, min(0.95, base_conf - variance_penalty))
        else:
            confidence = base_conf

        hour = None
        if "start_datetime" in event and event["start_datetime"]:
            try:
                dt = pd.to_datetime(event["start_datetime"], utc=True)
                hour = dt.hour
            except Exception:
                pass

        similar = []
        aggregated = None
        fingerprint_meta = None
        if self.fingerprinter is not None:
            lat = float(event.get("latitude", 0))
            lon = float(event.get("longitude", 0))
            cause = str(event.get("event_cause", ""))
            similar, fingerprint_meta = self.fingerprinter.find_similar_with_meta(
                lat, lon, cause, hour=hour, k=5
            )
            aggregated = self.fingerprinter.aggregate(similar)

        # --- Conformal prediction interval ---
        corridor = str(event.get("corridor", ""))
        interval = self._compute_conformal_interval(
            pred_log, corridor, coverage=0.90, severity_label=sev_label
        )

        return {
            "predicted_duration_mins": round(pred_mins, 1),
            "severity_score": round(sev_score, 4),
            "severity_label": sev_label,
            "confidence": round(confidence, 4),
            "model_timestamp": self.timestamp,
            "similar_events": similar,
            "aggregated": aggregated,
            "fingerprint_meta": fingerprint_meta,
            "prediction_interval": {
                "lower_mins": interval["lower_mins"],
                "upper_mins": interval["upper_mins"],
                "coverage": interval["coverage"],
                "source": interval["source"],
            },
            "confidence_factors": {
                "base_confidence": round(base_conf, 4),
                "ensemble_std": round(float(np.std(individual_preds)), 4) if len(individual_preds) > 1 else 0.0,
                "n_models": len(individual_preds),
            },
        }
