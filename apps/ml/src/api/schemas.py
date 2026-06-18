from __future__ import annotations

from pydantic import BaseModel, Field, model_validator


class PredictRequest(BaseModel):
    start_datetime: str
    latitude: float = Field(default=0.0)
    longitude: float = Field(default=0.0)
    event_cause: str = ""
    corridor: str = "Non-corridor"
    priority: str = "Low"
    requires_road_closure: bool = False
    event_type: str = "unplanned"
    veh_type: str | None = None
    police_station: str = ""
    zone: str = ""

    # Backend sends lat/lon, category, type — accept both forms
    lat: float | None = Field(default=None, exclude=True)
    lon: float | None = Field(default=None, exclude=True)
    category: str | None = Field(default=None, exclude=True)
    type: str | None = Field(default=None, exclude=True)
    affected_corridors: str | list | None = Field(default=None, exclude=True)

    @model_validator(mode="after")
    def _normalize_aliases(self):
        if self.lat is not None and self.latitude == 0.0:
            self.latitude = self.lat
        if self.lon is not None and self.longitude == 0.0:
            self.longitude = self.lon
        if self.category and not self.event_cause:
            self.event_cause = self.category
        if self.type and self.event_type == "unplanned":
            self.event_type = self.type
        if self.affected_corridors and self.corridor == "Non-corridor":
            c = self.affected_corridors
            if isinstance(c, list) and c:
                self.corridor = c[0]
            elif isinstance(c, str) and c:
                self.corridor = c
        return self


class SimilarEvent(BaseModel):
    event_id: str
    event_cause: str
    corridor: str
    hour: int
    duration_mins: float
    severity_score: float = 0.0
    similarity_score: float


class AggregatedFingerprint(BaseModel):
    avg_duration_mins: float
    avg_severity_score: float
    count: int


class PredictResponse(BaseModel):
    predicted_duration_mins: float
    severity_score: float
    severity_label: str
    confidence: float
    model_timestamp: str
    similar_events: list[SimilarEvent]
    aggregated: AggregatedFingerprint | None = None


# --- Queueing Model schemas ---

class QueueAnalysisRequest(BaseModel):
    predicted_duration_mins: float
    corridor: str = "Non-corridor"
    event_cause: str = ""
    hour: int = 12
    requires_road_closure: bool = False


class QueueAnalysisResponse(BaseModel):
    blocking_probability: float
    expected_queue_length: float
    expected_wait_time: float
    time_to_spillover: float
    risk_level: str
    utilization: float
    effective_service_rate: float
    effective_arrival_rate: float


# --- Resource Deployment schemas ---

class JunctionInput(BaseModel):
    id: str
    name: str = ""
    congestion_score: float = 0.5
    traffic_volume: float = 1.0
    is_diversion_point: bool = False


class DeploymentRequest(BaseModel):
    junctions: list[JunctionInput]
    available_officers: int = 10
    available_barricades: int = 8


class DeploymentItem(BaseModel):
    junction_id: str
    junction_name: str
    officers: int
    barricades: int
    congestion_score: float
    expected_improvement_pct: float


class DeploymentResponse(BaseModel):
    recommendations: list[DeploymentItem]
    total_officers_deployed: int
    total_barricades_deployed: int


# --- Gating Advisory schemas ---

class UpstreamJunction(BaseModel):
    id: str
    name: str = ""
    green_time_secs: int = 60


class GatingRequest(BaseModel):
    predicted_duration_mins: float
    corridor: str = "Non-corridor"
    event_cause: str = ""
    hour: int = 12
    requires_road_closure: bool = False
    upstream_junctions: list[UpstreamJunction]


class GatingItem(BaseModel):
    junction_id: str
    junction_name: str
    current_green_secs: int
    recommended_green_secs: int
    reduction_pct: float
    expected_inflow_reduction_pct: float
    reason: str


class GatingResponse(BaseModel):
    risk_level: str
    blocking_probability: float
    recommendations: list[GatingItem]


# --- Anomaly Detection schemas ---

class AnomalyRequest(BaseModel):
    corridor: str = "Non-corridor"
    event_cause: str = ""
    start_datetime: str = ""
    predicted_duration_mins: float = 60.0


class AnomalyResponse(BaseModel):
    anomaly_score: float
    anomaly_label: str
    expected_duration_mins: float
    expected_range: list[float] = []
    predicted_duration_mins: float
    deviation_pct: float
    model_source: str
    context: str


# --- Counterfactual Analysis schemas ---

class CounterfactualRequest(BaseModel):
    event_id: str
    predicted_duration_mins: float
    actual_duration_mins: float
    corridor: str = ""
    event_cause: str = ""
    start_datetime: str = ""
    officers_deployed: int = 0
    barricades_deployed: int = 0
    gating_applied: bool = False


class CounterfactualScenario(BaseModel):
    scenario: str
    estimated_duration_mins: float
    improvement_mins: float
    improvement_pct: float


class CounterfactualResponse(BaseModel):
    event_id: str
    actual_duration_mins: float
    predicted_duration_mins: float
    prediction_accuracy_pct: float
    policy_regret: float
    best_alternative: str
    scenarios: list[CounterfactualScenario]
    recommendation: str


# --- Accuracy schemas ---

class AccuracyRequest(BaseModel):
    event_id: str
    predicted_duration_mins: float
    actual_duration_mins: float
    predicted_severity_score: float = 0.0
    actual_severity_score: float | None = None
    event_cause: str = ""
    corridor: str = ""


class AccuracyMetric(BaseModel):
    metric: str
    predicted: float
    actual: float
    delta_pct: float


class AccuracyResponse(BaseModel):
    event_id: str
    accuracy_score: float
    metrics: list[AccuracyMetric]
    summary: str
