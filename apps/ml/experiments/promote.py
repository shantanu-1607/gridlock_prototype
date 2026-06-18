"""Champion promotion: MLflow Model Registry → production artifacts.

Bridges the experiment framework back to the existing predict.py pipeline.
Supports single-model and weighted-ensemble champions.
"""

import copy
import json
import pickle
from pathlib import Path
from datetime import datetime, timezone

import numpy as np
import mlflow
from mlflow.tracking import MlflowClient

from src.constants import ARTIFACTS_DIR, BASE_DIR, DURATION_COL
from src.data import load_and_prepare, chrono_split, load_config
from src.logger import get_logger

from .mlflow_config import init_mlflow, get_client
from .feature_registry import build_features
from .model_registry import create_model, get_model_config
from .run_experiment import _train_sklearn_model, _train_neural_model

log = get_logger("gridlock.experiments.promote")

MODEL_REGISTRY_NAME = "gridlock-duration-predictor"


class StackingChampion:
    """Stacking ensemble: Ridge meta-learner on base model predictions.

    Each base model predicts independently, then Ridge combines them.
    Implements .predict(X_base) for Predictor compatibility.
    """

    def __init__(self, members, meta_model):
        """
        members: list of (model, feature_set_name, feature_names) tuples
        meta_model: fitted Ridge meta-learner
        """
        self.members = members
        self.meta_model = meta_model

    def predict(self, X):
        """Predict using stacking: base models → Ridge meta-learner."""
        base_preds = []
        for model, feat_set, feat_names in self.members:
            X_member = X.copy()
            for col in feat_names:
                if col not in X_member.columns:
                    X_member[col] = 0
            X_member = X_member.reindex(columns=feat_names, fill_value=0)
            base_preds.append(model.predict(X_member))
        meta_input = np.column_stack(base_preds)
        return self.meta_model.predict(meta_input)


def _retrain_model(model_name, feature_set, best_params, train_df, test_df, y_train_raw):
    """Retrain a model with given params and return (model, encoder, feature_names)."""
    X_train, X_test, encoder = build_features(feature_set, train_df, test_df, y_train_raw)
    feature_names = list(X_train.columns)
    y_log_train = np.log1p(y_train_raw)

    model_cfg = get_model_config(model_name)

    if model_name == "catboost":
        from catboost import CatBoostRegressor
        cat_params = {**best_params, "verbose": 0, "random_seed": 42}
        cat_params.pop("early_stopping_rounds", None)
        model = CatBoostRegressor(**cat_params)
        model.fit(X_train, y_log_train)
    elif model_name == "lightgbm":
        import lightgbm as lgb
        lgb_params = {**best_params, "verbose": -1, "random_state": 42, "n_jobs": -1}
        model = lgb.LGBMRegressor(**lgb_params)
        model.fit(X_train, y_log_train)
    elif model_cfg.family == "neural":
        model = create_model(model_name, best_params)
        X_arr = np.asarray(X_train)
        split_pt = int(len(X_arr) * 0.85)
        model.fit(
            X_arr[:split_pt], y_log_train[:split_pt],
            eval_set=(X_arr[split_pt:], y_log_train[split_pt:]),
        )
    else:
        model = create_model(model_name, best_params)
        model.fit(X_train, y_log_train)

    return model, encoder, feature_names


