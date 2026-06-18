"""Tournament-style model elimination: 5 rounds narrowing 13 models to 1 champion.

Round 1: Screening — all 13 models on F1_baseline, eliminate worst performers
Round 2: Feature exploration — top 6 x all feature sets, pick best per model
Round 3: Deep tuning — top 4 with 100 Optuna trials
Round 4: Head-to-head — statistical comparison with paired t-test
Round 5: Ensemble — weighted avg + stacking from top 3, crown champion
"""

import json
from dataclasses import dataclass, field, asdict
from pathlib import Path

import mlflow
import numpy as np
import pandas as pd
from scipy import stats
from sklearn.linear_model import Ridge
from sklearn.model_selection import TimeSeriesSplit

from src.constants import BASE_DIR, DURATION_COL
from src.data import load_and_prepare, chrono_split, load_config
from src.logger import get_logger

from .mlflow_config import (
    init_mlflow,
    get_or_create_experiment,
    experiment_name,
    get_client,
)
from .feature_registry import FEATURE_SETS, build_features
from .model_registry import MODEL_REGISTRY, list_models
from .run_experiment import run_single_experiment, run_batch
from .evaluate import check_promotion_criteria

log = get_logger("gridlock.experiments.tournament")


@dataclass
class TournamentEntry:
    model_name: str
    feature_set: str
    run_id: str
    log_rmse: float
    mae: float
    inference_time_ms: float = 0.0
    train_test_gap: float = 0.0
    cv_std: float = 0.0
    best_params: dict = field(default_factory=dict)
    fold_log_rmse: list = field(default_factory=list)


