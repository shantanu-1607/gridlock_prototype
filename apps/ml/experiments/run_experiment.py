"""Unified experiment runner with MLflow tracking.

Trains any model on any feature set with full param/metric/artifact logging.
CLI: python -m experiments.run_experiment --model lightgbm --features F1_baseline --trials 50
"""

import argparse
import json
import pickle
import time
from pathlib import Path

import mlflow
import numpy as np
import optuna
import pandas as pd
from sklearn.model_selection import TimeSeriesSplit

from src.constants import BASE_DIR, DURATION_COL
from src.data import load_and_prepare, chrono_split, load_config
from src.logger import get_logger

from .mlflow_config import (
    init_mlflow,
    get_or_create_experiment,
    generate_run_name,
    experiment_name,
    get_dvc_data_hash,
    log_run_artifacts,
)
from .feature_registry import FEATURE_SETS, build_features
from .model_registry import (
    MODEL_REGISTRY,
    create_model,
    suggest_params,
    get_model_config,
    list_models,
)
from .evaluate import (
    evaluate_and_log,
    compute_fold_metrics,
    measure_inference_time,
)

log = get_logger("gridlock.experiments.runner")
optuna.logging.set_verbosity(optuna.logging.WARNING)

N_SPLITS = 5


def _train_sklearn_model(model, X_train, y_log_train, X_test, n_splits):
    """Train sklearn-compatible model with TimeSeriesSplit OOF predictions."""
    tscv = TimeSeriesSplit(n_splits=n_splits)
    oof = np.full(len(X_train), np.nan)

    for fold, (tr_idx, va_idx) in enumerate(tscv.split(X_train)):
        X_tr = X_train.iloc[tr_idx] if hasattr(X_train, "iloc") else X_train[tr_idx]
        X_va = X_train.iloc[va_idx] if hasattr(X_train, "iloc") else X_train[va_idx]
        y_tr = y_log_train[tr_idx]

        import copy
        fold_model = copy.deepcopy(model)
        fold_model.fit(X_tr, y_tr)
        oof[va_idx] = fold_model.predict(X_va)

    # Train final model on all training data
    model.fit(X_train, y_log_train)
    pred_train = model.predict(X_train)
    pred_test = model.predict(X_test)

    return model, oof, pred_train, pred_test


def _train_neural_model(model, X_train, y_log_train, X_test, n_splits):
    """Train neural net model with TimeSeriesSplit OOF predictions."""
    tscv = TimeSeriesSplit(n_splits=n_splits)
    oof = np.full(len(X_train), np.nan)
    fold_indices = list(tscv.split(X_train))

    X_arr = np.asarray(X_train)
    X_test_arr = np.asarray(X_test)

    for fold, (tr_idx, va_idx) in enumerate(fold_indices):
        X_tr, X_va = X_arr[tr_idx], X_arr[va_idx]
        y_tr, y_va = y_log_train[tr_idx], y_log_train[va_idx]

        import copy
        fold_model = copy.deepcopy(model)
        fold_model.fit(X_tr, y_tr, eval_set=(X_va, y_va))
        oof[va_idx] = fold_model.predict(X_va)

    # Train final model on all data (use last 15% as validation for early stopping)
    split_pt = int(len(X_arr) * 0.85)
    model.fit(
        X_arr[:split_pt], y_log_train[:split_pt],
        eval_set=(X_arr[split_pt:], y_log_train[split_pt:]),
    )
    pred_train = model.predict(X_arr)
    pred_test = model.predict(X_test_arr)

    return model, oof, pred_train, pred_test


