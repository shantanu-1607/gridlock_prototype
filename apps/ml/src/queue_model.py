"""M/M/c/K Queueing Model for traffic gridlock cascade prediction.

Takes ML-predicted incident duration and corridor parameters to compute:
- Blocking probability (P_B): likelihood queue overflows into upstream junctions
- Expected queue length and time-to-spillover
- Gridlock risk level (green/yellow/red)

Also includes resource allocation optimizer and advisory gating recommendations.
"""

import math
from dataclasses import dataclass

from .logger import get_logger

log = get_logger("gridlock.queue_model")

# Corridor profiles: lanes, capacity (vehicles), baseline arrival/service rate (veh/min).
# These are ILLUSTRATIVE / domain-estimated parameters — NOT derived from the Astram
# dataset (which records incidents, not traffic-flow rates). Replace with measured flow
# data per corridor if/when available.
CORRIDOR_PROFILES = {
    "Mysore Road":       {"lanes": 3, "capacity": 180, "arrival_rate": 40, "service_rate": 45},
    "Tumkur Road":       {"lanes": 3, "capacity": 200, "arrival_rate": 38, "service_rate": 42},
    "ORR":               {"lanes": 4, "capacity": 300, "arrival_rate": 55, "service_rate": 60},
    "Bellary Road":      {"lanes": 3, "capacity": 160, "arrival_rate": 35, "service_rate": 40},
    "Hosur Road":        {"lanes": 3, "capacity": 190, "arrival_rate": 42, "service_rate": 48},
    "Old Madras Road":   {"lanes": 2, "capacity": 120, "arrival_rate": 28, "service_rate": 32},
    "Bannerghatta Road": {"lanes": 2, "capacity": 140, "arrival_rate": 30, "service_rate": 35},
    "Kanakapura Road":   {"lanes": 2, "capacity": 130, "arrival_rate": 25, "service_rate": 30},
    "Whitefield Road":   {"lanes": 2, "capacity": 150, "arrival_rate": 32, "service_rate": 36},
    "MG Road":           {"lanes": 2, "capacity": 100, "arrival_rate": 25, "service_rate": 28},
    "MG Road Corridor":  {"lanes": 2, "capacity": 100, "arrival_rate": 25, "service_rate": 28},
}

DEFAULT_PROFILE = {"lanes": 2, "capacity": 150, "arrival_rate": 30, "service_rate": 35}

# Long, heterogeneous corridors are better modeled as tandem (staged) queues:
# the incident segment's overflow spills back through upstream sub-segments.
# Short / spatially-uniform corridors stay a single M/M/c/K (DEFAULT_SEGMENTS=1).
CORRIDOR_SEGMENTS = {
    "ORR": 4, "ORR North 1": 4, "ORR North 2": 4,
    "ORR East 1": 4, "ORR East 2": 4, "ORR West 1": 4,
    "Bellary Road": 4, "Bellary Road 1": 4, "Bellary Road 2": 4,
    "Bannerghatta Road": 4, "Bannerghata Road": 4,
    "Mysore Road": 3, "Tumkur Road": 3, "Hosur Road": 3, "Old Madras Road": 3,
    "Airport New South Road": 3, "Magadi Road": 2,
}
DEFAULT_SEGMENTS = 1

# Severity multipliers: how much an incident reduces service rate
SEVERITY_IMPACT = {
    "accident":           0.10,  # near-total blockage
    "vehicle_breakdown":  0.30,
    "water_logging":      0.25,
    "tree_fall":          0.15,
    "construction":       0.50,
    "protest":            0.05,
    "vip_movement":       0.20,
    "procession":         0.10,
    "congestion":         0.60,
    "public_event":       0.35,
    "road_conditions":    0.50,
    "pot_holes":          0.65,
    "debris":             0.40,
}

# Resource profiles
OFFICER_EFFECTIVENESS = 0.08   # each officer improves service rate by 8%
BARRICADE_EFFECTIVENESS = 0.12 # each barricade at diversion reduces arrival rate by 12%
MAX_OFFICERS = 20
MAX_BARRICADES = 15


