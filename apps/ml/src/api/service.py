from ..predict import Predictor
from .schemas import PredictRequest, AccuracyRequest


def run_prediction(predictor: Predictor, req: PredictRequest) -> dict:
    event = {
        "start_datetime": req.start_datetime,
        "latitude": req.latitude,
        "longitude": req.longitude,
        "event_cause": req.event_cause,
        "corridor": req.corridor,
        "priority": req.priority,
        "requires_road_closure": req.requires_road_closure,
        "event_type": req.event_type,
        "veh_type": req.veh_type or "",
        "police_station": req.police_station,
        "zone": req.zone,
    }
    return predictor.predict(event)


def compute_accuracy(req: AccuracyRequest) -> dict:
    pred_dur = req.predicted_duration_mins
    actual_dur = req.actual_duration_mins

    metrics = []

    dur_delta = ((pred_dur - actual_dur) / actual_dur * 100) if actual_dur > 0 else 0.0
    metrics.append({
        "metric": "duration_mins",
        "predicted": round(pred_dur, 1),
        "actual": round(actual_dur, 1),
        "delta_pct": round(dur_delta, 1),
    })

    if req.actual_severity_score is not None and req.predicted_severity_score > 0:
        sev_delta = (
            (req.predicted_severity_score - req.actual_severity_score)
            / req.actual_severity_score * 100
        ) if req.actual_severity_score > 0 else 0.0
        metrics.append({
            "metric": "severity_score",
            "predicted": round(req.predicted_severity_score, 4),
            "actual": round(req.actual_severity_score, 4),
            "delta_pct": round(sev_delta, 1),
        })

    mape_values = [abs(m["delta_pct"]) for m in metrics]
    accuracy = max(0.0, round(1.0 - sum(mape_values) / len(mape_values) / 100.0, 4))

    direction = "overestimated" if dur_delta > 0 else "underestimated"
    abs_delta = abs(round(dur_delta, 1))
    parts = [
        f"Duration was {direction} by {abs_delta}%"
        f" (predicted {pred_dur:.0f} min vs actual {actual_dur:.0f} min)."
    ]
    if req.event_cause:
        parts.append(f"Event cause: {req.event_cause}.")
    if req.corridor:
        parts.append(f"Corridor: {req.corridor}.")

    return {
        "event_id": req.event_id,
        "accuracy_score": accuracy,
        "metrics": metrics,
        "summary": " ".join(parts),
    }
