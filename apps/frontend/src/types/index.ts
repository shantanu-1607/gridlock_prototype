export interface PlanEventPayload {
  type: string
  category: string
  name: string
  description: string
  lat: number
  lon: number
  expected_crowd_size?: number
  start_datetime: string
  expected_end_datetime?: string
  affected_corridors: string[]
  requires_road_closure: boolean
  veh_type?: string
  priority: string
}

export interface PipelinePrediction {
  duration_mins: number
  severity_score: number
  severity_label: string
  confidence: number
}

export interface QueueAnalysis {
  blocking_probability: number
  expected_queue_length: number
  expected_wait_time: number
  time_to_spillover: number
  risk_level: string
  utilization: number
  effective_service_rate: number
  effective_arrival_rate: number
}

export interface DeploymentItem {
  junction_id: string
  junction_name: string
  officers: number
  barricades: number
  congestion_score: number
  expected_improvement_pct: number
}

export interface DeploymentPlan {
  recommendations: DeploymentItem[]
  total_officers_deployed: number
  total_barricades_deployed: number
}

export interface GatingItem {
  junction_id: string
  junction_name: string
  current_green_secs: number
  recommended_green_secs: number
  reduction_pct: number
  expected_inflow_reduction_pct: number
  reason: string
}

export interface GatingPlan {
  risk_level: string
  blocking_probability: number
  recommendations: GatingItem[]
}

export interface AnomalyResult {
  anomaly_score: number
  anomaly_label: string
  expected_duration_mins: number
  predicted_duration_mins: number
  deviation_pct: number
  model_source: string
  context: string
}

export interface TimelineStep {
  offset_mins: number
  time: string
  action: string
  title: string
  description: string
}

export interface SimilarEvent {
  event_id: string
  event_cause: string
  corridor: string
  hour: number
  duration_mins: number
  similarity_score: number
}

export interface CounterfactualScenario {
  scenario: string
  estimated_duration_mins: number
  improvement_mins: number
  improvement_pct: number
}

export interface CounterfactualResult {
  event_id: string
  actual_duration_mins: number
  predicted_duration_mins: number
  prediction_accuracy_pct: number
  policy_regret: number
  best_alternative: string
  scenarios: CounterfactualScenario[]
  recommendation: string
}

export interface PipelineResult {
  prediction: PipelinePrediction
  queue_analysis: QueueAnalysis
  deployment_plan: DeploymentPlan
  gating_plan: GatingPlan
  similar_incidents: SimilarEvent[]
  propagation_forecast: Record<string, unknown>
  prestaging_timeline: TimelineStep[]
  anomaly_detection: AnomalyResult
}

export interface PlannedEvent {
  id: string
  type: string
  category: string
  name: string
  description: string
  lat: number
  lon: number
  start_datetime: string
  status: string
  predicted_duration_mins: number
  severity_score: number
  risk_level: string
  blocking_probability: number
  queue_length: number
  deployment_plan: DeploymentPlan
  gating_plan: GatingPlan
  prestaging_timeline: TimelineStep[]
  anomaly_score: number
  anomaly_label: string
  counterfactual?: CounterfactualResult
}

export interface PropagationTick {
  eventId: string
  tick: number
  activeNodes: Record<string, { intensity: number; lat: number; lon: number }>
  timestamp: string
}
