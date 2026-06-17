import json
import pickle
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd
import yaml
import optuna
import lightgbm as lgb
from catboost import CatBoostRegressor, Pool
from sklearn.model_selection import TimeSeriesSplit

from .constants import ARTIFACTS_DIR, DURATION_COL, MODEL_YAML, TARGET_ENC_COLS
from .data import load_and_prepare, chrono_split, load_config
from .features import Encoders, engineer_severity
from .logger import get_logger

log = get_logger("gridlock.train")
optuna.logging.set_verbosity(optuna.logging.WARNING)


def _load_model_config():
    with open(MODEL_YAML) as f:
        return yaml.safe_load(f)


def _make_encoders_for_fold(train_df, y_train):
    enc = Encoders()
    enc.fit(train_df, y_duration=y_train)
    return enc


def oof_predictions(
    model_type: str,
    params: dict,
    df: pd.DataFrame,
    y_raw: np.ndarray,
    n_splits: int,
    encoders_template: Encoders,
):
    tscv = TimeSeriesSplit(n_splits=n_splits)
    oof = np.full(len(df), np.nan)
    y_log = np.log1p(y_raw)

    for fold, (tr_idx, va_idx) in enumerate(tscv.split(df)):
        tr_df, va_df = df.iloc[tr_idx], df.iloc[va_idx]
        y_tr, y_va = y_log[tr_idx], y_log[va_idx]

        fold_enc = _make_encoders_for_fold(tr_df, pd.Series(y_raw[tr_idx], index=tr_df.index))
        X_tr = fold_enc.transform(tr_df)
        X_va = fold_enc.transform(va_df)

        if model_type == "lgb":
            ds_tr = lgb.Dataset(X_tr, label=y_tr)
            ds_va = lgb.Dataset(X_va, label=y_va, reference=ds_tr)
            p = {**params, "verbose": -1, "objective": "regression", "metric": "rmse"}
            n_est = p.pop("n_estimators", 2000)
            es = p.pop("early_stopping_rounds", 50)
            model = lgb.train(
                p, ds_tr, num_boost_round=n_est,
                valid_sets=[ds_va],
                callbacks=[lgb.early_stopping(es, verbose=False), lgb.log_evaluation(0)],
            )
            oof[va_idx] = model.predict(X_va)
        else:
            p = {**params, "verbose": 0, "loss_function": "RMSE"}
            iters = p.pop("iterations", 2000)
            es = p.pop("early_stopping_rounds", 50)
            model = CatBoostRegressor(iterations=iters, early_stopping_rounds=es, **p)
            model.fit(X_tr, y_tr, eval_set=(X_va, y_va), verbose=0)
            oof[va_idx] = model.predict(X_va)

    return oof


def _suggest_lgb(trial, cfg):
    s = cfg["lgb_space"]
    return {
        "num_leaves": trial.suggest_int("lgb_num_leaves", s["num_leaves"][0], s["num_leaves"][1]),
        "min_child_samples": trial.suggest_int("lgb_min_child_samples", s["min_child_samples"][0], s["min_child_samples"][1]),
        "learning_rate": trial.suggest_float("lgb_lr", s["learning_rate"][0], s["learning_rate"][1], log=True),
        "feature_fraction": trial.suggest_float("lgb_ff", s["feature_fraction"][0], s["feature_fraction"][1]),
        "bagging_fraction": trial.suggest_float("lgb_bf", s["bagging_fraction"][0], s["bagging_fraction"][1]),
        "bagging_freq": s["bagging_freq"],
        "n_estimators": s["n_estimators"],
        "early_stopping_rounds": s["early_stopping_rounds"],
    }


def _suggest_cat(trial, cfg):
    s = cfg["cat_space"]
    return {
        "depth": trial.suggest_int("cat_depth", s["depth"][0], s["depth"][1]),
        "learning_rate": trial.suggest_float("cat_lr", s["learning_rate"][0], s["learning_rate"][1], log=True),
        "l2_leaf_reg": trial.suggest_float("cat_l2", s["l2_leaf_reg"][0], s["l2_leaf_reg"][1]),
        "min_data_in_leaf": trial.suggest_int("cat_mdl", s["min_data_in_leaf"][0], s["min_data_in_leaf"][1]),
        "random_strength": trial.suggest_float("cat_rs", s["random_strength"][0], s["random_strength"][1]),
        "bagging_temperature": trial.suggest_float("cat_bt", s["bagging_temperature"][0], s["bagging_temperature"][1]),
        "iterations": s["iterations"],
        "early_stopping_rounds": s["early_stopping_rounds"],
    }