def _train_lgb_cat_model(model_name, params, train_df, y_train_raw, X_train, X_test, encoder, n_splits):
    """Train LightGBM/CatBoost with fold-based OOF using pre-built features.

    Uses the pre-built X_train (which includes F2-F6 extra features) directly
    instead of re-encoding per fold via oof_predictions(), which only produces
    baseline features.
    """
    import lightgbm as lgb
    from catboost import CatBoostRegressor

    model_type = "lgb" if model_name == "lightgbm" else "cat"
    y_log_train = np.log1p(y_train_raw)

    # OOF predictions using pre-built features (fixes F2-F6 feature mismatch)
    tscv = TimeSeriesSplit(n_splits=n_splits)
    oof = np.full(len(X_train), np.nan)

    for fold, (tr_idx, va_idx) in enumerate(tscv.split(X_train)):
        X_tr = X_train.iloc[tr_idx]
        X_va = X_train.iloc[va_idx]
        y_tr = y_log_train[tr_idx]
        y_va = y_log_train[va_idx]

        if model_type == "lgb":
            p = {**params, "verbose": -1, "objective": "regression", "metric": "rmse"}
            n_est = p.pop("n_estimators", 2000)
            es = p.pop("early_stopping_rounds", 50)
            ds_tr = lgb.Dataset(X_tr, label=y_tr)
            ds_va = lgb.Dataset(X_va, label=y_va, reference=ds_tr)
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

    # Train final model on all training data
    y_log_test = np.log1p(np.zeros(len(X_test)))  # placeholder

    if model_type == "lgb":
        p = {**params, "verbose": -1, "objective": "regression", "metric": "rmse"}
        n_est = p.pop("n_estimators", 2000)
        es = p.pop("early_stopping_rounds", 50)
        ds_tr = lgb.Dataset(X_train, label=y_log_train)
        ds_te = lgb.Dataset(X_test, label=y_log_test, reference=ds_tr)
        final_model = lgb.train(
            p, ds_tr, num_boost_round=n_est,
            valid_sets=[ds_te],
            callbacks=[lgb.early_stopping(es, verbose=False), lgb.log_evaluation(0)],
        )
        pred_train = final_model.predict(X_train)
        pred_test = final_model.predict(X_test)
    else:
        p = {**params, "verbose": 0, "loss_function": "RMSE"}
        iters = p.pop("iterations", 2000)
        es = p.pop("early_stopping_rounds", 50)
        final_model = CatBoostRegressor(iterations=iters, early_stopping_rounds=es, **p)
        final_model.fit(X_train, y_log_train, eval_set=(X_test, y_log_test), verbose=0)
        pred_train = final_model.predict(X_train)
        pred_test = final_model.predict(X_test)

    return final_model, oof, pred_train, pred_test


