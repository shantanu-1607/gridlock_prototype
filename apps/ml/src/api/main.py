from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse

from ..logger import get_logger
from ..predict import Predictor, find_latest_artifacts
from ..queue_model import (
    compute_queue_metrics,
    compute_tandem_queue_metrics,
    recommend_deployment,
    recommend_gating,
)
from ..anomaly import compute_anomaly_score, load_corridor_baselines, train_corridor_baselines
from ..counterfactual import run_counterfactual_analysis
from ..active import update_active_prediction
from .schemas import (
    PredictRequest, PredictResponse,
    AccuracyRequest, AccuracyResponse,
    RepredictRequest, RepredictResponse,
    QueueAnalysisRequest, QueueAnalysisResponse,
    DeploymentRequest, DeploymentResponse,
    GatingRequest, GatingResponse,
    AnomalyRequest, AnomalyResponse,
    CounterfactualRequest, CounterfactualResponse,
)
from .service import run_prediction, compute_accuracy

log = get_logger("gridlock.api")

_predictor: Predictor | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _predictor
    artifacts = find_latest_artifacts()
    if artifacts is not None:
        _predictor = Predictor(artifacts)
    else:
        print("[ML API] No artifacts found — /predict will return 503 until training runs")
    yield
    _predictor = None


app = FastAPI(title="GridLock ML API", lifespan=lifespan)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    """Error boundary: log the traceback and return a clean 500 instead of leaking a
    stack trace, so a malformed/unexpected payload can never crash the service.
    (HTTPException and Pydantic 422 validation errors keep their own handlers.)"""
    log.exception("Unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "error": str(exc)},
    )


@app.get("/api/ml/health")
def health():
    return {
        "status": "ok",
        "model_loaded": _predictor is not None,
        "model_timestamp": _predictor.timestamp if _predictor else None,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@app.post("/api/ml/predict", response_model=PredictResponse)
def predict(req: PredictRequest):
    if _predictor is None:
        raise HTTPException(503, "Model not loaded. Run training first.")
    result = run_prediction(_predictor, req)
    return result


@app.post("/api/ml/repredict", response_model=RepredictResponse)
def repredict(req: RepredictRequest):
    """Re-estimate remaining duration for an active incident using elapsed time
    folded into the calibrated conformal interval (no model re-run)."""
    return update_active_prediction(
        original_total_mins=req.original_total_mins,
        elapsed_mins=req.elapsed_mins,
        interval_lower_mins=req.interval_lower_mins,
        interval_upper_mins=req.interval_upper_mins,
    )


@app.post("/api/ml/accuracy", response_model=AccuracyResponse)
def accuracy(req: AccuracyRequest):
    return compute_accuracy(req)


@app.post("/api/ml/queue-analysis", response_model=QueueAnalysisResponse)
def queue_analysis(req: QueueAnalysisRequest):
    """Compute M/M/c/K queueing metrics for an incident.

    Takes ML-predicted duration and corridor info, returns blocking probability,
    queue length, spillover time, and gridlock risk level.
    """
    result = compute_queue_metrics(
        predicted_duration_mins=req.predicted_duration_mins,
        corridor=req.corridor,
        event_cause=req.event_cause,
        hour=req.hour,
        requires_road_closure=req.requires_road_closure,
    )
    tandem = compute_tandem_queue_metrics(
        predicted_duration_mins=req.predicted_duration_mins,
        corridor=req.corridor,
        event_cause=req.event_cause,
        hour=req.hour,
        requires_road_closure=req.requires_road_closure,
    )
    return {**result.__dict__, "tandem": tandem}


@app.post("/api/ml/deployment", response_model=DeploymentResponse)
def deployment(req: DeploymentRequest):
    """Optimize officer and barricade placement across junctions.

    Uses greedy knapsack optimization to allocate resources where they
    reduce congestion most effectively.
    """
    junctions = [j.model_dump() for j in req.junctions]
    recs = recommend_deployment(
        junctions=junctions,
        available_officers=req.available_officers,
        available_barricades=req.available_barricades,
    )
    return {
        "recommendations": [r.__dict__ for r in recs],
        "total_officers_deployed": sum(r.officers for r in recs),
        "total_barricades_deployed": sum(r.barricades for r in recs),
    }


@app.post("/api/ml/gating", response_model=GatingResponse)
def gating(req: GatingRequest):
    """Generate advisory signal gating recommendations.

    When gridlock risk is elevated, recommends green time reductions
    at upstream perimeter junctions to restrict inflow.
    """
    queue_result = compute_queue_metrics(
        predicted_duration_mins=req.predicted_duration_mins,
        corridor=req.corridor,
        event_cause=req.event_cause,
        hour=req.hour,
        requires_road_closure=req.requires_road_closure,
    )
    upstream = [j.model_dump() for j in req.upstream_junctions]
    recs = recommend_gating(queue_result, upstream)
    return {
        "risk_level": queue_result.risk_level,
        "blocking_probability": queue_result.blocking_probability,
        "recommendations": [r.__dict__ for r in recs],
    }


# --- Prophet anomaly models (loaded once) ---
_prophet_models: dict | None = None


@app.post("/api/ml/anomaly", response_model=AnomalyResponse)
def anomaly(req: AnomalyRequest):
    """Detect anomalies using Prophet corridor baselines.

    Compares predicted duration against Prophet's expected baseline
    for this corridor/time. Returns anomaly score and classification.
    """
    global _prophet_models
    if _prophet_models is None:
        _prophet_models = load_corridor_baselines()
        if not _prophet_models:
            # Auto-train if no baselines exist
            _prophet_models = train_corridor_baselines()

    result = compute_anomaly_score(
        corridor=req.corridor,
        event_cause=req.event_cause,
        start_datetime=req.start_datetime,
        predicted_duration_mins=req.predicted_duration_mins,
        models=_prophet_models,
    )
    return result


@app.post("/api/ml/train-baselines")
def train_baselines():
    """Train/retrain Prophet corridor baseline models."""
    global _prophet_models
    _prophet_models = train_corridor_baselines()
    return {
        "status": "ok",
        "corridors_trained": len(_prophet_models),
        "corridors": [k for k in _prophet_models.keys() if k != "__global__"],
    }


@app.post("/api/ml/counterfactual", response_model=CounterfactualResponse)
def counterfactual(req: CounterfactualRequest):
    """Run counterfactual what-if analysis after an incident closes.

    Evaluates alternative deployment strategies and computes
    policy regret — how much better we could have done.
    """
    result = run_counterfactual_analysis(
        actual_duration_mins=req.actual_duration_mins,
        predicted_duration_mins=req.predicted_duration_mins,
        corridor=req.corridor,
        event_cause=req.event_cause,
        start_datetime=req.start_datetime,
        officers_deployed=req.officers_deployed,
        barricades_deployed=req.barricades_deployed,
        gating_applied=req.gating_applied,
    )
    result["event_id"] = req.event_id
    return result