def run_training():
    schema_cfg = load_config()
    model_cfg = _load_model_config()
    n_splits = model_cfg["cv"]["n_splits"]
    n_trials = model_cfg["optuna"]["n_trials"]
    timeout = model_cfg["optuna"]["timeout_seconds"]

    log.info("=== GridLock ML Training ===")

    df = load_and_prepare(schema_cfg)
    train_df, test_df = chrono_split(df, schema_cfg["train_test"]["test_fraction"])

    y_train_raw = train_df[DURATION_COL].values.copy()
    y_test_raw = test_df[DURATION_COL].values.copy()

    full_enc = Encoders()
    full_enc.fit(train_df, y_duration=pd.Series(y_train_raw, index=train_df.index))
    X_train = full_enc.transform(train_df)
    X_test = full_enc.transform(test_df)
    feature_names = list(X_train.columns)
    log.info("Features (%d): %s", len(feature_names), feature_names)

    # --- Optuna HPO for LightGBM ---
    log.info("--- LightGBM Optuna search (%d trials) ---", n_trials)

    def lgb_objective(trial):
        params = _suggest_lgb(trial, model_cfg)
        oof = oof_predictions("lgb", params, train_df, y_train_raw, n_splits, full_enc)
        valid = ~np.isnan(oof)
        rmse = np.sqrt(np.mean((oof[valid] - np.log1p(y_train_raw[valid])) ** 2))
        return rmse

    lgb_study = optuna.create_study(direction="minimize")
    lgb_study.optimize(lgb_objective, n_trials=n_trials, timeout=timeout)
    lgb_best = _suggest_lgb_from_best(lgb_study.best_params, model_cfg)
    log.info("LGB best RMSE(log): %.4f", lgb_study.best_value)

    # --- Optuna HPO for CatBoost ---
    log.info("--- CatBoost Optuna search (%d trials) ---", n_trials)

    def cat_objective(trial):
        params = _suggest_cat(trial, model_cfg)
        oof = oof_predictions("cat", params, train_df, y_train_raw, n_splits, full_enc)
        valid = ~np.isnan(oof)
        rmse = np.sqrt(np.mean((oof[valid] - np.log1p(y_train_raw[valid])) ** 2))
        return rmse

    cat_study = optuna.create_study(direction="minimize")
    cat_study.optimize(cat_objective, n_trials=n_trials, timeout=timeout)
    cat_best = _suggest_cat_from_best(cat_study.best_params, model_cfg)
    log.info("CAT best RMSE(log): %.4f", cat_study.best_value)

    # --- Feature pruning ---
    prune_cfg = model_cfg["pruning"]
    oof_lgb = oof_predictions("lgb", lgb_best, train_df, y_train_raw, n_splits, full_enc)
    valid = ~np.isnan(oof_lgb)
    base_rmse = np.sqrt(np.mean((oof_lgb[valid] - np.log1p(y_train_raw[valid])) ** 2))

    y_log_train = np.log1p(y_train_raw)
    ds_full = lgb.Dataset(X_train, label=y_log_train)
    lgb_params_train = {**lgb_best, "verbose": -1, "objective": "regression", "metric": "rmse"}
    n_est = lgb_params_train.pop("n_estimators", 2000)
    es = lgb_params_train.pop("early_stopping_rounds", 50)
    tmp_model = lgb.train(lgb_params_train, ds_full, num_boost_round=500)
    importances = tmp_model.feature_importance(importance_type="gain")
    total_imp = importances.sum()
    if total_imp > 0:
        rel_imp = importances / total_imp
        pruned = [f for f, imp in zip(feature_names, rel_imp) if imp < prune_cfg["importance_threshold"]]
        if pruned:
            log.info("Candidates for pruning (%d): %s", len(pruned), pruned)
            keep_cols = [f for f in feature_names if f not in pruned]
            pruned_train_df = train_df.copy()
            oof_p = oof_predictions("lgb", lgb_best, pruned_train_df, y_train_raw, n_splits, full_enc)
            valid_p = ~np.isnan(oof_p)

            X_train_pruned = X_train[keep_cols]
            pruned_rmse = np.sqrt(np.mean((oof_p[valid_p] - np.log1p(y_train_raw[valid_p])) ** 2))
            if pruned_rmse <= base_rmse * (1 + prune_cfg["rmse_tolerance"]):
                feature_names = keep_cols
                X_train = X_train_pruned
                X_test = X_test[keep_cols]
                log.info("Pruned %d features (RMSE %.4f -> %.4f)", len(pruned), base_rmse, pruned_rmse)
            else:
                log.info("Pruning rejected (RMSE %.4f -> %.4f)", base_rmse, pruned_rmse)

    # --- Train final models on full training set ---
    log.info("--- Training final models ---")
    y_log_train = np.log1p(y_train_raw)

    # LightGBM final
    lgb_params_final = {**lgb_best, "verbose": -1, "objective": "regression", "metric": "rmse"}
    n_est = lgb_params_final.pop("n_estimators", 2000)
    es_r = lgb_params_final.pop("early_stopping_rounds", 50)
    ds_tr = lgb.Dataset(X_train, label=y_log_train)
    ds_te = lgb.Dataset(X_test, label=np.log1p(y_test_raw), reference=ds_tr)
    lgb_model = lgb.train(
        lgb_params_final, ds_tr, num_boost_round=n_est,
        valid_sets=[ds_te],
        callbacks=[lgb.early_stopping(es_r, verbose=False), lgb.log_evaluation(0)],
    )

    # CatBoost final
    cat_params_final = {**cat_best, "verbose": 0, "loss_function": "RMSE"}
    cat_iters = cat_params_final.pop("iterations", 2000)
    cat_es = cat_params_final.pop("early_stopping_rounds", 50)
    cat_model = CatBoostRegressor(iterations=cat_iters, early_stopping_rounds=cat_es, **cat_params_final)
    cat_model.fit(X_train, y_log_train, eval_set=(X_test, np.log1p(y_test_raw)), verbose=0)

    # --- Ensemble predictions ---
    lgb_pred_train = lgb_model.predict(X_train)
    cat_pred_train = cat_model.predict(X_train)
    ens_pred_train = (lgb_pred_train + cat_pred_train) / 2.0
    pred_train_mins = np.expm1(ens_pred_train)

    lgb_pred_test = lgb_model.predict(X_test)
    cat_pred_test = cat_model.predict(X_test)
    ens_pred_test = (lgb_pred_test + cat_pred_test) / 2.0
    pred_test_mins = np.expm1(ens_pred_test)

    # --- Compute severity ---
    sev_train = engineer_severity(train_df, predicted_duration=pd.Series(pred_train_mins, index=train_df.index))
    sev_test = engineer_severity(test_df, predicted_duration=pd.Series(pred_test_mins, index=test_df.index))

    # --- Compute confidence (based on OOF correlation in log space) ---
    oof_final = oof_predictions("lgb", lgb_best, train_df, y_train_raw, n_splits, full_enc)
    valid_oof = ~np.isnan(oof_final)
    oof_rmse_log = float(np.sqrt(np.mean((oof_final[valid_oof] - np.log1p(y_train_raw[valid_oof])) ** 2)))
    y_std_log = float(np.std(np.log1p(y_train_raw[valid_oof])))
    confidence_base = max(0.3, min(0.95, 1.0 - oof_rmse_log / y_std_log)) if y_std_log > 0 else 0.5
    residual_std = float(np.std(np.abs(np.expm1(oof_final[valid_oof]) - y_train_raw[valid_oof])))

    # --- Save artifacts ---
    ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    out_dir = ARTIFACTS_DIR / ts
    out_dir.mkdir(parents=True, exist_ok=True)
    log.info("Saving artifacts to %s", out_dir)

    lgb_model.save_model(str(out_dir / "lgb_model.txt"))
    cat_model.save_model(str(out_dir / "cat_model.cbm"))

    with open(out_dir / "encoders.pkl", "wb") as f:
        pickle.dump(full_enc, f)

    with open(out_dir / "feature_names.json", "w") as f:
        json.dump(feature_names, f)

    with open(out_dir / "confidence.json", "w") as f:
        json.dump({"base_confidence": round(confidence_base, 4), "residual_std": round(residual_std, 2)}, f)

    # --- Write reference table for fingerprinting ---
    from .evaluate import write_reference_table, compute_metrics, check_overfit, severity_sanity, learning_curve

    cols = load_config()["columns"]
    write_reference_table(df, cols, sev_train, sev_test, train_df, test_df, out_dir)

    metrics = compute_metrics(y_train_raw, pred_train_mins, y_test_raw, pred_test_mins)
    with open(out_dir / "metrics.json", "w") as f:
        json.dump(metrics, f, indent=2)
    log.info("Duration metrics: %s", json.dumps(metrics, indent=2))

    overfit = check_overfit(metrics)
    with open(out_dir / "overfit_report.json", "w") as f:
        json.dump(overfit, f, indent=2)

    sanity = severity_sanity(sev_train, sev_test)
    with open(out_dir / "severity_sanity.json", "w") as f:
        json.dump(sanity, f, indent=2)

    try:
        learning_curve(
            train_df, y_train_raw, lgb_best, n_splits, full_enc, out_dir
        )
    except Exception as e:
        log.warning("Learning curve failed: %s", e)

    log.info("=== Training complete: %s ===", ts)
    return out_dir, metrics


def _suggest_lgb_from_best(best_params, cfg):
    s = cfg["lgb_space"]
    return {
        "num_leaves": best_params["lgb_num_leaves"],
        "min_child_samples": best_params["lgb_min_child_samples"],
        "learning_rate": best_params["lgb_lr"],
        "feature_fraction": best_params["lgb_ff"],
        "bagging_fraction": best_params["lgb_bf"],
        "bagging_freq": s["bagging_freq"],
        "n_estimators": s["n_estimators"],
        "early_stopping_rounds": s["early_stopping_rounds"],
    }


def _suggest_cat_from_best(best_params, cfg):
    s = cfg["cat_space"]
    return {
        "depth": best_params["cat_depth"],
        "learning_rate": best_params["cat_lr"],
        "l2_leaf_reg": best_params["cat_l2"],
        "min_data_in_leaf": best_params["cat_mdl"],
        "random_strength": best_params["cat_rs"],
        "bagging_temperature": best_params["cat_bt"],
        "iterations": s["iterations"],
        "early_stopping_rounds": s["early_stopping_rounds"],
    }
