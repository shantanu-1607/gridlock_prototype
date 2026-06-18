"""DVC stage: prepare and split data into versioned train/test parquets."""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.data import load_and_prepare, chrono_split, load_config

Path("data/processed").mkdir(parents=True, exist_ok=True)

cfg = load_config()
df = load_and_prepare(cfg)
tr, te = chrono_split(df, cfg["train_test"]["test_fraction"])
tr.to_parquet("data/processed/train.parquet")
te.to_parquet("data/processed/test.parquet")
json.dump(
    {"n_train": len(tr), "n_test": len(te), "n_cols": len(df.columns)},
    open("data/processed/data_stats.json", "w"),
)
print(f"Prepared: {len(tr)} train, {len(te)} test, {len(df.columns)} cols")
