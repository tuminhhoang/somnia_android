"""METRIC_06 — Recovery Trajectory (RT).

Week-over-week clinical improvement rate + ISI outcome prediction.
"""

import numpy as np


def recovery_trajectory(
    se_history: list[float],
    hrv_history: list[float],
    isi_history: list[int],
) -> dict:
    """Compute recovery trajectory from weekly metric histories.

    Args:
        se_history:  weekly avg sleep efficiency (%), minimum 2 weeks
        hrv_history: weekly avg HRV (ms), minimum 2 weeks
        isi_history: weekly ISI scores (0–28), minimum 2 weeks

    Returns:
        dict with keys:
            trajectory:       -1.0 to +1.0 (negative = worsening)
            predicted_isi_w6: projected ISI score at week 6
            on_track:         bool — on track for clinical remission (ISI < 8)?
            slopes:           dict of per-metric slopes
    """
    if len(se_history) < 2 or len(hrv_history) < 2 or len(isi_history) < 2:
        raise ValueError("All histories must have at least 2 weekly values")

    weeks = list(range(len(se_history)))

    def slope(series: list[float]) -> float:
        if len(series) < 2:
            return 0.0
        coeffs = np.polyfit(weeks[: len(series)], series, 1)
        return float(coeffs[0])

    se_slope = slope(se_history)  # %/week — positive good
    hrv_slope = slope(hrv_history)  # ms/week — positive good
    isi_slope = slope(isi_history)  # pts/week — negative good

    # Normalize each slope to -1 → +1 range
    def normalize(val: float, expected_max: float) -> float:
        return max(-1, min(1, val / expected_max))

    trajectory = (
        normalize(se_slope, 5.0) * 0.40  # expect ~5%/week improvement
        + normalize(hrv_slope, 3.0) * 0.30  # expect ~3ms/week improvement
        + normalize(-isi_slope, 4.0) * 0.30  # expect ~4pt/week reduction
    )

    # Predict ISI at week 6
    predicted_isi_w6 = max(0, isi_history[0] + isi_slope * 6)
    on_track = predicted_isi_w6 < 8  # ISI < 8 = clinical remission

    return {
        "trajectory": round(trajectory, 3),
        "predicted_isi_w6": round(predicted_isi_w6, 1),
        "on_track": on_track,
        "slopes": {
            "se_pct_per_week": round(se_slope, 2),
            "hrv_ms_per_week": round(hrv_slope, 2),
            "isi_pts_per_week": round(isi_slope, 2),
        },
    }
