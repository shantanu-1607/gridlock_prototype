import json
import pickle
from pathlib import Path

import numpy as np
import pandas as pd
import lightgbm as lgb
from catboost import CatBoostRegressor

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
        if d.is_dir() and (d / "lgb_model.txt").exists():
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

        self.lgb_model = lgb.Booster(model_file=str(artifacts_dir / "lgb_model.txt"))
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
            self._conf = {"base_confidence": 0.7}

        ref_path = artifacts_dir / "reference.parquet"
        self.fingerprinter = Fingerprinter(ref_path) if ref_path.exists() else None

        log.info("Predictor loaded from %s", artifacts_dir)

    def predict(self, event: dict) -> dict:
        df = pd.DataFrame([event])

        X = self.encoders.transform(df)
        for col in self.feature_names:
            if col not in X.columns:
                X[col] = 0
        X = X[self.feature_names]

        lgb_pred = self.lgb_model.predict(X)[0]
        cat_pred = self.cat_model.predict(X)[0]
        pred_log = (lgb_pred + cat_pred) / 2.0
        pred_mins = float(np.expm1(pred_log))
        pred_mins = max(1.0, pred_mins)

        sev = engineer_severity(df, predicted_duration=pd.Series([pred_mins], index=df.index))
        sev_score = float(sev.iloc[0])
        sev_label = _severity_label(sev_score)

        confidence = self._conf["base_confidence"]

        hour = None
        if "start_datetime" in event and event["start_datetime"]:
            try:
                dt = pd.to_datetime(event["start_datetime"], utc=True)
                hour = dt.hour
            except Exception:
                pass

        similar = []
        aggregated = None
        if self.fingerprinter is not None:
            lat = float(event.get("latitude", 0))
            lon = float(event.get("longitude", 0))
            cause = str(event.get("event_cause", ""))
            similar = self.fingerprinter.find_similar(lat, lon, cause, hour=hour, k=5)
            aggregated = self.fingerprinter.aggregate(similar)

        return {
            "predicted_duration_mins": round(pred_mins, 1),
            "severity_score": round(sev_score, 4),
            "severity_label": sev_label,
            "confidence": round(confidence, 4),
            "model_timestamp": self.timestamp,
            "similar_events": similar,
            "aggregated": aggregated,
        }