def promote_ensemble_champion(
    ensemble_config: list[dict],
    output_dir: Path | None = None,
) -> Path:
    """Retrain base models, build stacking meta-learner, export to production.

    ensemble_config: list of dicts with keys: model_name, feature_set, best_params
    Uses Ridge stacking (same as tournament Round 5) instead of weighted avg.
    """
    from sklearn.linear_model import Ridge
    from sklearn.model_selection import TimeSeriesSplit

    init_mlflow()

    if output_dir is None:
        ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        output_dir = ARTIFACTS_DIR / ts
    output_dir.mkdir(parents=True, exist_ok=True)

    # Load data once
    schema_cfg = load_config()
    df = load_and_prepare(schema_cfg)
    train_df, test_df = chrono_split(df, schema_cfg["train_test"]["test_fraction"])
    y_train_raw = train_df[DURATION_COL].values.copy()
    y_test_raw = test_df[DURATION_COL].values.copy()
    y_log_train = np.log1p(y_train_raw)
    y_log_test = np.log1p(y_test_raw)

    members = []
    all_encoders = []
    train_oof_preds = []  # OOF predictions for stacking

    for i, cfg in enumerate(ensemble_config):
        model_name = cfg["model_name"]
        feature_set = cfg["feature_set"]
        best_params = cfg["best_params"]

        log.info("Retraining member %d/%d: %s on %s", i + 1, len(ensemble_config), model_name, feature_set)

        # Build features
        X_train, X_test, encoder = build_features(feature_set, train_df, test_df, y_train_raw)
        feature_names = list(X_train.columns)
        all_encoders.append(encoder)

        # Generate OOF predictions via TimeSeriesSplit (same as tournament)
        tscv = TimeSeriesSplit(n_splits=5)
        oof = np.full(len(X_train), np.nan)

        for tr_idx, va_idx in tscv.split(X_train):
            fold_model = _create_base_model(model_name, best_params)
            fold_model.fit(X_train.iloc[tr_idx], y_log_train[tr_idx])
            oof[va_idx] = fold_model.predict(X_train.iloc[va_idx])

        train_oof_preds.append(oof)
        log.info("  OOF log_rmse: %.4f", float(np.sqrt(np.nanmean((oof[~np.isnan(oof)] - y_log_train[~np.isnan(oof)]) ** 2))))

        # Train final model on full training data
        final_model = _create_base_model(model_name, best_params)
        final_model.fit(X_train, y_log_train)
        members.append((final_model, feature_set, feature_names))

    # Build stacking meta-learner on OOF predictions
    oof_matrix = np.column_stack(train_oof_preds)
    valid = ~np.any(np.isnan(oof_matrix), axis=1)
    oof_valid = oof_matrix[valid]
    y_valid = y_log_train[valid]

    meta_model = Ridge(alpha=1.0)
    meta_model.fit(oof_valid, y_valid)

    # Stacking OOF score (cross-validated)
    tscv_meta = TimeSeriesSplit(n_splits=3)
    stacking_oof = np.full(len(y_valid), np.nan)
    for tr_idx, va_idx in tscv_meta.split(oof_valid):
        fold_meta = Ridge(alpha=1.0)
        fold_meta.fit(oof_valid[tr_idx], y_valid[tr_idx])
        stacking_oof[va_idx] = fold_meta.predict(oof_valid[va_idx])
    stacking_valid = ~np.isnan(stacking_oof)
    oof_log_rmse = float(np.sqrt(np.mean((stacking_oof[stacking_valid] - y_valid[stacking_valid]) ** 2)))
    log.info("Stacking OOF log_rmse: %.4f", oof_log_rmse)

    # Build champion
    ensemble = StackingChampion(members, meta_model)

    # Validate on test set
    X_test_base = all_encoders[0].transform(test_df)
    all_feat_cols = set()
    for _, _, feat_names in members:
        all_feat_cols.update(feat_names)
    for col in all_feat_cols:
        if col not in X_test_base.columns:
            X_test_base[col] = 0

    pred_log_test = ensemble.predict(X_test_base)
    pred_mins_test = np.expm1(pred_log_test)
    test_log_rmse = float(np.sqrt(np.mean((pred_log_test - y_log_test) ** 2)))
    test_mae = float(np.mean(np.abs(pred_mins_test - y_test_raw)))
    log.info("Stacking test log_rmse=%.4f, MAE=%.2f", test_log_rmse, test_mae)

    meta_weights = meta_model.coef_.tolist()
    log.info("Ridge meta-learner weights: %s", [f"{w:.3f}" for w in meta_weights])

    # Save artifacts
    try:
        import cloudpickle
        _dump = cloudpickle.dump
    except ImportError:
        _dump = pickle.dump
    with open(output_dir / "champion_model.pkl", "wb") as f:
        _dump(ensemble, f)

    with open(output_dir / "encoders.pkl", "wb") as f:
        pickle.dump(all_encoders[0], f)

    all_feature_names = list(all_feat_cols)
    with open(output_dir / "feature_names.json", "w") as f:
        json.dump(all_feature_names, f)

    with open(output_dir / "model_meta.json", "w") as f:
        json.dump({
            "model_type": "stacking_ridge",
            "members": [
                {"model_name": cfg["model_name"], "feature_set": cfg["feature_set"]}
                for cfg in ensemble_config
            ],
            "meta_weights": meta_weights,
            "oof_log_rmse": oof_log_rmse,
            "test_log_rmse": test_log_rmse,
            "test_mae": test_mae,
        }, f, indent=2)

    # Linear mapping: log_rmse 0→0.95, log_rmse 2→0.30
    confidence_base = max(0.3, min(0.95, 0.95 - 0.325 * oof_log_rmse))
    with open(output_dir / "confidence.json", "w") as f:
        json.dump({
            "base_confidence": round(confidence_base, 4),
            "residual_std": round(test_mae, 2),
            "champion_model": "stacking_ridge",
            "champion_members": [cfg["model_name"] for cfg in ensemble_config],
        }, f, indent=2)

    with open(output_dir / "metrics.json", "w") as f:
        json.dump({
            "oof_log_rmse": oof_log_rmse,
            "test_log_rmse": test_log_rmse,
            "test_mae": test_mae,
            "meta_weights": meta_weights,
        }, f, indent=2)

    log.info("Stacking champion exported to %s", output_dir)
    return output_dir


def _create_base_model(model_name: str, params: dict):
    """Create a proper model instance (handles catboost/lightgbm specially)."""
    if model_name == "catboost":
        from catboost import CatBoostRegressor
        cat_params = {**params, "verbose": 0, "random_seed": 42}
        cat_params.pop("early_stopping_rounds", None)
        return CatBoostRegressor(**cat_params)
    elif model_name == "lightgbm":
        import lightgbm as lgb
        lgb_params = {**params, "verbose": -1, "random_state": 42, "n_jobs": -1}
        return lgb.LGBMRegressor(**lgb_params)
    else:
        return create_model(model_name, params)


