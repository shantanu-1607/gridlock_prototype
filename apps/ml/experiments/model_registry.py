"""Model factory with Optuna search spaces.

Tournament champion: stacking ensemble of catboost + random_forest + extra_trees.
Only winning models are kept in the registry.
"""

from dataclasses import dataclass, field
from typing import Callable

import numpy as np

from src.logger import get_logger

log = get_logger("gridlock.experiments.models")


@dataclass
class ModelConfig:
    name: str
    family: str  # "tree"
    create_fn: Callable  # (params) -> model instance
    default_params: dict = field(default_factory=dict)
    optuna_space: Callable | None = None  # (trial) -> params dict
    supports_early_stopping: bool = False
    mlflow_flavor: str = "sklearn"  # "sklearn", "catboost"


# ---------------------------------------------------------------------------
# Winning models (Tournament 3 champion ensemble members)
# ---------------------------------------------------------------------------

def _create_random_forest(params):
    from sklearn.ensemble import RandomForestRegressor
    return RandomForestRegressor(random_state=42, n_jobs=-1, **params)


def _suggest_random_forest(trial):
    return {
        "n_estimators": trial.suggest_int("n_estimators", 100, 1000, step=100),
        "max_depth": trial.suggest_int("max_depth", 5, 30),
        "min_samples_split": trial.suggest_int("min_samples_split", 2, 20),
        "min_samples_leaf": trial.suggest_int("min_samples_leaf", 1, 10),
        "max_features": trial.suggest_categorical("max_features", ["sqrt", "log2", 0.5, 0.8]),
    }


def _create_extra_trees(params):
    from sklearn.ensemble import ExtraTreesRegressor
    return ExtraTreesRegressor(random_state=42, n_jobs=-1, **params)


def _suggest_extra_trees(trial):
    return {
        "n_estimators": trial.suggest_int("n_estimators", 100, 1000, step=100),
        "max_depth": trial.suggest_int("max_depth", 5, 30),
        "min_samples_split": trial.suggest_int("min_samples_split", 2, 20),
        "min_samples_leaf": trial.suggest_int("min_samples_leaf", 1, 10),
        "max_features": trial.suggest_categorical("max_features", ["sqrt", "log2", 0.5, 0.8]),
    }


def _create_catboost(params):
    """Returns params dict — CatBoost is instantiated directly in training code."""
    return params


def _suggest_catboost(trial):
    return {
        "depth": trial.suggest_int("depth", 3, 10),
        "learning_rate": trial.suggest_float("learning_rate", 0.005, 0.3, log=True),
        "l2_leaf_reg": trial.suggest_float("l2_leaf_reg", 1, 30),
        "min_data_in_leaf": trial.suggest_int("min_data_in_leaf", 3, 50),
        "random_strength": trial.suggest_float("random_strength", 0.05, 2.0),
        "bagging_temperature": trial.suggest_float("bagging_temperature", 0.0, 1.5),
        "iterations": 2000,
        "early_stopping_rounds": 50,
    }


# ---------------------------------------------------------------------------
# Registry
# ---------------------------------------------------------------------------

MODEL_REGISTRY: dict[str, ModelConfig] = {
    "random_forest": ModelConfig("random_forest", "tree", _create_random_forest, {"n_estimators": 500, "max_depth": 15}, _suggest_random_forest),
    "extra_trees": ModelConfig("extra_trees", "tree", _create_extra_trees, {"n_estimators": 500, "max_depth": 15}, _suggest_extra_trees),
    "catboost": ModelConfig("catboost", "tree", _create_catboost, {"depth": 6, "learning_rate": 0.05, "iterations": 2000, "early_stopping_rounds": 50}, _suggest_catboost, supports_early_stopping=True, mlflow_flavor="catboost"),
}


def create_model(name: str, params: dict | None = None):
    """Create a model instance from the registry."""
    cfg = MODEL_REGISTRY[name]
    p = {**cfg.default_params, **(params or {})}
    return cfg.create_fn(p)


def suggest_params(name: str, trial) -> dict:
    """Suggest hyperparameters via Optuna for the given model."""
    cfg = MODEL_REGISTRY[name]
    if cfg.optuna_space is None:
        return cfg.default_params.copy()
    return cfg.optuna_space(trial)


def get_model_config(name: str) -> ModelConfig:
    """Get the ModelConfig for a given model name."""
    return MODEL_REGISTRY[name]


def list_models(family: str | None = None) -> list[str]:
    """List available model names, optionally filtered by family."""
    if family is None:
        return list(MODEL_REGISTRY.keys())
    return [k for k, v in MODEL_REGISTRY.items() if v.family == family]
