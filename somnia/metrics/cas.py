"""METRIC_03 — Circadian Alignment Score (CAS).

Sleep timing regularity vs. patient's natural chronotype.
"""

import statistics


def circadian_alignment_score(
    onsets_14d: list[float],
    wakes_14d: list[float],
    temp_nadir: float,
) -> dict:
    """Compute circadian alignment from 14-day sleep timing data.

    Args:
        onsets_14d: sleep onset times as minutes-past-midnight (14 values)
        wakes_14d:  wake times as minutes-past-midnight (14 values)
        temp_nadir: skin temp minimum time (minutes-past-midnight)

    Returns:
        dict with keys:
            cas:                0–100 (100 = perfectly aligned)
            chronotype_offset_h: hours early/late vs. natural rhythm
            social_jetlag_h:    weekend vs. weekday midpoint difference (hours)
    """
    if len(onsets_14d) < 2 or len(wakes_14d) < 2:
        raise ValueError("Need at least 2 data points for onset and wake times")

    # Estimate natural sleep onset from temperature nadir (~6h before nadir)
    natural_onset = (temp_nadir - 360) % 1440  # wrap to 0–1440

    # Standard deviation of timing (lower = more consistent)
    onset_std = statistics.stdev(onsets_14d)  # minutes
    wake_std = statistics.stdev(wakes_14d)  # minutes

    # Social jetlag: difference between weekday and weekend sleep midpoint
    weekday_mid = _mid_sleep(onsets_14d[:10])  # approximate weekday subset
    weekend_mid = _mid_sleep(onsets_14d[10:])  # approximate weekend subset
    social_jetlag_min = abs(weekday_mid - weekend_mid)

    # Composite: penalise variance and social jetlag
    # Max penalty assumed: 120 min std, 180 min social lag
    cas = 100 - (
        (onset_std / 120) * 40
        + (wake_std / 120) * 30
        + (social_jetlag_min / 180) * 30
    )
    cas = max(0, min(100, cas))

    chronotype_offset = (statistics.mean(onsets_14d) - natural_onset) / 60

    return {
        "cas": round(cas, 1),
        "chronotype_offset_h": round(chronotype_offset, 2),
        "social_jetlag_h": round(social_jetlag_min / 60, 2),
    }


def _mid_sleep(onsets: list[float]) -> float:
    """Average midpoint between sleep onset and assumed 8h later."""
    return statistics.mean(o + 240 for o in onsets)  # onset + 4h = midpoint