@dataclass
class QueueResult:
    """Result of queueing analysis."""
    blocking_probability: float    # P(queue overflows into upstream)
    expected_queue_length: float   # E[N] vehicles in system
    expected_wait_time: float      # E[W] minutes waiting
    time_to_spillover: float       # minutes until queue fills road capacity
    risk_level: str                # green / yellow / red / critical
    utilization: float             # ρ = λ / (c·μ)
    effective_service_rate: float  # μ after incident impact
    effective_arrival_rate: float  # λ adjusted for time of day


@dataclass
class DeploymentRecommendation:
    """Resource allocation recommendation for a junction."""
    junction_id: str
    junction_name: str
    officers: int
    barricades: int
    congestion_score: float
    expected_improvement_pct: float


@dataclass
class GatingRecommendation:
    """Signal timing recommendation for perimeter gating."""
    junction_id: str
    junction_name: str
    current_green_secs: int
    recommended_green_secs: int
    reduction_pct: float
    expected_inflow_reduction_pct: float
    reason: str


def _get_corridor_profile(corridor: str) -> dict:
    """Get corridor profile, falling back to default."""
    for name, profile in CORRIDOR_PROFILES.items():
        if name.lower() in corridor.lower() or corridor.lower() in name.lower():
            return profile
    return DEFAULT_PROFILE


def _time_of_day_multiplier(hour: int) -> float:
    """Adjust arrival rate based on time of day."""
    if 8 <= hour <= 10 or 17 <= hour <= 20:
        return 1.4   # peak hours
    elif 11 <= hour <= 16:
        return 1.0   # midday
    elif 6 <= hour <= 7 or 21 <= hour <= 22:
        return 0.7   # shoulder hours
    else:
        return 0.3   # night


def _erlang_b(c: int, traffic_intensity: float) -> float:
    """Compute Erlang-B blocking probability for M/M/c/K system.

    Uses iterative formula to avoid factorial overflow.
    """
    if traffic_intensity <= 0 or c <= 0:
        return 0.0

    inv_b = 1.0
    for i in range(1, c + 1):
        inv_b = 1.0 + inv_b * i / traffic_intensity
    return 1.0 / inv_b


def compute_queue_metrics(
    predicted_duration_mins: float,
    corridor: str,
    event_cause: str,
    hour: int = 12,
    requires_road_closure: bool = False,
) -> QueueResult:
    """Compute queueing metrics for an incident.

    Args:
        predicted_duration_mins: ML-predicted incident clearance time
        corridor: Road corridor name
        event_cause: Type of incident
        hour: Hour of day (0-23)
        requires_road_closure: Whether road is fully closed
    """
    profile = _get_corridor_profile(corridor)
    c = profile["lanes"]
    K = profile["capacity"]
    base_mu = profile["service_rate"]
    base_lambda = profile["arrival_rate"]

    # Adjust arrival rate for time of day
    tod_mult = _time_of_day_multiplier(hour)
    lambda_eff = base_lambda * tod_mult

    # Reduce service rate based on incident type
    if requires_road_closure:
        mu_eff = base_mu * 0.05  # near-zero throughput
    else:
        severity_factor = SEVERITY_IMPACT.get(event_cause, 0.40)
        mu_eff = base_mu * severity_factor

    mu_eff = max(mu_eff, 0.5)  # minimum service rate

    # Traffic intensity (utilization)
    rho = lambda_eff / (c * mu_eff) if (c * mu_eff) > 0 else float("inf")

    # Blocking probability using Erlang-B with K servers
    if rho >= 1.0:
        # System is overloaded
        p_block = min(1.0, rho - 0.5)  # approximate
    else:
        # M/M/c/K blocking probability
        p_block = _erlang_b(K, lambda_eff / mu_eff)

    # Clamp to [0, 1]
    p_block = max(0.0, min(1.0, p_block))

    # Expected queue length (Little's law approximation)
    if rho < 1.0:
        expected_n = rho / (1 - rho) * (1 - (K + 1) * rho**K + K * rho**(K + 1)) / (1 - rho**(K + 1))
        expected_n = max(0, min(K, expected_n))
    else:
        expected_n = K * 0.9  # near capacity

    # Expected wait time (minutes)
    expected_w = expected_n / lambda_eff if lambda_eff > 0 else 0

    # Time to spillover: how long until queue fills road capacity
    if rho > 1.0:
        # Queue grows at rate (λ - c·μ) vehicles/min
        growth_rate = lambda_eff - c * mu_eff
        remaining_capacity = K - expected_n
        time_to_spill = remaining_capacity / growth_rate if growth_rate > 0 else float("inf")
    elif rho > 0.85:
        # Slow growth, estimate conservatively
        time_to_spill = predicted_duration_mins * (1 - rho) * 10
    else:
        time_to_spill = float("inf")

    time_to_spill = min(time_to_spill, predicted_duration_mins)

    # Risk level
    if p_block > 0.85 or rho > 1.2:
        risk = "critical"
    elif p_block > 0.60 or rho > 1.0:
        risk = "red"
    elif p_block > 0.30 or rho > 0.80:
        risk = "yellow"
    else:
        risk = "green"

    return QueueResult(
        blocking_probability=round(p_block, 4),
        expected_queue_length=round(expected_n, 1),
        expected_wait_time=round(expected_w, 1),
        time_to_spillover=round(time_to_spill, 1) if time_to_spill != float("inf") else -1,
        risk_level=risk,
        utilization=round(rho, 4),
        effective_service_rate=round(mu_eff, 2),
        effective_arrival_rate=round(lambda_eff, 2),
    )


