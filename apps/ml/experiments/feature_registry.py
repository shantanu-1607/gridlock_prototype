"""Feature set definitions F1-F6.

Each feature set builds on the baseline Encoders from src/features.py,
adding extra transforms. build_features() is the main entry point.
"""

from dataclasses import dataclass, field
from typing import Callable

import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.decomposition import PCA

from src.constants import CATEGORICAL_COLS, TARGET_ENC_COLS
from src.features import Encoders
from src.logger import get_logger

log = get_logger("gridlock.experiments.features")

# Bangalore city center coordinates
BANGALORE_LAT = 12.9716
BANGALORE_LON = 77.5946


def _haversine_km(lat1, lon1, lat2, lon2):
    """Vectorized haversine distance in km."""
    R = 6371.0
    lat1, lon1, lat2, lon2 = map(np.radians, [lat1, lon1, lat2, lon2])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = np.sin(dlat / 2) ** 2 + np.cos(lat1) * np.cos(lat2) * np.sin(dlon / 2) ** 2
    return R * 2 * np.arcsin(np.sqrt(a))


# ---------------------------------------------------------------------------
# Extra transform functions: (df_raw, X_features, y_train_raw, is_train) -> X
# df_raw   = original dataframe with raw columns
# X        = feature matrix from base Encoders.transform()
# y_raw    = raw duration target (only available during training)
# is_train = True if fitting, False if transforming test
# Returns the modified X with extra columns added
# ---------------------------------------------------------------------------

# Shared state for transforms that need fitting (KMeans, PCA, etc.)
_fitted_state = {}


def _add_temporal_deep(df_raw, X, y_raw, is_train):
    """F2: Temporal deep-dive features."""
    start_dt = pd.to_datetime(df_raw["start_datetime"], errors="coerce", utc=True)
    X["month"] = start_dt.dt.month.fillna(1).astype(int)
    X["quarter"] = start_dt.dt.quarter.fillna(1).astype(int)
    X["minutes_since_midnight"] = (
        start_dt.dt.hour * 60 + start_dt.dt.minute
    ).fillna(720).astype(float)

    # Time bucket: 0=early_morning(0-5), 1=morning(6-11), 2=afternoon(12-16),
    # 3=evening(17-20), 4=night(21-23)
    hour = start_dt.dt.hour.fillna(12).astype(int)
    X["time_bucket"] = pd.cut(
        hour, bins=[-1, 5, 11, 16, 20, 24], labels=[0, 1, 2, 3, 4]
    ).astype(int)

    # Days since first event in dataset (trend feature)
    min_date = start_dt.min()
    X["days_since_first_event"] = (
        (start_dt - min_date).dt.total_seconds() / 86400
    ).fillna(0).astype(float)

    # Indian public holidays (approximate — major ones)
    month_day = start_dt.dt.month * 100 + start_dt.dt.day
    holiday_dates = {
        126, 815, 1002, 1115, 1225,  # Republic Day, Independence Day, Gandhi Jayanti, Diwali approx, Christmas
        101, 312, 501, 1031,  # New Year, Holi approx, May Day, Halloween
    }
    X["is_holiday"] = month_day.isin(holiday_dates).astype(int)

    return X


def _add_geospatial(df_raw, X, y_raw, is_train):
    """F3: Geospatial enhancement features."""
    lat = pd.to_numeric(df_raw.get("latitude"), errors="coerce").fillna(0.0).values
    lon = pd.to_numeric(df_raw.get("longitude"), errors="coerce").fillna(0.0).values

    # Distance to city center
    X["distance_to_city_center"] = _haversine_km(lat, lon, BANGALORE_LAT, BANGALORE_LON)

    # Geohash approximation (5-char precision ≈ 4.9km x 4.9km)
    # Simple integer encoding based on lat/lon grid
    lat_bin = ((lat - 12.8) * 100).astype(int).clip(0, 50)
    lon_bin = ((lon - 77.4) * 100).astype(int).clip(0, 50)
    X["geohash_5"] = lat_bin * 51 + lon_bin

    # KMeans geo clusters
    coords = np.column_stack([lat, lon])
    valid_mask = (lat != 0) & (lon != 0)

    if is_train:
        km = KMeans(n_clusters=20, random_state=42, n_init=10)
        km.fit(coords[valid_mask])
        _fitted_state["geo_kmeans"] = km
    else:
        km = _fitted_state.get("geo_kmeans")

    if km is not None:
        labels = np.full(len(lat), -1)
        if valid_mask.any():
            labels[valid_mask] = km.predict(coords[valid_mask])
        X["geo_cluster_k20"] = labels
    else:
        X["geo_cluster_k20"] = 0

    return X