def run_single_experiment(
    model_name: str,
    feature_set: str,
    n_trials: int = 50,
    exp_name: str | None = None,
    timeout: int = 600,
) -> dict:
    """Run a single experiment: model x feature_set with Optuna HPO + MLflow tracking.

    Returns dict with run_id, metrics, best_params.
    """
    init_mlflow()

    if exp_name is None:
        exp_name = experiment_name("experiments", feature_set)
    experiment_id = get_or_create_experiment(exp_name)

    model_cfg = get_model_config(model_name)
    run_name = generate_run_name(model_name, feature_set)

    log.info("=== Experiment: %s on %s (%d trials) ===", model_name, feature_set, n_trials)

    # Load data
    schema_cfg = load_config()
    df = load_and_prepare(schema_cfg)
    train_df, test_df = chrono_split(df, schema_cfg["train_test"]["test_fraction"])
    y_train_raw = train_df[DURATION_COL].values.copy()
    y_test_raw = test_df[DURATION_COL].values.copy()

    # Build features
    X_train, X_test, encoder = build_features(feature_set, train_df, test_df, y_train_raw)
    feature_names = list(X_train.columns)

    y_log_train = np.log1p(y_train_raw)
    y_log_test = np.log1p(y_test_raw)

    # --- Optuna HPO ---
    tscv = TimeSeriesSplit(n_splits=N_SPLITS)
    fold_indices = list(tscv.split(X_train))

    def objective(trial):
        params = suggest_params(model_name, trial)

        if model_name in ("lightgbm", "catboost"):
            # Use pre-built features directly (fixes F2-F6 feature mismatch)
            import lightgbm as _lgb
            from catboost import CatBoostRegressor as _Cat
            model_type = "lgb" if model_name == "lightgbm" else "cat"
            oof = np.full(len(X_train), np.nan)
            for _, (tr_idx, va_idx) in enumerate(fold_indices):
                X_tr = X_train.iloc[tr_idx]
                X_va = X_train.iloc[va_idx]
                y_tr, y_va = y_log_train[tr_idx], y_log_train[va_idx]
                if model_type == "lgb":
                    p = {**params, "verbose": -1, "objective": "regression", "metric": "rmse"}
                    n_est = p.pop("n_estimators", 2000)
                    es = p.pop("early_stopping_rounds", 50)
                    ds_tr = _lgb.Dataset(X_tr, label=y_tr)
                    ds_va = _lgb.Dataset(X_va, label=y_va, reference=ds_tr)
                    m = _lgb.train(
                        p, ds_tr, num_boost_round=n_est, valid_sets=[ds_va],
                        callbacks=[_lgb.early_stopping(es, verbose=False), _lgb.log_evaluation(0)],
                    )
                    oof[va_idx] = m.predict(X_va)
                else:
                    p = {**params, "verbose": 0, "loss_function": "RMSE"}
                    iters = p.pop("iterations", 2000)
                    es = p.pop("early_stopping_rounds", 50)
                    m = _Cat(iterations=iters, early_stopping_rounds=es, **p)
                    m.fit(X_tr, y_tr, eval_set=(X_va, y_va), verbose=0)
                    oof[va_idx] = m.predict(X_va)
        elif model_cfg.family == "neural":
            model = create_model(model_name, params)
            oof = np.full(len(X_train), np.nan)
            X_arr = np.asarray(X_train)
            for _, (tr_idx, va_idx) in enumerate(fold_indices):
                import copy
                fm = copy.deepcopy(model)
                fm.fit(X_arr[tr_idx], y_log_train[tr_idx],
                       eval_set=(X_arr[va_idx], y_log_train[va_idx]))
                oof[va_idx] = fm.predict(X_arr[va_idx])
        else:
            model = create_model(model_name, params)
            oof = np.full(len(X_train), np.nan)
            for _, (tr_idx, va_idx) in enumerate(fold_indices):
                import copy
                fm = copy.deepcopy(model)
                X_tr = X_train.iloc[tr_idx]
                X_va = X_train.iloc[va_idx]
                fm.fit(X_tr, y_log_train[tr_idx])
                oof[va_idx] = fm.predict(X_va)

        valid = ~np.isnan(oof)
        if not valid.any():
            return float("inf")
        rmse = float(np.sqrt(np.mean((oof[valid] - y_log_train[valid]) ** 2)))
        return rmse

    study = optuna.create_study(direction="minimize")
    study.optimize(objective, n_trials=n_trials, timeout=timeout)
    best_params = suggest_params(model_name, study.best_trial)
    log.info("Best OOF log_rmse: %.4f", study.best_value)

    # --- Train final model with best params ---
    if model_name in ("lightgbm", "catboost"):
        final_model, oof, pred_train_log, pred_test_log = _train_lgb_cat_model(
            model_name, best_params, train_df, y_train_raw,
            X_train, X_test, encoder, N_SPLITS,
        )
    elif model_cfg.family == "neural":
        final_model = create_model(model_name, best_params)
        final_model, oof, pred_train_log, pred_test_log = _train_neural_model(
            final_model, X_train, y_log_train, X_test, N_SPLITS,
        )
    else:
        final_model = create_model(model_name, best_params)
        final_model, oof, pred_train_log, pred_test_log = _train_sklearn_model(
            final_model, X_train, y_log_train, X_test, N_SPLITS,
        )

    # Convert from log space to minutes
    pred_train_mins = np.expm1(pred_train_log)
    pred_test_mins = np.expm1(pred_test_log)

    # Compute fold metrics
    fold_metrics = compute_fold_metrics(oof, y_train_raw, fold_indices)

    # Measure inference time
    try:
        inf_time = measure_inference_time(final_model, X_test)
    except Exception:
        inf_time = None

    # --- MLflow logging ---
    with mlflow.start_run(
        experiment_id=experiment_id,
        run_name=run_name,
    ) as run:
        # Log params
        mlflow.log_params({
            "model_name": model_name,
            "model_family": model_cfg.family,
            "feature_set": feature_set,
            "n_features": len(feature_names),
            "n_trials": n_trials,
            "n_train": len(X_train),
            "n_test": len(X_test),
            "data_version": get_dvc_data_hash(),
        })

        # Log best hyperparams (flatten nested values)
        flat_params = {}
        for k, v in best_params.items():
            if isinstance(v, (list, tuple)):
                flat_params[f"hp_{k}"] = str(v)
            else:
                flat_params[f"hp_{k}"] = v
        mlflow.log_params(flat_params)

        # Tags
        mlflow.set_tags({
            "phase": "experiment",
            "model_family": model_cfg.family,
            "feature_set": feature_set,
            "stage": "tuning",
        })

        # Log metrics
        metrics = evaluate_and_log(
            y_train_raw, pred_train_mins,
            y_test_raw, pred_test_mins,
            fold_scores=fold_metrics["fold_log_rmse"],
            inference_time_ms=inf_time,
        )

        # Log OOF predictions as artifact
        oof_path = Path(BASE_DIR / "mlartifacts" / "temp_oof.csv")
        oof_path.parent.mkdir(parents=True, exist_ok=True)
        pd.DataFrame({
            "oof_pred": oof,
            "y_true_log": np.log1p(y_train_raw),
        }).to_csv(oof_path, index=False)
        mlflow.log_artifact(str(oof_path), "predictions")
        oof_path.unlink(missing_ok=True)

        # Log model
        try:
            if model_name == "lightgbm":
                mlflow.lightgbm.log_model(final_model, "model")
            elif model_name == "catboost":
                mlflow.catboost.log_model(final_model, "model")
            elif model_name == "xgboost":
                mlflow.xgboost.log_model(final_model, "model")
            elif model_cfg.family == "neural":
                # Serialize neural net model
                model_path = Path(BASE_DIR / "mlartifacts" / "temp_model.pkl")
                with open(model_path, "wb") as f:
                    pickle.dump(final_model, f)
                mlflow.log_artifact(str(model_path), "model")
                model_path.unlink(missing_ok=True)
            else:
                mlflow.sklearn.log_model(final_model, "model")
        except Exception as e:
            log.warning("Could not log model to MLflow: %s", e)

        # Log encoder
        enc_path = Path(BASE_DIR / "mlartifacts" / "temp_encoder.pkl")
        with open(enc_path, "wb") as f:
            pickle.dump(encoder, f)
        mlflow.log_artifact(str(enc_path), "encoder")
        enc_path.unlink(missing_ok=True)

        # Log feature names
        fn_path = Path(BASE_DIR / "mlartifacts" / "temp_feature_names.json")
        with open(fn_path, "w") as f:
            json.dump(feature_names, f)
        mlflow.log_artifact(str(fn_path), "config")
        fn_path.unlink(missing_ok=True)

        run_id = run.info.run_id

    log.info(
        "Experiment complete: %s | test_log_rmse=%.4f | test_mae=%.2f | run_id=%s",
        run_name, metrics.get("test_log_rmse", -1), metrics.get("test_mae", -1), run_id,
    )

    return {
        "run_id": run_id,
        "model_name": model_name,
        "feature_set": feature_set,
        "metrics": metrics,
        "best_params": best_params,
        "fold_metrics": fold_metrics,
    }


