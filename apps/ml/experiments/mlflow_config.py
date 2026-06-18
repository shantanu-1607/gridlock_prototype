"""MLflow connection, experiment creation, and tracking utilities."""

import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

import mlflow
from mlflow.tracking import MlflowClient

from src.constants import BASE_DIR
from src.logger import get_logger

log = get_logger("gridlock.mlflow")

TRACKING_URI = f"sqlite:///{BASE_DIR / 'mlflow.db'}"
ARTIFACT_ROOT = str(BASE_DIR / "mlartifacts")
EXPERIMENT_PREFIX = "gridlock"


def init_mlflow() -> str:
    """Set MLflow tracking URI and return it for verification."""
    mlflow.set_tracking_uri(TRACKING_URI)
    log.info("MLflow tracking URI: %s", TRACKING_URI)
    return TRACKING_URI


def get_or_create_experiment(name: str) -> str:
    """Get or create an MLflow experiment by name. Returns experiment_id."""
    init_mlflow()
    experiment = mlflow.get_experiment_by_name(name)
    if experiment is not None:
        return experiment.experiment_id
    experiment_id = mlflow.create_experiment(name, artifact_location=ARTIFACT_ROOT)
    log.info("Created MLflow experiment: %s (id=%s)", name, experiment_id)
    return experiment_id


def generate_run_name(model_type: str, feature_set: str) -> str:
    """Generate a unique run name: {model}_{feature_set}_{timestamp}."""
    ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    return f"{model_type}_{feature_set}_{ts}"


def experiment_name(phase: str, focus: str) -> str:
    """Build experiment name: gridlock/{phase}/{focus}."""
    return f"{EXPERIMENT_PREFIX}/{phase}/{focus}"


def get_dvc_data_hash() -> str:
    """Get the data version hash. Reads from .dvc file or computes MD5 directly."""
    dvc_file = BASE_DIR / "data" / "incidents.csv.dvc"
    if dvc_file.exists():
        try:
            content = dvc_file.read_text()
            for line in content.splitlines():
                if "md5:" in line:
                    return line.split("md5:")[-1].strip()
        except Exception:
            pass

    # Fallback: compute MD5 of the data file directly
    data_file = BASE_DIR / "data" / "incidents.csv"
    if data_file.exists():
        h = hashlib.md5()
        with open(data_file, "rb") as f:
            for chunk in iter(lambda: f.read(8192), b""):
                h.update(chunk)
        return h.hexdigest()
    return "unknown"


def log_run_artifacts(artifact_paths: list[Path]):
    """Log artifact files to the current active MLflow run."""
    for p in artifact_paths:
        if p.exists():
            mlflow.log_artifact(str(p))


def get_client() -> MlflowClient:
    """Return an MlflowClient connected to our tracking URI."""
    init_mlflow()
    return MlflowClient(tracking_uri=TRACKING_URI)
