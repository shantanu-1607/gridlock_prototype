"""Fit and persist the engineered-feature pipeline for the deployed champion.

WHY: the champion members were trained on F4/F5 engineered features
(``experiments.feature_registry.build_features``), but only the base ``Encoders`` was
ever serialized. Serving therefore zero-filled ~31% of the champion's inputs, so the
deployed predictor scored R²≈0.04 instead of what the champion actually achieves with
its real features. This script writes ``feature_pipeline.pkl`` next to the champion so
``predict.py`` can reproduce the training-time feature matrix at inference.

Run from apps/ml:  PYTHONPATH=. python scripts/build_feature_pipeline.py
Re-run after any champion re-promote (then also re-run scripts/calibrate_conformal.py).
"""

import json
import pickle
import sys
from pathlib import Path

from src.constants import DURATION_COL
from src.data import load_and_prepare, chrono_split, load_config
from src.feature_pipeline import FeaturePipeline
from src.logger import get_logger
from src.predict import find_latest_artifacts

log = get_logger("gridlock.build_feature_pipeline")


def main(artifacts_dir: Path | None = None) -> Path:
    if artifacts_dir is None:
        artifacts_dir = find_latest_artifacts()
    if artifacts_dir is None or not (artifacts_dir / "champion_model.pkl").exists():
        raise SystemExit(f"No champion artifacts found in {artifacts_dir}")

    meta_path = artifacts_dir / "model_meta.json"
    if not meta_path.exists():
        raise SystemExit(f"model_meta.json missing in {artifacts_dir}; cannot infer feature sets")
    members = json.loads(meta_path.read_text())["members"]
    feature_sets = [m["feature_set"] for m in members]
    log.info("Champion member feature sets: %s", feature_sets)

    cfg = load_config()
    df = load_and_prepare(cfg)
    train_df, _ = chrono_split(df, cfg["train_test"]["test_fraction"])
    y_train = train_df[DURATION_COL].values.copy()

    pipeline = FeaturePipeline(feature_sets).fit(train_df, y_train)

    out_path = artifacts_dir / "feature_pipeline.pkl"
    with open(out_path, "wb") as f:
        pickle.dump(pipeline, f)
    log.info("Wrote %s (%d feature sets)", out_path, len(pipeline.feature_sets))
    return out_path


if __name__ == "__main__":
    target = Path(sys.argv[1]) if len(sys.argv) > 1 else None
    main(target)