class Tournament:
    """5-round elimination tournament to find the best model+feature combination."""

    def __init__(self):
        self.entries: list[TournamentEntry] = []
        self.elimination_log: list[dict] = []
        self.champion: TournamentEntry | None = None

        # Config
        self.round1_trials = 20
        self.round3_trials = 100
        self.round3_timeout = 900
        self.elimination_threshold = 1.20  # 120% of best
        self.tuning_improvement_threshold = 0.02  # 2%
        self.max_inference_time = 500  # ms (lenient for screening)
        self.max_train_test_gap = 15  # percent

    def _result_to_entry(self, result: dict) -> TournamentEntry | None:
        """Convert experiment result dict to TournamentEntry."""
        if "error" in result or "metrics" not in result:
            return None
        m = result["metrics"]
        fm = result.get("fold_metrics", {})
        return TournamentEntry(
            model_name=result["model_name"],
            feature_set=result["feature_set"],
            run_id=result["run_id"],
            log_rmse=m.get("test_log_rmse", float("inf")),
            mae=m.get("test_mae", float("inf")),
            inference_time_ms=m.get("inference_time_ms", 0),
            train_test_gap=m.get("train_test_gap", 0),
            cv_std=m.get("cv_std_pct", 0),
            best_params=result.get("best_params", {}),
            fold_log_rmse=fm.get("fold_log_rmse", []),
        )

    def round_1_screening(self, model_names: list[str] | None = None) -> list[TournamentEntry]:
        """Round 1: All 13 models on F1_baseline. Eliminate worst. Advance top 6."""
        log.info("=" * 60)
        log.info("ROUND 1: SCREENING — All models on F1_baseline")
        log.info("=" * 60)

        if model_names is None:
            model_names = list(MODEL_REGISTRY.keys())

        results = run_batch(
            model_names=model_names,
            feature_sets=["F1_baseline"],
            n_trials=self.round1_trials,
            exp_name=experiment_name("tournament", "round1_screening"),
        )

        entries = []
        for r in results:
            entry = self._result_to_entry(r)
            if entry is not None:
                entries.append(entry)
            else:
                log.warning("Model %s failed in screening", r.get("model_name", "?"))

        if not entries:
            raise RuntimeError("All models failed in Round 1")

        # Sort by log_rmse
        entries.sort(key=lambda e: e.log_rmse)
        best_rmse = entries[0].log_rmse

        # Eliminate: log_rmse > 120% of best OR inference > 500ms
        surviving = []
        eliminated = []
        for e in entries:
            reasons = []
            if e.log_rmse > best_rmse * self.elimination_threshold:
                reasons.append(f"log_rmse {e.log_rmse:.4f} > {best_rmse * self.elimination_threshold:.4f}")
            if e.inference_time_ms > self.max_inference_time:
                reasons.append(f"inference {e.inference_time_ms:.0f}ms > {self.max_inference_time}ms")

            if reasons:
                eliminated.append({"model": e.model_name, "reasons": reasons, "round": 1})
                log.info("ELIMINATED: %s — %s", e.model_name, "; ".join(reasons))
            else:
                surviving.append(e)

        # Keep top 6
        surviving = surviving[:6]
        for e in entries[6:]:
            if e not in eliminated and e not in surviving:
                eliminated.append({"model": e.model_name, "reasons": ["beyond top 6"], "round": 1})

        self.elimination_log.extend(eliminated)
        log.info("Round 1: %d → %d models. Advancing: %s",
                 len(entries), len(surviving), [e.model_name for e in surviving])
        return surviving

    def round_2_features(self, entries: list[TournamentEntry]) -> list[TournamentEntry]:
        """Round 2: Top 6 models x F1-F6. Best feature set per model. Advance top 4."""
        log.info("=" * 60)
        log.info("ROUND 2: FEATURE EXPLORATION — %d models x %d feature sets",
                 len(entries), len(FEATURE_SETS))
        log.info("=" * 60)

        model_names = [e.model_name for e in entries]
        feature_sets = list(FEATURE_SETS.keys())

        results = run_batch(
            model_names=model_names,
            feature_sets=feature_sets,
            n_trials=self.round1_trials,
            exp_name=experiment_name("tournament", "round2_features"),
        )

        # Group results by model, find best feature set per model
        model_best: dict[str, TournamentEntry] = {}
        model_baseline: dict[str, float] = {}

        for r in results:
            entry = self._result_to_entry(r)
            if entry is None:
                continue

            if entry.feature_set == "F1_baseline":
                model_baseline[entry.model_name] = entry.log_rmse

            if entry.model_name not in model_best or entry.log_rmse < model_best[entry.model_name].log_rmse:
                model_best[entry.model_name] = entry

        # Eliminate models that don't improve beyond F1_baseline
        surviving = []
        eliminated = []
        for model_name, best_entry in model_best.items():
            baseline = model_baseline.get(model_name, float("inf"))
            improvement = (baseline - best_entry.log_rmse) / baseline if baseline > 0 else 0

            if best_entry.feature_set == "F1_baseline" or improvement <= 0:
                eliminated.append({
                    "model": model_name,
                    "reasons": [f"No improvement beyond F1_baseline (best: {best_entry.feature_set}, improvement: {improvement:.2%})"],
                    "round": 2,
                })
                log.info("ELIMINATED: %s — no improvement beyond baseline", model_name)
            else:
                surviving.append(best_entry)
                log.info("ADVANCING: %s with %s (improvement: %.2f%%)",
                         model_name, best_entry.feature_set, improvement * 100)

        # If all models fail to improve, keep them anyway (baseline is baseline)
        if not surviving:
            log.warning("No model improved beyond baseline. Keeping all with best feature set.")
            surviving = list(model_best.values())

        # Sort and keep top 4
        surviving.sort(key=lambda e: e.log_rmse)
        for e in surviving[4:]:
            eliminated.append({"model": e.model_name, "reasons": ["beyond top 4"], "round": 2})
        surviving = surviving[:4]

        self.elimination_log.extend(eliminated)
        log.info("Round 2: %d → %d models. Advancing: %s",
                 len(entries), len(surviving),
                 [(e.model_name, e.feature_set) for e in surviving])
        return surviving

    def round_3_tuning(self, entries: list[TournamentEntry]) -> list[TournamentEntry]:
        """Round 3: Deep Optuna HPO (100 trials). Eliminate if < 2% improvement. Advance top 3."""
        log.info("=" * 60)
        log.info("ROUND 3: DEEP TUNING — %d models, %d trials each",
                 len(entries), self.round3_trials)
        log.info("=" * 60)

        pre_tuning = {e.model_name: e.log_rmse for e in entries}
        tuned_entries = []

        for entry in entries:
            log.info("Tuning %s on %s...", entry.model_name, entry.feature_set)
            try:
                result = run_single_experiment(
                    entry.model_name, entry.feature_set,
                    n_trials=self.round3_trials,
                    exp_name=experiment_name("tournament", "round3_tuning"),
                    timeout=self.round3_timeout,
                )
                tuned = self._result_to_entry(result)
                if tuned is not None:
                    tuned_entries.append(tuned)
                else:
                    tuned_entries.append(entry)
            except Exception as e:
                log.error("Tuning failed for %s: %s", entry.model_name, e)
                tuned_entries.append(entry)

        # Eliminate if tuning yields < 2% improvement
        surviving = []
        eliminated = []
        for entry in tuned_entries:
            pre = pre_tuning.get(entry.model_name, entry.log_rmse)
            improvement = (pre - entry.log_rmse) / pre if pre > 0 else 0
            if improvement < self.tuning_improvement_threshold:
                eliminated.append({
                    "model": entry.model_name,
                    "reasons": [f"Tuning improvement {improvement:.2%} < {self.tuning_improvement_threshold:.0%} (ceiling reached)"],
                    "round": 3,
                })
                log.info("ELIMINATED: %s — tuning ceiling reached (%.2f%% improvement)",
                         entry.model_name, improvement * 100)
            else:
                surviving.append(entry)
                log.info("ADVANCING: %s (%.2f%% improvement from tuning)",
                         entry.model_name, improvement * 100)

        # If all eliminated, keep top 3 anyway
        if not surviving:
            log.warning("All models below tuning threshold. Keeping top 3.")
            surviving = sorted(tuned_entries, key=lambda e: e.log_rmse)[:3]

        surviving.sort(key=lambda e: e.log_rmse)
        surviving = surviving[:3]

        self.elimination_log.extend(eliminated)
        log.info("Round 3: %d → %d models. Advancing: %s",
                 len(entries), len(surviving),
                 [(e.model_name, e.feature_set) for e in surviving])
        return surviving

    def round_4_head_to_head(self, entries: list[TournamentEntry]) -> list[TournamentEntry]:
        """Round 4: Statistical comparison — paired t-test on fold scores."""
        log.info("=" * 60)
        log.info("ROUND 4: HEAD-TO-HEAD — Statistical comparison")
        log.info("=" * 60)

        n = len(entries)
        comparisons = []

        for i in range(n):
            for j in range(i + 1, n):
                a, b = entries[i], entries[j]
                if not a.fold_log_rmse or not b.fold_log_rmse:
                    continue
                if len(a.fold_log_rmse) != len(b.fold_log_rmse):
                    continue

                scores_a = np.array(a.fold_log_rmse)
                scores_b = np.array(b.fold_log_rmse)

                # Paired t-test
                t_stat, p_val = stats.ttest_rel(scores_a, scores_b)

                # Cohen's d (effect size)
                diff = scores_a - scores_b
                d = np.mean(diff) / np.std(diff) if np.std(diff) > 0 else 0

                comparisons.append({
                    "model_a": a.model_name,
                    "model_b": b.model_name,
                    "mean_a": float(np.mean(scores_a)),
                    "mean_b": float(np.mean(scores_b)),
                    "t_stat": float(t_stat),
                    "p_value": float(p_val),
                    "cohens_d": float(d),
                    "significant": p_val < 0.05 and abs(d) > 0.2,
                })

                log.info(
                    "%s vs %s: p=%.4f, d=%.3f %s",
                    a.model_name, b.model_name, p_val, d,
                    "(significant)" if p_val < 0.05 and abs(d) > 0.2 else "(not significant)",
                )

        # Log comparisons to MLflow
        exp_id = get_or_create_experiment(experiment_name("tournament", "round4_comparison"))
        with mlflow.start_run(experiment_id=exp_id, run_name="head_to_head_stats"):
            for comp in comparisons:
                tag = f"{comp['model_a']}_vs_{comp['model_b']}"
                mlflow.log_metrics({
                    f"{tag}_p_value": comp["p_value"],
                    f"{tag}_cohens_d": comp["cohens_d"],
                })

        # Re-rank based on fold mean scores
        entries.sort(key=lambda e: e.log_rmse)
        log.info("Round 4: Rankings after statistical comparison: %s",
                 [(e.model_name, f"log_rmse={e.log_rmse:.4f}") for e in entries])

        # Keep top 3
        return entries[:3]

    def round_5_ensemble(self, entries: list[TournamentEntry]) -> TournamentEntry:
        """Round 5: Ensemble — weighted avg + stacking. Return champion."""
        log.info("=" * 60)
        log.info("ROUND 5: ENSEMBLE FINALS — %d models", len(entries))
        log.info("=" * 60)

        if len(entries) < 2:
            log.info("Only %d model(s), skipping ensemble. Champion: %s", len(entries), entries[0].model_name)
            return entries[0]

        # Load OOF predictions from MLflow artifacts
        client = get_client()
        oof_preds = {}

        for entry in entries:
            try:
                local_path = client.download_artifacts(entry.run_id, "predictions/temp_oof.csv")
                oof_df = pd.read_csv(local_path)
                oof_preds[entry.model_name] = oof_df["oof_pred"].values
            except Exception as e:
                log.warning("Could not load OOF for %s: %s", entry.model_name, e)

        if len(oof_preds) < 2:
            log.warning("Not enough OOF predictions for ensemble. Champion: %s", entries[0].model_name)
            return entries[0]

        # Load true labels
        schema_cfg = load_config()
        df = load_and_prepare(schema_cfg)
        train_df, _ = chrono_split(df, schema_cfg["train_test"]["test_fraction"])
        y_train_raw = train_df[DURATION_COL].values.copy()
        y_log = np.log1p(y_train_raw)

        # Align OOF predictions
        model_names = list(oof_preds.keys())
        oof_matrix = np.column_stack([oof_preds[m] for m in model_names])
        valid = ~np.any(np.isnan(oof_matrix), axis=1)
        oof_valid = oof_matrix[valid]
        y_valid = y_log[valid]

        # --- Weighted average (grid search) ---
        best_blend_rmse = float("inf")
        best_weights = None

        if len(model_names) == 2:
            for w in np.arange(0.1, 1.0, 0.05):
                blended = w * oof_valid[:, 0] + (1 - w) * oof_valid[:, 1]
                rmse = float(np.sqrt(np.mean((blended - y_valid) ** 2)))
                if rmse < best_blend_rmse:
                    best_blend_rmse = rmse
                    best_weights = [w, 1 - w]
        elif len(model_names) == 3:
            for w1 in np.arange(0.1, 0.8, 0.1):
                for w2 in np.arange(0.1, 0.8 - w1 + 0.05, 0.1):
                    w3 = 1 - w1 - w2
                    if w3 < 0.05:
                        continue
                    blended = w1 * oof_valid[:, 0] + w2 * oof_valid[:, 1] + w3 * oof_valid[:, 2]
                    rmse = float(np.sqrt(np.mean((blended - y_valid) ** 2)))
                    if rmse < best_blend_rmse:
                        best_blend_rmse = rmse
                        best_weights = [w1, w2, w3]

        log.info("Weighted average: log_rmse=%.4f, weights=%s", best_blend_rmse,
                 [f"{w:.2f}" for w in best_weights] if best_weights else "None")

        # --- Stacking (Ridge meta-learner) ---
        tscv = TimeSeriesSplit(n_splits=3)
        stacking_oof = np.full(len(y_valid), np.nan)

        for tr_idx, va_idx in tscv.split(oof_valid):
            meta = Ridge(alpha=1.0)
            meta.fit(oof_valid[tr_idx], y_valid[tr_idx])
            stacking_oof[va_idx] = meta.predict(oof_valid[va_idx])

        stacking_valid = ~np.isnan(stacking_oof)
        stacking_rmse = float(np.sqrt(np.mean((stacking_oof[stacking_valid] - y_valid[stacking_valid]) ** 2)))
        log.info("Stacking (Ridge): log_rmse=%.4f", stacking_rmse)

        # --- Compare all candidates ---
        candidates = []

        # Individual models
        for entry in entries:
            candidates.append({
                "name": f"individual_{entry.model_name}",
                "log_rmse": entry.log_rmse,
                "entry": entry,
                "type": "individual",
            })

        # Weighted average
        if best_weights is not None:
            candidates.append({
                "name": "weighted_avg",
                "log_rmse": best_blend_rmse,
                "type": "ensemble_weighted",
                "weights": best_weights,
                "models": model_names,
            })

        # Stacking
        candidates.append({
            "name": "stacking_ridge",
            "log_rmse": stacking_rmse,
            "type": "ensemble_stacking",
            "models": model_names,
        })

        # Sort and pick champion
        candidates.sort(key=lambda c: c["log_rmse"])
        champion_candidate = candidates[0]

        # Log to MLflow
        exp_id = get_or_create_experiment(experiment_name("tournament", "round5_ensemble"))
        with mlflow.start_run(experiment_id=exp_id, run_name="ensemble_finals"):
            for c in candidates:
                mlflow.log_metric(f"{c['name']}_log_rmse", c["log_rmse"])
            mlflow.log_param("champion", champion_candidate["name"])
            mlflow.log_param("champion_type", champion_candidate["type"])
            if "weights" in champion_candidate:
                mlflow.log_param("blend_weights", str(champion_candidate["weights"]))

        if champion_candidate["type"] == "individual":
            champion = champion_candidate["entry"]
        else:
            # For ensemble champions, create a synthetic entry
            champion = TournamentEntry(
                model_name=champion_candidate["name"],
                feature_set="ensemble",
                run_id=champion_candidate.get("entry", entries[0]).run_id if "entry" in champion_candidate else entries[0].run_id,
                log_rmse=champion_candidate["log_rmse"],
                mae=entries[0].mae,  # approximate
                best_params={"type": champion_candidate["type"], "models": champion_candidate.get("models", [])},
            )

        log.info("=" * 60)
        log.info("CHAMPION: %s (log_rmse=%.4f)", champion.model_name, champion.log_rmse)
        log.info("=" * 60)

        self.champion = champion
        return champion

    def run_full_tournament(self, model_names: list[str] | None = None) -> TournamentEntry:
        """Run all 5 rounds. Returns the champion."""
        init_mlflow()

        log.info("=" * 60)
        log.info("GRIDLOCK TOURNAMENT — Full Model Selection")
        log.info("=" * 60)

        # Round 1: Screening
        surviving = self.round_1_screening(model_names)

        # Round 2: Feature exploration
        surviving = self.round_2_features(surviving)

        # Round 3: Deep tuning
        surviving = self.round_3_tuning(surviving)

        # Round 4: Head-to-head statistical comparison
        surviving = self.round_4_head_to_head(surviving)

        # Round 5: Ensemble finals
        champion = self.round_5_ensemble(surviving)

        # Log tournament summary
        exp_id = get_or_create_experiment(experiment_name("tournament", "summary"))
        with mlflow.start_run(experiment_id=exp_id, run_name="tournament_summary"):
            mlflow.log_param("champion_model", champion.model_name)
            mlflow.log_param("champion_features", champion.feature_set)
            mlflow.log_metric("champion_log_rmse", champion.log_rmse)
            mlflow.log_metric("champion_mae", champion.mae)
            mlflow.log_param("n_eliminated", len(self.elimination_log))
            mlflow.log_param("elimination_log", json.dumps(self.elimination_log, default=str)[:5000])

        return champion

    def get_summary(self) -> dict:
        """Return tournament summary."""
        return {
            "champion": asdict(self.champion) if self.champion else None,
            "eliminations": self.elimination_log,
        }
