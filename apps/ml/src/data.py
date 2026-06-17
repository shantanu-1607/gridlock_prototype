import pandas as pd
import yaml

from .constants import DATA_PATH, SCHEMA_YAML, DURATION_COL
from .logger import get_logger

log = get_logger("gridlock.data")


def load_config():
    with open(SCHEMA_YAML) as f:
        return yaml.safe_load(f)


def load_and_prepare(config: dict | None = None) -> pd.DataFrame:
    if config is None:
        config = load_config()
    cols = config["columns"]

    log.info("Loading dataset from %s", DATA_PATH)
    df = pd.read_csv(DATA_PATH, low_memory=False)
    log.info("Raw dataset: %d rows, %d columns", len(df), len(df.columns))

    df[cols["event_cause"]] = (
        df[cols["event_cause"]].astype(str).str.strip().str.lower()
    )

    start = pd.to_datetime(df[cols["start_timestamp"]], errors="coerce", utc=True)
    closed = pd.to_datetime(df[cols["closed_timestamp"]], errors="coerce", utc=True)
    resolved = pd.to_datetime(
        df[cols["resolved_timestamp"]], errors="coerce", utc=True
    )
    end = closed.fillna(resolved)

    df[DURATION_COL] = (end - start).dt.total_seconds() / 60.0

    cap = config["duration"]["cap_minutes"]
    floor = config["duration"]["min_minutes"]
    before = len(df)
    df = df[df[DURATION_COL].notna()].copy()
    df = df[(df[DURATION_COL] >= floor) & (df[DURATION_COL] <= cap)].copy()
    log.info(
        "After duration filter (%.0f–%d min): %d rows (dropped %d)",
        floor, cap, len(df), before - len(df),
    )

    df["_start_dt"] = start.loc[df.index]
    df = df.sort_values("_start_dt").reset_index(drop=True)

    return df


def chrono_split(df: pd.DataFrame, test_frac: float = 0.20):
    n = len(df)
    split = int(n * (1 - test_frac))
    train = df.iloc[:split].copy()
    test = df.iloc[split:].copy()
    log.info("Chrono split: train=%d, test=%d", len(train), len(test))
    return train, test