def _add_advanced_encodings(df_raw, X, y_raw, is_train):
    """F4: Advanced categorical encodings (smoothed mean target encoding, WOE).

    NOTE: column names are kept as ``{col}_kfold_target`` for backward compatibility with
    the deployed champion's feature_names, but the encoder is category_encoders'
    smoothed mean target encoder — NOT an out-of-fold/K-fold scheme.
    """
    try:
        from category_encoders import TargetEncoder, WOEEncoder
    except ImportError:
        log.warning("category_encoders not installed, skipping F4")
        return X

    for col in TARGET_ENC_COLS:
        if col not in df_raw.columns:
            continue
        s = df_raw[col].fillna("__MISSING__").astype(str).str.strip().str.lower()

        if is_train and y_raw is not None:
            y_log = np.log1p(y_raw)
            # Smoothed mean target encoding, fit on TRAIN only; at inference the test set
            # uses this train-fit mapping (no test leakage). It is NOT out-of-fold, so it
            # carries mild in-sample leakage that can widen the train/test gap — the
            # chronological held-out metrics remain the honest measure.
            te = TargetEncoder(cols=[col], smoothing=10)
            encoded = te.fit_transform(s.to_frame(col), y_log)
            _fitted_state[f"te_{col}"] = te
            X[f"{col}_kfold_target"] = encoded[col].values
        else:
            te = _fitted_state.get(f"te_{col}")
            if te is not None:
                encoded = te.transform(s.to_frame(col))
                X[f"{col}_kfold_target"] = encoded[col].values

    return X


def _add_interactions(df_raw, X, y_raw, is_train):
    """F5: Interaction and polynomial features."""
    # Interaction terms
    cause_enc = X.get("event_cause_enc", pd.Series(0, index=X.index))
    corridor_enc = X.get("corridor_enc", pd.Series(0, index=X.index))
    zone_enc = X.get("zone_enc", pd.Series(0, index=X.index))
    hour = X.get("hour_of_day", pd.Series(12, index=X.index))
    priority = X.get("priority_bin", pd.Series(0, index=X.index))
    closure = X.get("requires_road_closure", pd.Series(0, index=X.index))

    X["cause_x_corridor"] = cause_enc * 100 + corridor_enc
    X["hour_x_zone"] = hour * 10 + zone_enc
    X["priority_x_closure"] = priority * 2 + closure

    # 2nd-degree polynomial on (lat, lon, hour)
    lat = X.get("latitude", pd.Series(0, index=X.index))
    lon = X.get("longitude", pd.Series(0, index=X.index))
    X["lat_squared"] = lat ** 2
    X["lon_squared"] = lon ** 2
    X["hour_squared"] = hour.astype(float) ** 2

    # PCA on all numeric features (top 5 components)
    numeric_cols = X.select_dtypes(include=[np.number]).columns.tolist()
    if len(numeric_cols) >= 5:
        vals = X[numeric_cols].fillna(0).values
        if is_train:
            pca = PCA(n_components=5, random_state=42)
            components = pca.fit_transform(vals)
            _fitted_state["pca"] = pca
        else:
            pca = _fitted_state.get("pca")
            if pca is not None:
                components = pca.transform(vals)
            else:
                components = np.zeros((len(X), 5))

        for i in range(5):
            X[f"pca_{i}"] = components[:, i]

    return X


