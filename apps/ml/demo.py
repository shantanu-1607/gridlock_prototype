#!/usr/bin/env python3
"""One-command training pipeline: python demo.py"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from src.train import run_training
from src.logger import get_logger

log = get_logger("gridlock.demo")


def main():
    log.info("Starting GridLock ML training pipeline...")
    out_dir, metrics = run_training()
    log.info("Done! Artifacts at: %s", out_dir)
    log.info("Test MAE: %.2f min | Test RMSE: %.2f min | Test R²: %.4f",
             metrics["test_mae"], metrics["test_rmse"], metrics["test_r2"])


if __name__ == "__main__":
    main()
