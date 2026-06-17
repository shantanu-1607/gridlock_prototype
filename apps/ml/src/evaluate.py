import json
from pathlib import Path

import numpy as np
import pandas as pd

from .constants import DURATION_COL, SEVERITY_THRESHOLDS
from .logger import get_logger

log = get_logger("gridlock.evaluate")


def compute_metrics(y_train, pred_train, y_test, pred_test) -> dict:
    def _metrics(y_true, y_pred, prefix):
        mae = float(np.mean(np.abs(y_true - y_pred)))
        rmse = float(np.sqrt(np.mean((y_true - y_pred) ** 2)))
        non_zero = y_true > 0
        mape = float(np.mean(np.abs((y_true[non_zero] - y_pred[non_zero]) / y_true[non_zero])) * 100)
        ss_res = np.sum((y_true - y_pred) ** 2)
        ss_tot = np.sum((y_true - np.mean(y_true)) ** 2)
        r2 = float(1 - ss_res / ss_tot) if ss_tot > 0 else 0.0
        return {
            f"{prefix}_mae": round(mae, 2),
            f"{prefix}_rmse": round(rmse, 2),
            f"{prefix}_mape": round(mape, 2),
            f"{prefix}_r2": round(r2, 4),
        }

    m = {}
    m.update(_metrics(y_train, pred_train, "train"))
    m.update(_metrics(y_test, pred_test, "test"))
    return m


def check_overfit(metrics: dict) -> dict:
    train_rmse = metrics["train_rmse"]
    test_rmse = metrics["test_rmse"]
    gap = (test_rmse - train_rmse) / train_rmse if train_rmse > 0 else 0
    return {
        "train_rmse": train_rmse,
        "test_rmse": test_rmse,
        "gap_pct": round(gap * 100, 2),
        "overfit_flag": gap > 0.15,
    }


def severity_sanity(sev_train: pd.Series, sev_test: pd.Series) -> dict:
    combined = pd.concat([sev_train, sev_test])
    label_counts = {}
    for threshold, label in SEVERITY_THRESHOLDS:
        count = int((combined < threshold).sum() - sum(label_counts.values()))
        label_counts[label] = count

    has_all = all(v > 0 for v in label_counts.values())
    return {
        "min": round(float(combined.min()), 4),
        "max": round(float(combined.max()), 4),
        "mean": round(float(combined.mean()), 4),
        "label_distribution": label_counts,
        "sane": has_all,
    }


def write_reference_table(
    full_df: pd.DataFrame,
    cols: dict,
    sev_train: pd.Series,
    sev_test: pd.Series,
    train_df: pd.DataFrame,
    test_df: pd.DataFrame,
    out_dir: Path,
):
    ref = full_df.copy()
    start_dt = pd.to_datetime(ref[cols["start_timestamp"]], errors="coerce", utc=True)
    ref_out = pd.DataFrame({
        "event_id": ref[cols["id"]],
        "event_cause": ref[cols["event_cause"]],
        "corridor": ref[cols["corridor"]],
        "latitude": pd.to_numeric(ref[cols["latitude"]], errors="coerce"),
        "longitude": pd.to_numeric(ref[cols["longitude"]], errors="coerce"),
        "hour": start_dt.dt.hour,
        "duration_mins": ref[DURATION_COL],
    })

    severity_combined = pd.Series(dtype=float, index=full_df.index)
    severity_combined.loc[train_df.index] = sev_train.values
    severity_combined.loc[test_df.index] = sev_test.values
    ref_out["severity_score"] = severity_combined.values

    ref_out = ref_out.dropna(subset=["latitude", "longitude", "duration_mins"])
    ref_out.to_parquet(out_dir / "reference.parquet", index=False)
    log.info("Reference table: %d rows → %s", len(ref_out), out_dir / "reference.parquet")


def learning_curve(train_df, y_train_raw, lgb_params, n_splits, enc, out_dir):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    import lightgbm as lgb_lib
    from sklearn.model_selection import TimeSeriesSplit

    fractions = [0.2, 0.4, 0.6, 0.8, 1.0]
    train_scores = []
    val_scores = []
    n = len(train_df)

    for frac in fractions:
        end = max(int(n * frac), n_splits + 10)
        sub_df = train_df.iloc[:end]
        sub_y = y_train_raw[:end]

        tscv = TimeSeriesSplit(n_splits=min(n_splits, max(2, end // 50)))
        fold_train = []
        fold_val = []
        for tr_idx, va_idx in tscv.split(sub_df):
            tr = sub_df.iloc[tr_idx]
            va = sub_df.iloc[va_idx]
            y_tr = np.log1p(sub_y[tr_idx])
            y_va = np.log1p(sub_y[va_idx])

            fold_enc = type(enc)()
            fold_enc.fit(tr, y_duration=pd.Series(sub_y[tr_idx], index=tr.index))
            X_tr = fold_enc.transform(tr)
            X_va = fold_enc.transform(va)

            p = {**lgb_params, "verbose": -1, "objective": "regression", "metric": "rmse"}
            ne = p.pop("n_estimators", 2000)
            es = p.pop("early_stopping_rounds", 50)
            ds_tr = lgb_lib.Dataset(X_tr, label=y_tr)
            ds_va = lgb_lib.Dataset(X_va, label=y_va, reference=ds_tr)
            m = lgb_lib.train(
                p, ds_tr, num_boost_round=ne, valid_sets=[ds_va],
                callbacks=[lgb_lib.early_stopping(es, verbose=False), lgb_lib.log_evaluation(0)],
            )
            pred_tr = np.expm1(m.predict(X_tr))
            pred_va = np.expm1(m.predict(X_va))
            fold_train.append(np.sqrt(np.mean((sub_y[tr_idx] - pred_tr) ** 2)))
            fold_val.append(np.sqrt(np.mean((sub_y[va_idx] - pred_va) ** 2)))

        train_scores.append(np.mean(fold_train))
        val_scores.append(np.mean(fold_val))

    fig, ax = plt.subplots(figsize=(8, 5))
    sizes = [int(n * f) for f in fractions]
    ax.plot(sizes, train_scores, "o-", label="Train RMSE")
    ax.plot(sizes, val_scores, "o-", label="Val RMSE")
    ax.set_xlabel("Training set size")
    ax.set_ylabel("RMSE (minutes)")
    ax.set_title("Learning Curve")
    ax.legend()
    ax.grid(True, alpha=0.3)
    fig.tight_layout()
    fig.savefig(out_dir / "learning_curve.png", dpi=120)
    plt.close(fig)
    log.info("Learning curve saved to %s", out_dir / "learning_curve.png")
