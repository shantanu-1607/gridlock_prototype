"""Counterfactual analysis engine for post-event learning.

After an incident closes, runs "what-if" scenarios:
- What if we deployed officers 10 min earlier?
- What if we applied perimeter gating?
- What if we added more barricades?

Computes Policy Regret: how much better we could have done.
"""

from .queue_model import compute_queue_metrics, OFFICER_EFFECTIVENESS, BARRICADE_EFFECTIVENESS
from .logger import get_logger

log = get_logger("gridlock.counterfactual")


def run_counterfactual_analysis(
    actual_duration_mins: float,
    predicted_duration_mins: float,
    corridor: str,
    event_cause: str,
    start_datetime: str,
    officers_deployed: int = 0,
    barricades_deployed: int = 0,
    gating_applied: bool = False,
) -> dict:
    """Run counterfactual scenarios and compute policy regret.

    Returns analysis with multiple what-if scenarios and recommendations.
    """
    hour = 12
    try:
        from datetime import datetime
        dt = datetime.fromisoformat(start_datetime.replace("Z", "+00:00"))
        hour = dt.hour
    except Exception:
        pass

    # Baseline: what actually happened
    prediction_error = abs(predicted_duration_mins - actual_duration_mins)
    prediction_accuracy = max(0, 100 - (prediction_error / actual_duration_mins * 100)) if actual_duration_mins > 0 else 0

    scenarios = []

    # Scenario 1: Earlier officer deployment (+3 officers, 10 min earlier)
    earlier_improvement = min(0.15, (officers_deployed + 3) * OFFICER_EFFECTIVENESS)
    earlier_duration = actual_duration_mins * (1 - earlier_improvement)
    scenarios.append({
        "scenario": "Deploy 3 additional officers 10 min earlier",
        "estimated_duration_mins": round(earlier_duration, 1),
        "improvement_mins": round(actual_duration_mins - earlier_duration, 1),
        "improvement_pct": round(earlier_improvement * 100, 1),
    })

    # Scenario 2: Perimeter gating applied
    if not gating_applied:
        gating_improvement = 0.12  # gating typically reduces duration by ~12%
        gating_duration = actual_duration_mins * (1 - gating_improvement)
        scenarios.append({
            "scenario": "Apply perimeter gating at boundary junctions",
            "estimated_duration_mins": round(gating_duration, 1),
            "improvement_mins": round(actual_duration_mins - gating_duration, 1),
            "improvement_pct": round(gating_improvement * 100, 1),
        })

    # Scenario 3: Additional barricades at diversion points
    extra_barricades = 3
    barricade_improvement = min(0.20, (barricades_deployed + extra_barricades) * BARRICADE_EFFECTIVENESS)
    barricade_duration = actual_duration_mins * (1 - barricade_improvement)
    scenarios.append({
        "scenario": f"Add {extra_barricades} barricades at diversion points",
        "estimated_duration_mins": round(barricade_duration, 1),
        "improvement_mins": round(actual_duration_mins - barricade_duration, 1),
        "improvement_pct": round(barricade_improvement * 100, 1),
    })

    # Scenario 4: Combined intervention (officers + gating + barricades)
    combined_improvement = min(0.35, earlier_improvement + 0.12 + barricade_improvement * 0.5)
    combined_duration = actual_duration_mins * (1 - combined_improvement)
    scenarios.append({
        "scenario": "Full intervention: early officers + gating + barricades",
        "estimated_duration_mins": round(combined_duration, 1),
        "improvement_mins": round(actual_duration_mins - combined_duration, 1),
        "improvement_pct": round(combined_improvement * 100, 1),
    })

    # Scenario 5: Do nothing (baseline without any intervention)
    if officers_deployed > 0 or barricades_deployed > 0:
        no_intervention_penalty = (officers_deployed * OFFICER_EFFECTIVENESS + barricades_deployed * BARRICADE_EFFECTIVENESS)
        no_intervention_duration = actual_duration_mins * (1 + no_intervention_penalty)
        scenarios.append({
            "scenario": "No intervention (baseline)",
            "estimated_duration_mins": round(no_intervention_duration, 1),
            "improvement_mins": round(actual_duration_mins - no_intervention_duration, 1),
            "improvement_pct": round(-no_intervention_penalty * 100, 1),
        })

    # Find best alternative
    best = max(scenarios, key=lambda s: s["improvement_mins"])

    # Policy regret: how much better we could have done (percentage)
    policy_regret = best["improvement_pct"] if best["improvement_mins"] > 0 else 0

    # Generate recommendation
    if policy_regret > 15:
        recommendation = f"Significant improvement possible ({policy_regret:.0f}%). Recommended: {best['scenario']}. Update deployment thresholds for {event_cause} incidents on {corridor}."
    elif policy_regret > 5:
        recommendation = f"Moderate improvement possible ({policy_regret:.0f}%). Consider: {best['scenario']} for similar future incidents."
    else:
        recommendation = f"Response was near-optimal. Policy regret is low ({policy_regret:.0f}%). Current deployment strategy is effective for this incident type."

    return {
        "actual_duration_mins": actual_duration_mins,
        "predicted_duration_mins": predicted_duration_mins,
        "prediction_accuracy_pct": round(prediction_accuracy, 1),
        "policy_regret": round(policy_regret, 1),
        "best_alternative": best["scenario"],
        "scenarios": scenarios,
        "recommendation": recommendation,
    }
