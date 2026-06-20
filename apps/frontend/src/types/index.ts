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

export interface PredictionInterval {
  lower_mins: number | null
  upper_mins: number | null
  coverage: number | null
  source: string
}

export interface ConfidenceFactors {
  base_confidence: number
  ensemble_std: number
  n_models: number
}

export interface PipelinePrediction {
  duration_mins: number
  severity_score: number
  severity_label: string
  confidence: number
  prediction_interval?: PredictionInterval | null
  confidence_factors?: ConfidenceFactors | null
}

export interface TandemStage {
  stage: number
  role: 'incident' | 'upstream'
  queue_vehicles: number
  time_to_gridlock_mins: number
  status: string
}

export interface TandemAnalysis {
  is_tandem: boolean
  n_segments: number
  stages: TandemStage[]
  furthest_gridlock_stage: number
  corridor_gridlock: boolean
  total_queued_vehicles: number
  spillback_rate_veh_per_min: number
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
  tandem?: TandemAnalysis | null
}

export interface AssignedFleetMember {
  user_id: string
  user_name: string
}

export interface Deployment {
  junction: string
  junctionName: string
  fleet_count: number
  role: string
  priority: string
  deployByMins: number
  assignedFleet: AssignedFleetMember[]
  lat?: number
  lon?: number
}

export interface DispatchPlan {
  total_fleet_required: number
  rationale: string
  deployments: Deployment[]
  source: 'llm' | 'fallback'
  contingency_reserve?: number
  uncertainty_level?: 'low' | 'elevated' | 'high'
}

export type BarricadeType = 'hard_closure' | 'diversion_sign'
export type BarricadeRule = 'road_closure' | 'severity_path' | 'crowd_perimeter'

export interface BarricadeRecommendation {
  junction_id: string
  location_name: string
  lat: number
  lon: number
  type: BarricadeType
  activate_at: string
  purpose: string
  rule_source: BarricadeRule
}

export interface BarricadePlan {
  barricades: BarricadeRecommendation[]
  rationale: string
  source: 'llm' | 'fallback'
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
  expected_range?: [number, number]
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
  fleet_plan: DispatchPlan
  barricade_plan: BarricadePlan
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
  fleet_plan: DispatchPlan
  barricade_plan: BarricadePlan
  total_fleet_required?: number
  recommendation_rationale?: string
  total_barricades_required?: number
  barricade_rationale?: string
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