def _add_historical_lag(df_raw, X, y_raw, is_train):
    """F6: Historical/lag features computed from training data."""
    start_dt = pd.to_datetime(df_raw["start_datetime"], errors="coerce", utc=True)
    cause = df_raw["event_cause"].fillna("unknown").astype(str).str.strip().str.lower()
    zone = df_raw.get("zone", pd.Series("unknown", index=df_raw.index)).fillna("unknown").astype(str).str.strip().str.lower()

    if is_train and y_raw is not None:
        # Build lookup tables from training data
        train_data = pd.DataFrame({
            "start_dt": start_dt,
            "cause": cause,
            "zone": zone,
            "duration": y_raw,
        }).sort_values("start_dt")

        # Rolling mean duration (global, 7-day window approximation)
        # Use expanding mean as a proxy (avoids future leakage)
        rolling_dur = train_data["duration"].expanding().mean().values
        _fitted_state["global_rolling_mean"] = float(np.mean(y_raw))

        # Average duration per cause (expanding to avoid leakage)
        cause_means = train_data.groupby("cause")["duration"].expanding().mean()
        cause_means = cause_means.droplevel(0)

        # Average duration per zone (expanding)
        zone_means = train_data.groupby("zone")["duration"].expanding().mean()
        zone_means = zone_means.droplevel(0)

        X["rolling_mean_duration_7d"] = rolling_dur
        X["avg_duration_same_cause"] = cause_means.reindex(X.index).fillna(np.mean(y_raw)).values
        X["avg_duration_same_zone"] = zone_means.reindex(X.index).fillna(np.mean(y_raw)).values

        # Save aggregate stats for test-time transform
        _fitted_state["cause_duration_map"] = train_data.groupby("cause")["duration"].mean().to_dict()
        _fitted_state["zone_duration_map"] = train_data.groupby("zone")["duration"].mean().to_dict()

    else:
        # Test time: use aggregate stats from training
        global_mean = _fitted_state.get("global_rolling_mean", 60.0)
        cause_map = _fitted_state.get("cause_duration_map", {})
        zone_map = _fitted_state.get("zone_duration_map", {})

        X["rolling_mean_duration_7d"] = global_mean
        X["avg_duration_same_cause"] = cause.map(cause_map).fillna(global_mean).values
        X["avg_duration_same_zone"] = zone.map(zone_map).fillna(global_mean).values

    return X


# ---------------------------------------------------------------------------
# Feature Set Registry
# ---------------------------------------------------------------------------

@dataclass
class FeatureSet:
    name: str
    description: str
    extra_transforms: list[Callable] = field(default_factory=list)


FEATURE_SETS: dict[str, FeatureSet] = {
    "F1_baseline": FeatureSet(
        name="F1_baseline",
        description="Existing 24 features from Encoders.transform()",
        extra_transforms=[],
    ),
    "F2_temporal": FeatureSet(
        name="F2_temporal",
        description="Baseline + temporal deep-dive (month, quarter, time_bucket, holidays)",
        extra_transforms=[_add_temporal_deep],
    ),
    "F3_geospatial": FeatureSet(
        name="F3_geospatial",
        description="Baseline + geospatial (distance_to_center, geohash, KMeans clusters)",
        extra_transforms=[_add_geospatial],
    ),
    "F4_advanced_enc": FeatureSet(
        name="F4_advanced_enc",
        description="Baseline + smoothed mean target encoding, WOE encoding",
        extra_transforms=[_add_advanced_encodings],
    ),
    "F5_interactions": FeatureSet(
        name="F5_interactions",
        description="Baseline + interaction terms + polynomial + PCA",
        extra_transforms=[_add_interactions],
    ),
    "F6_historical": FeatureSet(
        name="F6_historical",
        description="Baseline + historical lag features (rolling means, cause/zone avgs)",
        extra_transforms=[_add_historical_lag],
    ),
}


def build_features(
    feature_set_name: str,
    train_df: pd.DataFrame,
    test_df: pd.DataFrame,
    y_train_raw: np.ndarray,
) -> tuple[pd.DataFrame, pd.DataFrame, Encoders]:
    """Build feature matrices for a given feature set.

    Returns (X_train, X_test, fitted_encoder).
    """
    global _fitted_state
    _fitted_state = {}  # Reset fitted state for each build

    fs = FEATURE_SETS[feature_set_name]

    # Fit base encoder on training data
    encoder = Encoders()
    encoder.fit(train_df, y_duration=pd.Series(y_train_raw, index=train_df.index))

    # Transform both sets
    X_train = encoder.transform(train_df)
    X_test = encoder.transform(test_df)

    # Apply extra transforms
    for transform_fn in fs.extra_transforms:
        X_train = transform_fn(train_df, X_train, y_train_raw, is_train=True)
        X_test = transform_fn(test_df, X_test, None, is_train=False)

    # Ensure no NaN/inf values
    X_train = X_train.replace([np.inf, -np.inf], np.nan).fillna(0)
    X_test = X_test.replace([np.inf, -np.inf], np.nan).fillna(0)

    log.info(
        "Feature set %s: %d train features, %d test features",
        feature_set_name, X_train.shape[1], X_test.shape[1],
    )

    return X_train, X_test, encoder