@dataclass
class TandemStageResult:
    """Queueing state of one sub-segment of a tandem corridor."""
    stage: int
    role: str                    # 'incident' | 'upstream'
    queue_vehicles: float
    time_to_gridlock_mins: float  # -1 if not reached within the incident duration
    status: str                   # green / yellow / red / critical


def _segments_for(corridor: str) -> int:
    for name, n in CORRIDOR_SEGMENTS.items():
        if name.lower() in corridor.lower() or corridor.lower() in name.lower():
            return n
    return DEFAULT_SEGMENTS


def compute_tandem_queue_metrics(
    predicted_duration_mins: float,
    corridor: str,
    event_cause: str,
    hour: int = 12,
    requires_road_closure: bool = False,
) -> dict:
    """Tandem (staged) queue analysis for long heterogeneous corridors.

    Models the incident sub-segment as M/M/c/K, then propagates the unserved
    overflow upstream stage by stage. For short/uniform corridors this reduces
    to the single-queue result (is_tandem=False), so it is always safe to call.
    """
    incident = compute_queue_metrics(
        predicted_duration_mins, corridor, event_cause, hour, requires_road_closure,
    )
    n_segments = _segments_for(corridor)
    profile = _get_corridor_profile(corridor)

    # Unserved inflow at the incident (veh/min) — what spills back upstream.
    excess = max(0.0, incident.effective_arrival_rate
                 - profile["lanes"] * incident.effective_service_rate)
    k_stage = profile["capacity"] / max(1, n_segments)

    stages = [TandemStageResult(
        stage=0, role="incident",
        queue_vehicles=incident.expected_queue_length,
        time_to_gridlock_mins=incident.time_to_spillover,
        status=incident.risk_level,
    )]
    furthest = 0 if incident.risk_level in ("red", "critical") else -1
    cumulative = incident.expected_queue_length

    for j in range(1, n_segments):
        # Time for accumulated overflow to fill upstream stages 1..j.
        t_fill = (j * k_stage) / excess if excess > 0 else float("inf")
        reached = t_fill <= predicted_duration_mins
        q_j = min(k_stage, excess * max(0.0, predicted_duration_mins - t_fill)) if reached else 0.0
        if reached:
            status = "critical" if j == n_segments - 1 else "red"
            furthest = j
        else:
            status = "yellow" if (excess > 0 and t_fill < predicted_duration_mins * 2) else "green"
        stages.append(TandemStageResult(
            stage=j, role="upstream",
            queue_vehicles=round(q_j, 1),
            time_to_gridlock_mins=round(t_fill, 1) if reached else -1,
            status=status,
        ))
        cumulative += q_j

    return {
        "is_tandem": n_segments > 1,
        "n_segments": n_segments,
        "incident_segment": incident.__dict__,
        "stages": [s.__dict__ for s in stages],
        "furthest_gridlock_stage": furthest,
        "corridor_gridlock": furthest >= n_segments - 1 and n_segments > 1,
        "total_queued_vehicles": round(cumulative, 1),
        "spillback_rate_veh_per_min": round(excess, 2),
    }


