import numpy as np
import pandas as pd

from .logger import get_logger

log = get_logger("gridlock.fingerprint")

_EARTH_RADIUS_KM = 6371.0


def _haversine_km(lat1, lon1, lat2_arr, lon2_arr):
    lat1, lon1 = np.radians(lat1), np.radians(lon1)
    lat2, lon2 = np.radians(lat2_arr), np.radians(lon2_arr)
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = np.sin(dlat / 2) ** 2 + np.cos(lat1) * np.cos(lat2) * np.sin(dlon / 2) ** 2
    return 2 * _EARTH_RADIUS_KM * np.arcsin(np.sqrt(a))


class Fingerprinter:
    def __init__(self, reference_path):
        self.ref = pd.read_parquet(reference_path)
        log.info("Fingerprinter loaded %d reference events", len(self.ref))

    def find_similar(self, lat, lon, event_cause, hour=None, k=5):
        df = self.ref.copy()

        cause_clean = str(event_cause).strip().lower()
        df = df[df["event_cause"].str.strip().str.lower() == cause_clean]
        if len(df) == 0:
            return []

        if hour is not None and "hour" in df.columns:
            h_delta = (df["hour"] - hour).abs()
            h_delta = h_delta.where(h_delta <= 12, 24 - h_delta)
            df = df[h_delta <= 2]
            if len(df) == 0:
                return []

        dist = _haversine_km(lat, lon, df["latitude"].values, df["longitude"].values)

        dist_score = 1.0 / (dist + 0.1)
        max_ds = dist_score.max()
        dist_score = dist_score / max_ds if max_ds > 0 else dist_score

        hour_score = np.zeros(len(df))
        if hour is not None and "hour" in df.columns:
            hd = np.abs(df["hour"].values - hour)
            hd = np.minimum(hd, 24 - hd)
            hour_score = 1.0 - hd / 24.0

        cause_score = np.ones(len(df))

        similarity = 0.4 * dist_score + 0.3 * hour_score + 0.3 * cause_score
        order = np.argsort(-similarity)[:k]

        results = []
        for idx in order:
            row = df.iloc[idx]
            results.append({
                "event_id": str(row.get("event_id", "")),
                "event_cause": str(row.get("event_cause", "")),
                "corridor": str(row.get("corridor", "")),
                "hour": int(row.get("hour", 0)),
                "duration_mins": round(float(row.get("duration_mins", 0)), 1),
                "severity_score": round(float(row.get("severity_score", 0)), 4),
                "similarity_score": round(float(similarity[order[results.__len__() - len(results) + len(results) - 1]]), 4) if len(results) < len(order) else 0,
            })

        for i, idx in enumerate(order):
            results[i]["similarity_score"] = round(float(similarity[idx]), 4)

        return results

    def aggregate(self, similar_events):
        if not similar_events:
            return None
        return {
            "avg_duration_mins": round(np.mean([e["duration_mins"] for e in similar_events]), 1),
            "avg_severity_score": round(np.mean([e["severity_score"] for e in similar_events]), 4),
            "count": len(similar_events),
        }
