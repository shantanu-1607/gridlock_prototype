"""Regenerate reference.parquet for event fingerprinting.

The champion artifacts produced by the experiments/promote pipeline do NOT emit
the reference table (only the full train.py run does, via
evaluate.write_reference_table). Without it Predictor.fingerprinter is None and
every prediction returns zero similar events.

This standalone script rebuilds the table directly from the raw incident dataset.
It reuses the exact same code paths the trainer uses — load_and_prepare() for
duration derivation/filtering and engineer_severity() for the severity score — so
the output is identical to what train.py would have written, but needs only
pandas/numpy/pyyaml/pyarrow (not the full lightgbm/catboost/prophet stack).

Usage:
    python apps/ml/scripts/build_reference.py            # writes into latest champion dir
    python apps/ml/scripts/build_reference.py <out_dir>  # writes into a specific dir
"""

import sys
from pathlib import Path

import pandas as pd

# Make the `src` package importable when run as a plain script.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.constants import ARTIFACTS_DIR, DURATION_COL  # noqa: E402
from src.data import load_and_prepare, load_config  # noqa: E402
from src.features import engineer_severity  # noqa: E402


def _find_latest_artifacts() -> Path:
    """Mirror predict.find_latest_artifacts without importing the model stack."""
    if not ARTIFACTS_DIR.exists():
        raise SystemExit(f"Artifacts dir not found: {ARTIFACTS_DIR}")
    for d in sorted(ARTIFACTS_DIR.iterdir(), reverse=True):
        if not d.is_dir():
            continue
        if (d / "champion_model.pkl").exists() or (d / "lgb_model_0.txt").exists():
            return d
    raise SystemExit(f"No champion/legacy artifacts dir found under {ARTIFACTS_DIR}")


def main() -> None:
    out_dir = Path(sys.argv[1]) if len(sys.argv) > 1 else _find_latest_artifacts()

    cfg = load_config()
    cols = cfg["columns"]

    df = load_and_prepare(cfg)
    severity = engineer_severity(df)  # uses actual duration_mins, same as the trainer

    start_dt = pd.to_datetime(df[cols["start_timestamp"]], errors="coerce", utc=True)
    ref_out = pd.DataFrame(
        {
            "event_id": df[cols["id"]].astype(str),
            "event_cause": df[cols["event_cause"]],
            "corridor": df[cols["corridor"]],
            "latitude": pd.to_numeric(df[cols["latitude"]], errors="coerce"),
            "longitude": pd.to_numeric(df[cols["longitude"]], errors="coerce"),
            "hour": start_dt.dt.hour,
            "duration_mins": df[DURATION_COL],
            "severity_score": severity.values,
        }
    )
    ref_out = ref_out.dropna(subset=["latitude", "longitude", "duration_mins"])

    dest = out_dir / "reference.parquet"
    ref_out.to_parquet(dest, index=False)
    print(f"Reference table: {len(ref_out)} rows -> {dest}")


if __name__ == "__main__":
    main()
