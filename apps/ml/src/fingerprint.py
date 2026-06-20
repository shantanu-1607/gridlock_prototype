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


# Causes the controller may send that don't exist verbatim in the incident
# corpus — mapped to the closest analogue so fingerprinting still returns matches.
_CAUSE_FALLBACKS = {
    "concert": "others",
    "public_event": "others",
    "vip_movement": "procession",
    "debris": "others",
    "fog / low visibility": "others",
    "weather": "water_logging",
    "rain": "water_logging",
}


class Fingerprinter:
    def __init__(self, reference_path):
        self.ref = pd.read_parquet(reference_path)
        self.corpus_size = len(self.ref)
        log.info("Fingerprinter loaded %d reference events", self.corpus_size)

    def find_similar(self, lat, lon, event_cause, hour=None, k=5):
        """Backward-compatible wrapper returning just the match list."""
        results, _meta = self.find_similar_with_meta(lat, lon, event_cause, hour=hour, k=k)
        return results

    def find_similar_with_meta(self, lat, lon, event_cause, hour=None, k=5):
        """Return (matches, meta). `meta` carries the search context that lets the
        UI make an honest claim: how many real incidents were searched, which cause
        was actually matched (after fallback mapping), and whether the time-of-day
        window had to be relaxed to find any analogues."""
        df = self.ref.copy()

        cause_clean = str(event_cause).strip().lower()

        # Check if the event cause is supported in reference dataset. If not, map to a fallback.
        valid_causes = df["event_cause"].str.strip().str.lower().unique()
        if cause_clean not in valid_causes:
            mapped = _CAUSE_FALLBACKS.get(cause_clean, "others")
            log.info("Event cause '%s' not found in reference data. Mapping to '%s'.", event_cause, mapped)
            cause_clean = mapped

        meta = {
            "corpus_size": self.corpus_size,
            "n_candidates": 0,
            "cause_matched": cause_clean,
            "hour_window_relaxed": False,
        }

        df = df[df["event_cause"].str.strip().str.lower() == cause_clean]
        if len(df) == 0:
            return [], meta

        if hour is not None and "hour" in df.columns:
            h_delta = (df["hour"] - hour).abs()
            h_delta = h_delta.where(h_delta <= 12, 24 - h_delta)
            df_hour = df[h_delta <= 2]
            if len(df_hour) > 0:
                df = df_hour
            else:
                meta["hour_window_relaxed"] = True
                log.info("No similar events found within 2-hour window of hour=%s. Relaxing hour filter.", hour)

        meta["n_candidates"] = len(df)

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
                "similarity_score": round(float(similarity[idx]), 4),
            })

        return results, meta

    def aggregate(self, similar_events):
        if not similar_events:
            return None
        durations = [e["duration_mins"] for e in similar_events]
        return {
            "avg_duration_mins": round(float(np.mean(durations)), 1),
            "min_duration_mins": round(float(np.min(durations)), 1),
            "max_duration_mins": round(float(np.max(durations)), 1),
            "avg_severity_score": round(float(np.mean([e["severity_score"] for e in similar_events])), 4),
            "count": len(similar_events),
        }
