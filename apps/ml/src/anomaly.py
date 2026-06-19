"""Prophet-based corridor anomaly detection.

Trains per-corridor baseline models on historical incident patterns.
At inference, computes anomaly score = how much worse this incident is
compared to what Prophet predicted for this corridor/time.

The "Delta Engine": C_expected(t) - C_actual(t)
"""

import json
import pickle
from pathlib import Path
from datetime import datetime, timezone

import numpy as np
import pandas as pd
try:
    from prophet import Prophet
except ImportError:
    Prophet = None

from .constants import DATA_PATH, ARTIFACTS_DIR, DURATION_COL
from .data import load_and_prepare, load_config
from .logger import get_logger

log = get_logger("gridlock.anomaly")

PROPHET_DIR = ARTIFACTS_DIR / "prophet_baselines"


def train_corridor_baselines(min_events: int = 15) -> dict:
    """Train Prophet models per corridor on historical incident data.

    Returns dict of corridor -> Prophet model.
    Saves models to disk for reuse.
    """
    if Prophet is None:
        log.warning("Prophet not installed — cannot train corridor baselines")
        return {}

    cfg = load_config()
    df = load_and_prepare(cfg)

    # Parse timestamps
    df["start_dt"] = pd.to_datetime(df["start_datetime"], errors="coerce", utc=True)
    df = df.dropna(subset=["start_dt"])

    # Get corridors with enough data
    corridor_counts = df["corridor"].value_counts()
    corridors = corridor_counts[corridor_counts >= min_events].index.tolist()
    log.info("Training Prophet baselines for %d corridors (min_events=%d)", len(corridors), min_events)

    PROPHET_DIR.mkdir(parents=True, exist_ok=True)
    models = {}

    for corridor in corridors:
        cdf = df[df["corridor"] == corridor].copy()

        # Aggregate: hourly incident count + mean duration per corridor
        cdf["hour_bucket"] = cdf["start_dt"].dt.floor("h")
        hourly = cdf.groupby("hour_bucket").agg(
            incident_count=("id", "count") if "id" in cdf.columns else (DURATION_COL, "count"),
            mean_duration=(DURATION_COL, "mean"),
        ).reset_index()

        # Prophet needs 'ds' and 'y' columns
        # We predict mean_duration as the baseline
        prophet_df = pd.DataFrame({
            "ds": hourly["hour_bucket"].dt.tz_localize(None),
            "y": hourly["mean_duration"],
        })

        if len(prophet_df) < 10:
            continue

        # Suppress Prophet's verbose output
        model = Prophet(
            daily_seasonality=True,
            weekly_seasonality=True,
            yearly_seasonality=False,
            changepoint_prior_scale=0.1,
        )
        model.fit(prophet_df)
        models[corridor] = model

        # Save model
        model_path = PROPHET_DIR / f"{corridor.replace(' ', '_').replace('/', '_')}.pkl"
        with open(model_path, "wb") as f:
            pickle.dump(model, f)

    # Save corridor list
    with open(PROPHET_DIR / "corridors.json", "w") as f:
        json.dump(corridors, f)

    # Also train a global model (all corridors combined)
    global_hourly = df.copy()
    global_hourly["hour_bucket"] = global_hourly["start_dt"].dt.floor("h")
    global_agg = global_hourly.groupby("hour_bucket").agg(
        mean_duration=(DURATION_COL, "mean"),
    ).reset_index()
    global_prophet_df = pd.DataFrame({
        "ds": global_agg["hour_bucket"].dt.tz_localize(None),
        "y": global_agg["mean_duration"],
    })

    if len(global_prophet_df) >= 10:
        global_model = Prophet(
            daily_seasonality=True,
            weekly_seasonality=True,
            yearly_seasonality=False,
        )
        global_model.fit(global_prophet_df)
        models["__global__"] = global_model
        with open(PROPHET_DIR / "__global__.pkl", "wb") as f:
            pickle.dump(global_model, f)

    log.info("Trained %d Prophet models (including global)", len(models))
    return models


