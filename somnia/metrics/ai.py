"""METRIC_04 — Arousal Index (AI).

Hyperarousal detection — measures night waking burden.
"""

import statistics


def arousal_index(
    wake_episodes: list[dict],
    hrv_series: list[float],
    sleep_stages: dict,
) -> dict:
    """Compute arousal index from wake episodes, HRV, and sleep stages.

    Args:
        wake_episodes: list of dicts with "duration" key (minutes)
        hrv_series:    overnight HRV series (ms)
        sleep_stages:  dict with "light", "deep", "rem", and "total" keys (minutes)

    Returns:
        dict with keys:
            ai:      0–100 (0 = no arousal, 100 = severe hyperarousal)
            subtype: "frequency" | "duration" | "hrv_instability" | "mixed" | "none"
    """
    if not hrv_series or len(hrv_series) < 2:
        raise ValueError("hrv_series must have at least 2 values")
    if sleep_stages.get("total", 0) <= 0:
        raise ValueError("sleep_stages['total'] must be positive")

    # Component 1: Frequency — penalise number of awakenings
    freq_score = len(wake_episodes) * 5  # 5 pts per episode

    # Component 2: Duration — penalise long awakenings (>5 min)
    long_wakes = [e["duration"] for e in wake_episodes if e["duration"] > 5]
    dur_score = sum(long_wakes) * 0.3

    # Component 3: HRV instability during NREM (hyperarousal proxy)
    hrv_mean = statistics.mean(hrv_series)
    if hrv_mean > 0:
        hrv_cv = (statistics.stdev(hrv_series) / hrv_mean) * 100
    else:
        hrv_cv = 0.0
    hrv_score = hrv_cv * 0.5

    # Component 4: N1 excess — light sleep dominance indicates arousal
    n1_pct = sleep_stages["light"] / sleep_stages["total"]
    n1_penalty = max(0, (n1_pct - 0.55) * 200)  # penalty above 55% light

    ai = min(100, freq_score + dur_score + hrv_score + n1_penalty)

    # Dominant subtype
    scores = {
        "frequency": freq_score,
        "duration": dur_score,
        "hrv_instability": hrv_score,
    }
    subtype = max(scores, key=scores.get) if ai > 30 else "none"

    return {"ai": round(ai, 1), "subtype": subtype}
