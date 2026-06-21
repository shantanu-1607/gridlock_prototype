"""Serializable feature pipeline for inference parity.

The tournament/champion members are trained on engineered feature sets (F4 K-fold
target encoding, F5 PCA + interactions) produced by
``experiments.feature_registry.build_features``. Those transforms fit state
(``category_encoders`` TargetEncoders, sklearn PCA/KMeans) into a *module-level*
``_fitted_state`` that was never serialized. As a result, serving previously fed the
champion only the base ``Encoders`` columns and zero-filled every engineered feature
(~31% of the champion's inputs), so deployed predictions did not match training.

``FeaturePipeline`` captures and persists that fitted state so ``predict.py`` can
reproduce the exact training-time feature matrix at inference. It deliberately reuses
the existing transform functions (no logic duplication) by snapshotting and restoring
``feature_registry._fitted_state`` under a lock.
"""

import copy
import threading

import numpy as np
import pandas as pd

from .features import Encoders
from .logger import get_logger

log = get_logger("gridlock.feature_pipeline")

# Guards the module-level _fitted_state in feature_registry while we restore a
# per-feature-set snapshot and run its transforms (serving may be multi-threaded).
_REGISTRY_LOCK = threading.Lock()


class FeaturePipeline:
    """Fits and persists the base encoder + per-feature-set engineered transforms.

    ``transform`` returns the union of all engineered columns across the requested
    feature sets, matching what the champion/regime members saw during training.
    """

    def __init__(self, feature_sets: list[str]):
        self.feature_sets = list(dict.fromkeys(feature_sets))  # dedupe, keep order
        self.base_encoder: Encoders | None = None
        self._states: dict[str, dict] = {}  # feature_set -> deepcopy of _fitted_state

    def fit(self, train_df: pd.DataFrame, y_train_raw: np.ndarray) -> "FeaturePipeline":
        from experiments import feature_registry as fr

        self.base_encoder = Encoders()
        self.base_encoder.fit(
            train_df, y_duration=pd.Series(y_train_raw, index=train_df.index)
        )

        with _REGISTRY_LOCK:
            for fs in self.feature_sets:
                fr._fitted_state = {}
                X = self.base_encoder.transform(train_df)
                for fn in fr.FEATURE_SETS[fs].extra_transforms:
                    X = fn(train_df, X, y_train_raw, is_train=True)
                self._states[fs] = copy.deepcopy(fr._fitted_state)
        log.info("FeaturePipeline fitted on %d feature sets: %s",
                 len(self.feature_sets), self.feature_sets)
        return self

    def transform(self, df: pd.DataFrame) -> pd.DataFrame:
        if self.base_encoder is None:
            raise RuntimeError("FeaturePipeline.transform called before fit/load")

        from experiments import feature_registry as fr

        out = self.base_encoder.transform(df)
        with _REGISTRY_LOCK:
            for fs in self.feature_sets:
                fr._fitted_state = copy.deepcopy(self._states[fs])
                # Each feature set is built from a *fresh* base transform (matches
                # build_features, where transforms operate on the base matrix only).
                X = self.base_encoder.transform(df)
                for fn in fr.FEATURE_SETS[fs].extra_transforms:
                    X = fn(df, X, None, is_train=False)
                for col in X.columns:
                    if col not in out.columns:
                        out[col] = X[col].values
        return out.replace([np.inf, -np.inf], np.nan).fillna(0)
