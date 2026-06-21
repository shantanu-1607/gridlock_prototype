"""Build the fingerprinting reference table for the deployed champion.

WHY: fingerprinting (similar-incident retrieval) is wired into predict.py, but it
only activates when `reference.parquet` exists in the champion dir. That table is
written by src/train.py (the legacy path) — NOT by experiments/promote.py — so the
promoted champion shipped without it, leaving `Predictor.fingerprinter = None` and
`similar_events` permanently empty. This script regenerates the table from the Astram
dataset (all usable rows + computed severity) so fingerprinting works in production.

Run from apps/ml:  PYTHONPATH=. python scripts/build_fingerprint_reference.py
Re-run after any champion re-promote.
"""

import sys
from pathlib import Path

import pandas as pd

from src.constants import DURATION_COL
from src.data import load_and_prepare, load_config
from src.features import engineer_severity
from src.logger import get_logger
from src.predict import find_latest_artifacts

log = get_logger("gridlock.build_fingerprint_reference")


def main(artifacts_dir: Path | None = None) -> Path:
    if artifacts_dir is None:
        artifacts_dir = find_latest_artifacts()
    if artifacts_dir is None:
        raise SystemExit("No champion artifacts dir found")

    cfg = load_config()
    cols = cfg["columns"]
    df = load_and_prepare(cfg)

    start_dt = pd.to_datetime(df[cols["start_timestamp"]], errors="coerce", utc=True)
    severity = engineer_severity(df)  # uses actual duration_mins when no prediction given

    ref = pd.DataFrame({
        "event_id": df[cols["id"]].astype(str),
        "event_cause": df[cols["event_cause"]].astype(str),
        "corridor": df[cols["corridor"]].astype(str),
        "latitude": pd.to_numeric(df[cols["latitude"]], errors="coerce"),
        "longitude": pd.to_numeric(df[cols["longitude"]], errors="coerce"),
        "hour": start_dt.dt.hour,
        "duration_mins": df[DURATION_COL],
        "severity_score": severity.values,
    }).dropna(subset=["latitude", "longitude", "duration_mins", "hour"])

    out_path = artifacts_dir / "reference.parquet"
    ref.to_parquet(out_path, index=False)
    log.info("Wrote %s (%d reference incidents)", out_path, len(ref))
    return out_path


if __name__ == "__main__":
    target = Path(sys.argv[1]) if len(sys.argv) > 1 else None
    main(target)
