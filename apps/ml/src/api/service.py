from ..predict import Predictor
from .schemas import PredictRequest


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
    }
    return predictor.predict(event)
