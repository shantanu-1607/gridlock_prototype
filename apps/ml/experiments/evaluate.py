"""Standardized evaluation with MLflow logging.

Wraps src.evaluate functions and adds extra metrics (median_ae, p90_error,
cv_std, inference_time_ms) plus MLflow logging.
"""

import time

import mlflow
import numpy as np
import pandas as pd

from src.evaluate import compute_metrics, check_overfit
from src.logger import get_logger

log = get_logger("gridlock.experiments.evaluate")


def evaluate_and_log(
    y_train: np.ndarray,
    pred_train: np.ndarray,
    y_test: np.ndarray,
    pred_test: np.ndarray,
    fold_scores: list[float] | None = None,
    inference_time_ms: float | None = None,
) -> dict:
    """Compute all metrics, log to active MLflow run, and return the dict."""
    # Core metrics from existing evaluate.py
    metrics = compute_metrics(y_train, pred_train, y_test, pred_test)

    # Additional metrics
    metrics["test_median_ae"] = float(np.median(np.abs(y_test - pred_test)))
    errors = np.abs(y_test - pred_test)
    metrics["test_p90_error"] = float(np.percentile(errors, 90))

    # Overfitting indicator
    overfit = check_overfit(metrics)
    metrics["train_test_gap"] = overfit["gap_pct"]
    metrics["overfit_flag"] = int(overfit["overfit_flag"])

    # CV stability
    if fold_scores is not None and len(fold_scores) > 1:
        mean_score = np.mean(fold_scores)
        metrics["cv_mean"] = float(mean_score)
        metrics["cv_std"] = float(np.std(fold_scores))
        metrics["cv_std_pct"] = float(
            (np.std(fold_scores) / mean_score * 100) if mean_score > 0 else 0
        )

    # Inference time
    if inference_time_ms is not None:
        metrics["inference_time_ms"] = inference_time_ms

    # Log to MLflow active run
    try:
        mlflow.log_metrics(metrics)
    except Exception as e:
        log.warning("Could not log metrics to MLflow: %s", e)

    return metrics


def compute_fold_metrics(
    oof_preds: np.ndarray,
    y_true_raw: np.ndarray,
    fold_indices: list[tuple[np.ndarray, np.ndarray]],
) -> dict:
    """Compute per-fold log_rmse and mae. Returns mean, std, and per-fold scores."""
    fold_log_rmse = []
    fold_mae = []
    y_log = np.log1p(y_true_raw)

    for _, va_idx in fold_indices:
        preds = oof_preds[va_idx]
        if np.any(np.isnan(preds)):
            continue
        log_rmse = float(np.sqrt(np.mean((preds - y_log[va_idx]) ** 2)))
        mae = float(np.mean(np.abs(np.expm1(preds) - y_true_raw[va_idx])))
        fold_log_rmse.append(log_rmse)
        fold_mae.append(mae)

    return {
        "fold_log_rmse": fold_log_rmse,
        "fold_mae": fold_mae,
        "mean_log_rmse": float(np.mean(fold_log_rmse)) if fold_log_rmse else float("inf"),
        "std_log_rmse": float(np.std(fold_log_rmse)) if fold_log_rmse else 0.0,
        "mean_mae": float(np.mean(fold_mae)) if fold_mae else float("inf"),
    }


def measure_inference_time(model, X_sample: pd.DataFrame, n_runs: int = 100) -> float:
    """Time single-row prediction. Returns median time in milliseconds."""
    row = X_sample.iloc[:1]
    # Warmup
    for _ in range(5):
        model.predict(row)

    times = []
    for _ in range(n_runs):
        t0 = time.perf_counter()
        model.predict(row)
        t1 = time.perf_counter()
        times.append((t1 - t0) * 1000)

    return float(np.median(times))


def check_promotion_criteria(
    metrics: dict,
    current_best_log_rmse: float | None = None,
) -> dict:
    """Check if a model meets promotion criteria.

    Criteria:
    - log_rmse improves over current best by > 1%
    - train_test_gap < 15%
    - cv_std_pct < 20%
    - inference_time_ms < 100ms
    """
    reasons = []
    eligible = True

    if current_best_log_rmse is not None:
        improvement = (current_best_log_rmse - metrics.get("test_log_rmse", float("inf"))) / current_best_log_rmse
        if improvement < 0.01:
            eligible = False
            reasons.append(f"log_rmse improvement {improvement:.2%} < 1%")

    gap = metrics.get("train_test_gap", 0)
    if gap > 15:
        eligible = False
        reasons.append(f"train_test_gap {gap:.1f}% > 15%")

    cv_std = metrics.get("cv_std_pct", 0)
    if cv_std > 20:
        eligible = False
        reasons.append(f"cv_std {cv_std:.1f}% > 20%")

    inf_time = metrics.get("inference_time_ms", 0)
    if inf_time > 100:
        eligible = False
        reasons.append(f"inference_time {inf_time:.1f}ms > 100ms")

    return {"eligible": eligible, "reasons": reasons}
