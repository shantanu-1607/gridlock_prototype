"""Canonicalize incoming categorical fields to the model's training vocabulary.

The frontend planning form emits human-friendly labels (Title Case, spaces, a few
categories that don't exist in the training data). The trained encoders only know
the lowercase/underscore vocabulary observed during training. When an unseen value
is passed through, the encoder defaults/unknown-fills it, the ensemble members
extrapolate inconsistently, member disagreement spikes, and the dynamic-confidence
penalty saturates — pinning every prediction at the 0.30 confidence floor.

Normalizing here (at the API boundary) keeps the model's vocabulary as the single
source of truth and fixes the skew regardless of which caller sent the request.
"""

from __future__ import annotations

# Canonical event_cause vocabulary observed in training data.
KNOWN_CAUSES = {
    "accident",
    "congestion",
    "construction",
    "others",
    "pot_holes",
    "procession",
    "protest",
    "road_conditions",
    "test_demo",
    "tree_fall",
    "vehicle_breakdown",
    "water_logging",
}

# Form labels / synonyms that don't map cleanly via lower+underscore.
CAUSE_ALIASES = {
    "vip_movement": "procession",
    "vip": "procession",
    "public_event": "others",
    "event": "others",
    "rally": "protest",
    "waterlogging": "water_logging",
    "potholes": "pot_holes",
    "pothole": "pot_holes",
    "breakdown": "vehicle_breakdown",
    "road_condition": "road_conditions",
}

# Canonical corridor vocabulary observed in training data.
KNOWN_CORRIDORS = {
    "Airport New South Road",
    "Bannerghata Road",
    "Bellary Road 1",
    "Bellary Road 2",
    "CBD 1",
    "CBD 2",
    "Hennur Main Road",
    "Hosur Road",
    "IRR(Thanisandra road)",
    "Magadi Road",
    "Mysore Road",
    "Non-corridor",
    "ORR East 1",
    "ORR East 2",
    "ORR North 1",
    "ORR North 2",
    "ORR West 1",
    "Old Airport Road",
    "Old Madras Road",
    "Tumkur Road",
    "Varthur Road",
    "West of Chord Road",
}

# Corridor labels the form may send that aren't training corridors.
CORRIDOR_ALIASES = {
    "Outer Ring Road": "ORR East 1",
    "ORR": "ORR East 1",
    "Airport Road": "Old Airport Road",
}


def normalize_cause(value: str | None) -> str:
    """Map a free-form event_cause label to the training vocabulary.

    Unknown causes fall back to ``others`` (a real, populated training category)
    rather than an unseen token, so the encoder stays in-distribution.
    """
    if not value:
        return "others"
    key = str(value).strip().lower().replace(" ", "_").replace("-", "_")
    while "__" in key:
        key = key.replace("__", "_")
    if key in KNOWN_CAUSES:
        return key
    if key in CAUSE_ALIASES:
        return CAUSE_ALIASES[key]
    return "others"


def normalize_corridor(value: str | None) -> str:
    """Map a free-form corridor label to the training vocabulary.

    Unknown corridors fall back to ``Non-corridor`` (the most common training
    bucket) so conformal/anomaly corridor lookups stay valid.
    """
    if not value:
        return "Non-corridor"
    v = str(value).strip()
    if v in KNOWN_CORRIDORS:
        return v
    if v in CORRIDOR_ALIASES:
        return CORRIDOR_ALIASES[v]
    return "Non-corridor"


def normalize_priority(value: str | None) -> str:
    """Collapse priority to the training vocabulary (only ``High``/``Low`` exist).

    ``Critical`` escalates to ``High``; ``Medium``/unknown default to ``Low``.
    """
    if not value:
        return "Low"
    v = str(value).strip().lower()
    if v in ("high", "critical"):
        return "High"
    return "Low"
