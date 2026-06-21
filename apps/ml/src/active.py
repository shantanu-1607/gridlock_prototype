"""Live (in-incident) duration re-estimation.

The point model is trained on sparse data and won't get materially better by
re-running it mid-incident. The genuinely *new* information once an incident is
underway is the observed elapsed time, which the model never saw. This module
folds that fact into the already-calibrated conformal interval:

  * the lower bound can never be below the time already elapsed;
  * once an incident runs past its point estimate it is "running long", so the
    expected total is escalated toward the calibrated upper bound;
  * the remaining-time estimate and its interval narrow as the incident ages.

This is an analytic update on the existing prediction — no model re-run, so it
is not limited by the training-data ceiling.
"""


def update_active_prediction(
    original_total_mins: float,
    elapsed_mins: float,
    interval_lower_mins: float | None = None,
    interval_upper_mins: float | None = None,
    is_cleared: bool = False,
) -> dict:
    """Re-estimate remaining duration for an in-progress incident.

    Args:
        original_total_mins: duration predicted at incident creation.
        elapsed_mins: minutes the incident has already been active.
        interval_lower_mins / interval_upper_mins: the 90% conformal bounds
            from the original prediction (used to bound the escalation).
        is_cleared: whether the physical clearance of the incident has been completed.
    """
    elapsed = max(0.0, float(elapsed_mins))
    original = max(1.0, float(original_total_mins))
    upper = float(interval_upper_mins) if interval_upper_mins else original * 2.5
    upper = max(upper, elapsed + 1.0)

    if is_cleared:
        print(f"[ML Repredict] is_cleared=True received! Original duration: {original:.1f} mins, Elapsed: {elapsed:.1f} mins")
        # User requested fast acts for demo: use a 1-minute demobilization buffer max.
        demob_buffer = min(1.0, max(0.5, original * 0.05))
        updated_total = elapsed + demob_buffer
        status = "demobilization"
        escalate = False
        new_lower = elapsed
        new_upper = updated_total + 1.0
        note = f"Incident cleared at {elapsed:.0f} min; entering demobilization with {demob_buffer:.1f} min buffer."
        print(f"[ML Repredict] Slashed duration to {updated_total:.1f} mins (Buffer: {demob_buffer:.1f} min)")
    else:
        overdue_ratio = elapsed / original

        if overdue_ratio <= 1.0:
            # On track: total estimate holds; remaining shrinks with elapsed time.
            updated_total = original
            status = "on_track" if overdue_ratio < 0.85 else "running_long"
            escalate = False
        else:
            # Overdue: incident already outlived its estimate. Escalate the total
            # toward the calibrated worst case, never below what we've observed.
            escalated = elapsed + 0.5 * original
            updated_total = min(upper, max(escalated, elapsed + 1.0))
            status = "overdue"
            escalate = True

        new_lower = elapsed
        new_upper = max(upper, updated_total)
        note = {
            "on_track": f"Incident at {elapsed:.0f}/{original:.0f} min; tracking the original estimate.",
            "running_long": f"Incident at {elapsed:.0f}/{original:.0f} min; approaching the predicted clearance time.",
            "overdue": (
                f"Incident has run {elapsed:.0f} min vs {original:.0f} predicted; "
                f"escalating expected total to {updated_total:.0f} min (90% ceiling {upper:.0f})."
            ),
        }[status]

    remaining = max(0.0, updated_total - elapsed)

    return {
        "elapsed_mins": round(elapsed, 1),
        "original_total_mins": round(original, 1),
        "updated_total_mins": round(updated_total, 1),
        "remaining_mins": round(remaining, 1),
        "status": status,
        "escalate": escalate,
        "updated_interval": {
            "lower_mins": round(new_lower, 1),
            "upper_mins": round(new_upper, 1),
            "coverage": 0.90,
        },
        "note": note,
    }
