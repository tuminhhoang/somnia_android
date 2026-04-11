"""METRIC_05 — CBT-I Readiness Score (CRS).

Predict protocol response + route patient to correct first CBT-I module.
"""


def cbti_readiness_score(
    se: float,
    hrv_trend: float,
    ai: float,
    isi_score: int,
) -> dict:
    """Compute CBT-I readiness and recommend first module.

    Args:
        se:        sleep efficiency % (from METRIC_01)
        hrv_trend: 7-day HRV slope (ms/night, positive = improving)
        ai:        arousal index 0–100 (from METRIC_04)
        isi_score: Insomnia Severity Index 0–28 (patient self-report)

    Returns:
        dict with keys:
            readiness:    0–100 (higher = more responsive to CBT-I)
            first_module: recommended first CBT-I module
            confidence:   "high" | "medium" | "low"
    """
    # Normalize HRV trend to 0–100 (assume -3 to +3 ms/night range)
    hrv_norm = max(0, min(100, (hrv_trend + 3) / 6 * 100))

    # Component weights
    weights = {"se": 0.30, "hrv": 0.25, "ai": 0.25, "isi": 0.20}

    score = (
        se * weights["se"]
        + hrv_norm * weights["hrv"]
        + (100 - ai) * weights["ai"]
        + (100 - min(100, isi_score * 3.57)) * weights["isi"]
    )

    # Protocol routing — order matters (most specific first)
    if ai > 60:
        module = "stimulus_control"  # bed-wake association broken
    elif se < 75:
        module = "sleep_restriction"  # severe efficiency deficit
    elif isi_score > 14:
        module = "cognitive_restructuring"  # catastrophic thinking dominant
    else:
        module = "sleep_hygiene"  # mild — start conservative

    confidence = "high" if score > 70 else "medium" if score > 45 else "low"

    return {
        "readiness": round(score, 1),
        "first_module": module,
        "confidence": confidence,
    }
