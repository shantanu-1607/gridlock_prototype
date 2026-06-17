from fastapi import FastAPI
from datetime import datetime

app = FastAPI(title="GridLock ML API")

@app.get("/api/health")
def health_check():
    return {
        "status": "ok",
        "message": "GridLock ML API is healthy",
        "timestamp": datetime.utcnow().isoformat()
    }