def run_batch(
    model_names: list[str] | None = None,
    feature_sets: list[str] | None = None,
    n_trials: int = 20,
    exp_name: str | None = None,
    timeout: int = 600,
) -> list[dict]:
    """Run experiments for all model x feature_set combinations."""
    if model_names is None:
        model_names = list(MODEL_REGISTRY.keys())
    if feature_sets is None:
        feature_sets = list(FEATURE_SETS.keys())

    results = []
    total = len(model_names) * len(feature_sets)
    count = 0

    for fs in feature_sets:
        for model in model_names:
            count += 1
            log.info("--- Batch %d/%d: %s x %s ---", count, total, model, fs)
            try:
                result = run_single_experiment(
                    model, fs, n_trials=n_trials,
                    exp_name=exp_name, timeout=timeout,
                )
                results.append(result)
            except Exception as e:
                log.error("Failed: %s x %s: %s", model, fs, e)
                results.append({
                    "model_name": model,
                    "feature_set": fs,
                    "error": str(e),
                })

    # Summary
    successful = [r for r in results if "metrics" in r]
    if successful:
        best = min(successful, key=lambda r: r["metrics"].get("test_log_rmse", float("inf")))
        log.info(
            "=== Batch complete: %d/%d successful. Best: %s x %s (log_rmse=%.4f) ===",
            len(successful), total, best["model_name"], best["feature_set"],
            best["metrics"]["test_log_rmse"],
        )

    return results


def main():
    parser = argparse.ArgumentParser(description="GridLock Experiment Runner")
    parser.add_argument("--model", type=str, default="lightgbm",
                        help="Model name or 'all' for all models")
    parser.add_argument("--features", type=str, default="F1_baseline",
                        help="Feature set name or 'all' for all feature sets")
    parser.add_argument("--trials", type=int, default=50,
                        help="Number of Optuna trials")
    parser.add_argument("--timeout", type=int, default=600,
                        help="Timeout per model in seconds")
    parser.add_argument("--experiment", type=str, default=None,
                        help="MLflow experiment name override")
    parser.add_argument("--tournament", action="store_true",
                        help="Run full tournament (delegates to tournament.py)")

    args = parser.parse_args()

    if args.tournament:
        from .tournament import Tournament
        t = Tournament()
        champion = t.run_full_tournament()
        log.info("Champion: %s", champion)
        return

    if args.model == "all":
        models = list(MODEL_REGISTRY.keys())
    else:
        models = [m.strip() for m in args.model.split(",")]

    if args.features == "all":
        features = list(FEATURE_SETS.keys())
    else:
        features = [f.strip() for f in args.features.split(",")]

    if len(models) == 1 and len(features) == 1:
        result = run_single_experiment(
            models[0], features[0],
            n_trials=args.trials, exp_name=args.experiment,
            timeout=args.timeout,
        )
        print(json.dumps({k: v for k, v in result.items() if k != "fold_metrics"}, indent=2, default=str))
    else:
        results = run_batch(
            models, features,
            n_trials=args.trials, exp_name=args.experiment,
            timeout=args.timeout,
        )
        summary = [
            {k: v for k, v in r.items() if k != "fold_metrics"}
            for r in results
        ]
        print(json.dumps(summary, indent=2, default=str))


if __name__ == "__main__":
    main()
