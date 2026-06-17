from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException

from ..predict import Predictor, find_latest_artifacts
from .schemas import PredictRequest, PredictResponse
from .service import run_prediction

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
