"""METRIC_01 — Sleep Efficiency Index (SEI).

Primary CBT-I treatment trigger — drives bedtime window adjustment.
"""


def sleep_efficiency_index(tst: int, tib: int) -> dict:
    """Compute sleep efficiency and bedtime window adjustment.

    Args:
        tst: total sleep time (minutes)
        tib: time in bed (minutes)

    Returns:
        dict with keys:
            se:      sleep efficiency 0–100%
            action:  "expand_window" | "restrict_window" | "hold"
            new_tib: adjusted TIB recommendation (minutes)
    """
    if tib <= 0:
        raise ValueError("time_in_bed_min must be positive")

    se = (tst / tib) * 100

    # Clinical CBT-I thresholds (AASM guidelines)
    if se > 90:
        action = "expand_window"  # +15 min TIB
        delta = +15
    elif se < 85:
        action = "restrict_window"  # -15 min TIB
        delta = -15
    else:
        action = "hold"
        delta = 0

    # Safety floor — never prescribe below 5.5h TIB
    new_tib = max(tib + delta, 330)

    return {"se": round(se, 1), "action": action, "new_tib": new_tib}
