"""METRIC_02 — Sleep Debt Index (SDI).

14-day rolling weighted deficit — tracks cumulative sleep load.
"""


def sleep_debt_index(history_14d: list[int], sleep_need: int = 480) -> float:
    """Compute weighted sleep debt over the last 14 nights.

    Args:
        history_14d: list of TST values for last 14 nights (minutes),
                     ordered most-recent-first.
        sleep_need:  patient's estimated sleep need (minutes, default 8h)

    Returns:
        sdi: 0–100 (0 = no debt, 100 = severe chronic deficit)
    """
    if not history_14d:
        raise ValueError("history_14d must not be empty")

    daily_deficits = [max(0, sleep_need - night) for night in history_14d]

    # Exponential decay — recent nights weighted more heavily
    weights = [0.85**i for i in range(len(daily_deficits))]
    weighted_debt = sum(d * w for d, w in zip(daily_deficits, weights))

    # Normalize to 0–100 scale (max possible debt = 14 * 60 min)
    sdi = min(100, (weighted_debt / (14 * 60)) * 100)

    return round(sdi, 1)