def promote_champion(run_id: str, model_name: str = MODEL_REGISTRY_NAME) -> str:
    """Register a model from an MLflow run and transition to Staging.

    Returns the model version string.
    """
    init_mlflow()
    client = get_client()

    run = client.get_run(run_id)
    model_uri = f"runs:/{run_id}/model"

    result = mlflow.register_model(model_uri, model_name)
    version = result.version
    log.info("Registered model %s version %s from run %s", model_name, version, run_id)

    client.transition_model_version_stage(
        name=model_name, version=version, stage="Staging",
    )
    log.info("Transitioned %s v%s to Staging", model_name, version)

    return str(version)


def promote_to_production(model_name: str = MODEL_REGISTRY_NAME, version: int = None):
    """Promote a model version to Production, archiving any current Production model."""
    init_mlflow()
    client = get_client()

    if version is None:
        versions = client.get_latest_versions(model_name, stages=["Staging"])
        if not versions:
            raise ValueError(f"No Staging version found for {model_name}")
        version = int(versions[0].version)

    prod_versions = client.get_latest_versions(model_name, stages=["Production"])
    for pv in prod_versions:
        client.transition_model_version_stage(
            name=model_name, version=pv.version, stage="Archived",
        )
        log.info("Archived %s v%s (was Production)", model_name, pv.version)

    client.transition_model_version_stage(
        name=model_name, version=version, stage="Production",
    )
    log.info("Promoted %s v%s to Production", model_name, version)


def export_champion_artifacts(run_id: str, output_dir: Path | None = None) -> Path:
    """Download single champion model from MLflow and write to artifacts/.

    For LightGBM/CatBoost: writes native format files.
    For other models: writes champion_model.pkl + model_meta.json.
    """
    init_mlflow()
    client = get_client()

    if output_dir is None:
        ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        output_dir = ARTIFACTS_DIR / ts
    output_dir.mkdir(parents=True, exist_ok=True)

    run = client.get_run(run_id)
    model_name = run.data.params.get("model_name", "unknown")
    model_family = run.data.params.get("model_family", "unknown")

    log.info("Exporting champion artifacts for %s (%s) to %s", model_name, model_family, output_dir)

    try:
        model_dir = client.download_artifacts(run_id, "model")
        model_path = Path(model_dir)

        if model_name == "lightgbm":
            import lightgbm as lgb
            loaded = mlflow.lightgbm.load_model(f"runs:/{run_id}/model")
            loaded.save_model(str(output_dir / "lgb_model_0.txt"))
        elif model_name == "catboost":
            loaded = mlflow.catboost.load_model(f"runs:/{run_id}/model")
            loaded.save_model(str(output_dir / "cat_model.cbm"))
        else:
            try:
                loaded = mlflow.sklearn.load_model(f"runs:/{run_id}/model")
            except Exception:
                pkl_files = list(model_path.glob("*.pkl"))
                if pkl_files:
                    with open(pkl_files[0], "rb") as f:
                        loaded = pickle.load(f)
                else:
                    raise

            with open(output_dir / "champion_model.pkl", "wb") as f:
                pickle.dump(loaded, f)

            with open(output_dir / "model_meta.json", "w") as f:
                json.dump({
                    "model_name": model_name,
                    "model_family": model_family,
                    "run_id": run_id,
                    "model_type": "generic",
                }, f, indent=2)

    except Exception as e:
        log.error("Failed to export model: %s", e)
        raise

    try:
        enc_dir = client.download_artifacts(run_id, "encoder")
        enc_path = Path(enc_dir)
        pkl_files = list(enc_path.glob("*.pkl"))
        if pkl_files:
            import shutil
            shutil.copy(pkl_files[0], output_dir / "encoders.pkl")
    except Exception as e:
        log.warning("Could not export encoder: %s", e)

    try:
        config_dir = client.download_artifacts(run_id, "config")
        config_path = Path(config_dir)
        fn_files = list(config_path.glob("*feature_names*"))
        if fn_files:
            import shutil
            shutil.copy(fn_files[0], output_dir / "feature_names.json")
    except Exception as e:
        log.warning("Could not export feature names: %s", e)

    metrics = run.data.metrics
    confidence_base = max(0.3, min(0.95, 0.95 - 0.325 * metrics.get("test_log_rmse", 1.0)))
    with open(output_dir / "confidence.json", "w") as f:
        json.dump({
            "base_confidence": round(confidence_base, 4),
            "residual_std": round(metrics.get("test_rmse", 100), 2),
            "blend_weight": 1.0,
            "n_lgb_seeds": 1,
            "champion_run_id": run_id,
            "champion_model": model_name,
        }, f, indent=2)

    with open(output_dir / "metrics.json", "w") as f:
        json.dump(dict(metrics), f, indent=2)

    log.info("Champion artifacts exported to %s", output_dir)
    return output_dir
