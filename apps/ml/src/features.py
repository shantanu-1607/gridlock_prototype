from dataclasses import dataclass, field

import numpy as np
import pandas as pd

from .constants import (
    CATEGORICAL_COLS,
    CAUSE_SEVERITY,
    DEFAULT_VEHICLE_WEIGHT,
    DURATION_COL,
    MISSING_TOKEN,
    SEVERITY_WEIGHTS,
    TARGET_ENC_COLS,
    VEHICLE_CAUSES,
    VEHICLE_WEIGHTS,
)
from .logger import get_logger

log = get_logger("gridlock.features")


@dataclass
class Encoders:
    cat_maps: dict = field(default_factory=dict)
    freq_maps: dict = field(default_factory=dict)
    target_enc_maps: dict = field(default_factory=dict)

    @staticmethod
    def _clean_cat(series: pd.Series) -> pd.Series:
        s = series.fillna(MISSING_TOKEN).astype(str).str.strip().str.lower()
        s = s.replace({"nan": MISSING_TOKEN, "null": MISSING_TOKEN, "": MISSING_TOKEN})
        return s

    def fit(self, df: pd.DataFrame, y_duration: pd.Series | None = None):
        for col in CATEGORICAL_COLS:
            if col not in df.columns:
                continue
            s = self._clean_cat(df[col])
            cats = sorted(s.unique())
            self.cat_maps[col] = {c: i for i, c in enumerate(cats)}
            freq = s.value_counts(normalize=True).to_dict()
            self.freq_maps[col] = freq

        if y_duration is not None:
            for col in TARGET_ENC_COLS:
                if col not in df.columns:
                    continue
                s = self._clean_cat(df[col])
                medians = pd.Series(y_duration.values, index=s.values).groupby(level=0).median().to_dict()
                self.target_enc_maps[col] = medians
        return self

    def transform(self, df: pd.DataFrame) -> pd.DataFrame:
        out = pd.DataFrame(index=df.index)

        start_dt = pd.to_datetime(df["start_datetime"], errors="coerce", utc=True)
        hour = start_dt.dt.hour.fillna(12).astype(float)
        dow = start_dt.dt.dayofweek.fillna(0).astype(float)
        out["hour_of_day"] = hour.astype(int)
        out["day_of_week"] = dow.astype(int)
        out["is_weekend"] = (out["day_of_week"] >= 5).astype(int)
        out["is_rush_hour"] = out["hour_of_day"].isin([8, 9, 10, 17, 18, 19]).astype(int)

        # Cyclical time encoding (from Flipkart solution)
        out["hour_sin"] = np.sin(2 * np.pi * hour / 24)
        out["hour_cos"] = np.cos(2 * np.pi * hour / 24)
        out["dow_sin"] = np.sin(2 * np.pi * dow / 7)
        out["dow_cos"] = np.cos(2 * np.pi * dow / 7)

        # Geo coordinates
        out["latitude"] = pd.to_numeric(df.get("latitude"), errors="coerce").fillna(0.0)
        out["longitude"] = pd.to_numeric(df.get("longitude"), errors="coerce").fillna(0.0)
        out["lat_lon_interaction"] = out["latitude"] * out["longitude"]

        out["priority_bin"] = (
            df["priority"].astype(str).str.strip().str.lower().map({"high": 1}).fillna(0).astype(int)
        )
        out["requires_road_closure"] = (
            df["requires_road_closure"]
            .astype(str).str.strip().str.upper()
            .map({"TRUE": 1}).fillna(0).astype(int)
        )

        for col in CATEGORICAL_COLS:
            if col in df.columns:
                s = self._clean_cat(df[col])
            else:
                s = pd.Series(MISSING_TOKEN, index=df.index)
            cat_map = self.cat_maps.get(col, {})
            default_cat = max(cat_map.values(), default=0) + 1
            out[f"{col}_enc"] = s.map(cat_map).fillna(default_cat).astype(int)

            freq_map = self.freq_maps.get(col, {})
            out[f"{col}_freq"] = s.map(freq_map).fillna(0.0).astype(float)

        for col in TARGET_ENC_COLS:
            mapping = self.target_enc_maps.get(col, {})
            if col in df.columns:
                s = self._clean_cat(df[col])
            else:
                s = pd.Series(MISSING_TOKEN, index=df.index)
            global_med = float(np.median(list(mapping.values()))) if mapping else 0.0
            out[f"{col}_target_enc"] = s.map(mapping).fillna(global_med).astype(float)

        out["event_type_bin"] = (
            df["event_type"].astype(str).str.strip().str.lower().map({"planned": 1}).fillna(0).astype(int)
        )
        out["is_non_corridor"] = (
            df["corridor"].astype(str).str.strip().str.lower().eq("non-corridor").astype(int)
        )

        # Interaction: cause × hour bucket (captures time-dependent cause patterns)
        hour_bucket = (out["hour_of_day"] // 6).astype(int)  # 0-3 for 4 time-of-day buckets
        cause_enc = out.get("event_cause_enc", pd.Series(0, index=df.index))
        out["cause_hour_interaction"] = cause_enc * 4 + hour_bucket

        # Interaction: cause × zone
        zone_enc = out.get("zone_enc", pd.Series(0, index=df.index))
        out["cause_zone_interaction"] = cause_enc * 100 + zone_enc

        return out


def engineer_severity(df: pd.DataFrame, predicted_duration: pd.Series | None = None) -> pd.Series:
    w = SEVERITY_WEIGHTS

    road = (
        df["requires_road_closure"]
        .astype(str).str.strip().str.upper()
        .map({"TRUE": 1.0}).fillna(0.0)
    )
    priority = (
        df["priority"].astype(str).str.strip().str.lower()
        .map({"high": 1.0}).fillna(0.0)
    )

    cause = df["event_cause"].astype(str).str.strip().str.lower()
    cause_score = cause.map(CAUSE_SEVERITY).fillna(0.32)

    is_veh = cause.isin(VEHICLE_CAUSES)
    veh_weight = (
        df["veh_type"].astype(str).str.strip().str.lower()
        .map(VEHICLE_WEIGHTS).fillna(DEFAULT_VEHICLE_WEIGHT)
    )
    blended = np.where(is_veh, 0.7 * cause_score + 0.3 * veh_weight, cause_score)

    if predicted_duration is not None:
        dur_norm = predicted_duration.clip(0, 1440) / 1440.0
    elif DURATION_COL in df.columns:
        dur_norm = df[DURATION_COL].clip(0, 1440) / 1440.0
    else:
        dur_norm = 0.5

    severity = (
        w["road_closure"] * road
        + w["priority"] * priority
        + w["cause_vehicle"] * blended
        + w["duration"] * dur_norm
    )
    return severity.clip(0, 1)