def recommend_deployment(
    junctions: list[dict],
    available_officers: int = 10,
    available_barricades: int = 8,
) -> list[DeploymentRecommendation]:
    """Optimize resource allocation across junctions using greedy knapsack.

    Args:
        junctions: list of dicts with keys: id, name, congestion_score (0-1),
                   traffic_volume (relative), is_diversion_point (bool)
        available_officers: total officers to deploy
        available_barricades: total barricades available

    Returns sorted list of deployment recommendations.
    """
    if not junctions:
        return []

    # Score each junction: congestion_score × traffic_volume
    scored = []
    for j in junctions:
        score = j.get("congestion_score", 0.5) * j.get("traffic_volume", 1.0)
        scored.append((score, j))
    scored.sort(key=lambda x: x[0], reverse=True)

    recommendations = []
    officers_left = min(available_officers, MAX_OFFICERS)
    barricades_left = min(available_barricades, MAX_BARRICADES)

    for score, j in scored:
        if officers_left <= 0 and barricades_left <= 0:
            break

        # Allocate proportionally to score
        # Higher congestion → more officers; diversion points → barricades
        is_diversion = j.get("is_diversion_point", False)

        if score > 0.7:
            off = min(3, officers_left)
            bar = min(2, barricades_left) if is_diversion else min(1, barricades_left)
        elif score > 0.4:
            off = min(2, officers_left)
            bar = min(1, barricades_left) if is_diversion else 0
        else:
            off = min(1, officers_left)
            bar = 0

        if off == 0 and bar == 0:
            continue

        improvement = (off * OFFICER_EFFECTIVENESS + bar * BARRICADE_EFFECTIVENESS) * 100

        recommendations.append(DeploymentRecommendation(
            junction_id=j["id"],
            junction_name=j.get("name", j["id"]),
            officers=off,
            barricades=bar,
            congestion_score=round(score, 3),
            expected_improvement_pct=round(improvement, 1),
        ))

        officers_left -= off
        barricades_left -= bar

    return recommendations


def recommend_gating(
    queue_result: QueueResult,
    upstream_junctions: list[dict],
) -> list[GatingRecommendation]:
    """Generate advisory signal gating recommendations when blocking risk is high.

    Args:
        queue_result: QueueResult from compute_queue_metrics
        upstream_junctions: list of dicts with keys: id, name, green_time_secs
    """
    if queue_result.risk_level == "green":
        return []

    recommendations = []
    for j in upstream_junctions:
        current_green = j.get("green_time_secs", 60)

        if queue_result.risk_level == "critical":
            reduction = 0.40  # cut green by 40%
            reason = f"Critical gridlock risk (P_block={queue_result.blocking_probability:.0%}). Aggressive inflow restriction needed."
        elif queue_result.risk_level == "red":
            reduction = 0.25
            reason = f"High gridlock risk (P_block={queue_result.blocking_probability:.0%}). Reduce inbound flow."
        else:  # yellow
            reduction = 0.15
            reason = f"Elevated congestion (utilization={queue_result.utilization:.0%}). Precautionary gating."

        new_green = max(10, int(current_green * (1 - reduction)))
        inflow_reduction = reduction * 100

        recommendations.append(GatingRecommendation(
            junction_id=j["id"],
            junction_name=j.get("name", j["id"]),
            current_green_secs=current_green,
            recommended_green_secs=new_green,
            reduction_pct=round(reduction * 100, 1),
            expected_inflow_reduction_pct=round(inflow_reduction, 1),
            reason=reason,
        ))

    return recommendations
