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
