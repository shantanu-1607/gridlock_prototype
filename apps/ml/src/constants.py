from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_PATH = BASE_DIR / "data" / "incidents.csv"
CONFIG_DIR = BASE_DIR / "config"
ARTIFACTS_DIR = BASE_DIR / "artifacts"

SCHEMA_YAML = CONFIG_DIR / "schema.yaml"
MODEL_YAML = CONFIG_DIR / "model.yaml"
EXPERIMENT_YAML = CONFIG_DIR / "experiment.yaml"

EXPERIMENTS_DIR = BASE_DIR / "experiments"
MLFLOW_DB = BASE_DIR / "mlflow.db"
MLARTIFACTS_DIR = BASE_DIR / "mlartifacts"

MISSING_TOKEN = "__MISSING__"

CATEGORICAL_COLS = ["event_cause", "corridor", "veh_type", "event_type", "police_station", "zone"]
TARGET_ENC_COLS = ["event_cause", "corridor", "police_station", "zone"]

DURATION_COL = "duration_mins"
SEVERITY_COL = "severity_score"

CAUSE_SEVERITY = {
    "accident": 1.0,
    "protest": 0.88,
    "vip_movement": 0.80,
    "water_logging": 0.72,
    "tree_fall": 0.64,
    "public_event": 0.60,
    "procession": 0.56,
    "construction": 0.48,
    "congestion": 0.40,
    "road_conditions": 0.40,
    "pot_holes": 0.32,
    "vehicle_breakdown": 0.24,
    "debris": 0.20,
    "others": 0.32,
    "test_demo": 0.10,
    "fog / low visibility": 0.44,
}

VEHICLE_WEIGHTS = {
    "heavy_vehicle": 1.0,
    "truck": 0.95,
    "ksrtc_bus": 0.85,
    "bmtc_bus": 0.80,
    "private_bus": 0.75,
    "lcv": 0.55,
    "private_car": 0.35,
    "taxi": 0.30,
    "auto": 0.20,
    "others": 0.40,
}
DEFAULT_VEHICLE_WEIGHT = 0.40

VEHICLE_CAUSES = {"accident", "vehicle_breakdown"}

SEVERITY_WEIGHTS = {
    "road_closure": 0.30,
    "priority": 0.25,
    "cause_vehicle": 0.20,
    "duration": 0.25,
}

SEVERITY_THRESHOLDS = [
    (0.30, "Low"),
    (0.60, "Medium"),
    (0.85, "High"),
    (1.01, "Critical"),
]