def load_corridor_baselines() -> dict:
    """Load pre-trained Prophet models from disk."""
    models = {}
    if not PROPHET_DIR.exists():
        return models

    if Prophet is None:
        log.warning("Prophet not installed — skipping pickle load, will use statistical fallback")
        return models

    for pkl_file in PROPHET_DIR.glob("*.pkl"):
        corridor = pkl_file.stem
        if corridor == "__global__":
            key = "__global__"
        else:
            key = corridor.replace("_", " ")
        try:
            with open(pkl_file, "rb") as f:
                models[key] = pickle.load(f)
        except Exception as e:
            log.warning("Failed to load Prophet model for %s: %s", key, e)

    return models


def compute_anomaly_score(
    corridor: str,
    event_cause: str,
    start_datetime: str,
    predicted_duration_mins: float,
    models: dict | None = None,
) -> dict:
    """Compute anomaly score for an incident.

    anomaly_score = (predicted_duration - prophet_baseline) / prophet_baseline
    Positive = worse than expected, Negative = better than expected.

    Returns dict with anomaly details.
    """
    if models is None:
        models = load_corridor_baselines()

    # Parse timestamp
    try:
        dt = pd.to_datetime(start_datetime, utc=True)
    except Exception:
        dt = pd.Timestamp.now(tz="UTC")

    dt_naive = dt.tz_localize(None) if dt.tzinfo else dt
    hour = dt.hour
    day_of_week = dt.day_name()

    # Find the right model (corridor-specific or global fallback)
    model = None
    model_source = "none"

    # Try exact corridor match
    for key, m in models.items():
        if key.lower().replace("_", " ") == corridor.lower().replace("_", " "):
            model = m
            model_source = f"corridor:{corridor}"
            break

    # Fuzzy match
    if model is None:
        for key, m in models.items():
            if key == "__global__":
                continue
            if key.lower() in corridor.lower() or corridor.lower() in key.lower():
                model = m
                model_source = f"corridor:{key}"
                break

    # Global fallback
    if model is None and "__global__" in models:
        model = models["__global__"]
        model_source = "global"

    if model is None:
        return {
            "anomaly_score": 0.0,
            "anomaly_label": "unknown",
            "expected_duration_mins": predicted_duration_mins,
            "predicted_duration_mins": predicted_duration_mins,
            "deviation_pct": 0.0,
            "model_source": "none",
            "context": f"No Prophet baseline available for {corridor}",
        }

    # Predict expected duration for this timestamp
    future = pd.DataFrame({"ds": [dt_naive]})
    forecast = model.predict(future)
    expected_duration = max(1.0, float(forecast["yhat"].iloc[0]))
    expected_lower = max(1.0, float(forecast["yhat_lower"].iloc[0]))
    expected_upper = max(1.0, float(forecast["yhat_upper"].iloc[0]))

    # Anomaly score
    deviation = predicted_duration_mins - expected_duration
    deviation_pct = (deviation / expected_duration) * 100 if expected_duration > 0 else 0

    # Classify anomaly
    if predicted_duration_mins > expected_upper * 1.5:
        label = "severe_anomaly"
    elif predicted_duration_mins > expected_upper:
        label = "anomaly"
    elif predicted_duration_mins > expected_duration * 1.2:
        label = "elevated"
    elif predicted_duration_mins < expected_lower * 0.5:
        label = "unusually_low"
    else:
        label = "normal"

    # Anomaly score: normalized 0-1 (how far outside expected range)
    if predicted_duration_mins > expected_upper:
        range_width = expected_upper - expected_duration
        anomaly_score = min(1.0, (predicted_duration_mins - expected_upper) / max(range_width, 1.0))
    elif predicted_duration_mins < expected_lower:
        range_width = expected_duration - expected_lower
        anomaly_score = -min(1.0, (expected_lower - predicted_duration_mins) / max(range_width, 1.0))
    else:
        anomaly_score = 0.0

    return {
        "anomaly_score": round(float(anomaly_score), 4),
        "anomaly_label": label,
        "expected_duration_mins": round(expected_duration, 1),
        "expected_range": [round(expected_lower, 1), round(expected_upper, 1)],
        "predicted_duration_mins": round(predicted_duration_mins, 1),
        "deviation_pct": round(deviation_pct, 1),
        "model_source": model_source,
        "context": f"{corridor} at {hour}:00 on {day_of_week}: expected ~{expected_duration:.0f} min, predicted {predicted_duration_mins:.0f} min ({deviation_pct:+.0f}%)",
    }
