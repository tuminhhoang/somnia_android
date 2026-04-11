"""Nightly metric computation pipeline.

Orchestrates METRIC_01 through METRIC_06 for a single patient.
"""

from __future__ import annotations

from datetime import datetime

from somnia.metrics import (
    arousal_index,
    cbti_readiness_score,
    circadian_alignment_score,
    recovery_trajectory,
    sleep_debt_index,
    sleep_efficiency_index,
)
from somnia.schemas.derived_metrics import DerivedMetrics
from somnia.schemas.raw_sleep_record import RawSleepRecord


def compute_nightly_metrics(
    record: RawSleepRecord,
    history_14d_tst: list[int],
    onsets_14d: list[float],
    wakes_14d: list[float],
    temp_nadir: float,
    hrv_trend_7d: float,
    isi_score: int,
    se_weekly: list[float] | None = None,
    hrv_weekly: list[float] | None = None,
    isi_weekly: list[int] | None = None,
    sleep_need: int = 480,
) -> DerivedMetrics:
    """Run all metrics for one patient's nightly record.

    Args:
        record:          tonight's RawSleepRecord
        history_14d_tst: last 14 nights TST (most-recent-first)
        onsets_14d:      last 14 sleep onset times (minutes-past-midnight)
        wakes_14d:       last 14 wake times (minutes-past-midnight)
        temp_nadir:      skin temp minimum time (minutes-past-midnight)
        hrv_trend_7d:    7-day HRV slope (ms/night)
        isi_score:       latest ISI score (0–28)
        se_weekly:       weekly sleep efficiency history (for trajectory)
        hrv_weekly:      weekly HRV history (for trajectory)
        isi_weekly:      weekly ISI history (for trajectory)
        sleep_need:      patient's estimated sleep need (minutes)

    Returns:
        DerivedMetrics dataclass with all computed values.
    """
    # METRIC_01 — Sleep Efficiency Index
    sei = sleep_efficiency_index(record.total_sleep_min, record.time_in_bed_min)

    # METRIC_02 — Sleep Debt Index
    sdi = sleep_debt_index(history_14d_tst, sleep_need)

    # METRIC_03 — Circadian Alignment Score
    cas = circadian_alignment_score(onsets_14d, wakes_14d, temp_nadir)

    # METRIC_04 — Arousal Index
    stages_with_total = {**record.sleep_stages, "total": record.total_sleep_min}
    ai_result = arousal_index(record.wake_episodes, record.hrv_ms, stages_with_total)

    # METRIC_05 — CBT-I Readiness Score
    crs = cbti_readiness_score(sei["se"], hrv_trend_7d, ai_result["ai"], isi_score)

    # METRIC_06 — Recovery Trajectory (requires weekly data)
    if se_weekly and hrv_weekly and isi_weekly and len(se_weekly) >= 2:
        rt = recovery_trajectory(se_weekly, hrv_weekly, isi_weekly)
    else:
        rt = {
            "trajectory": 0.0,
            "predicted_isi_w6": float(isi_score),
            "on_track": isi_score < 8,
        }

    return DerivedMetrics(
        patient_id=record.patient_id,
        date=record.date,
        computed_at=datetime.utcnow(),
        sleep_efficiency=sei["se"],
        tib_action=sei["action"],
        new_tib_min=sei["new_tib"],
        sleep_debt_index=sdi,
        circadian_alignment=cas["cas"],
        chronotype_offset_h=cas["chronotype_offset_h"],
        social_jetlag_h=cas["social_jetlag_h"],
        arousal_index=ai_result["ai"],
        arousal_subtype=ai_result["subtype"],
        cbti_readiness=crs["readiness"],
        active_module=crs["first_module"],
        module_confidence=crs["confidence"],
        trajectory=rt["trajectory"],
        predicted_isi_w6=rt["predicted_isi_w6"],
        on_track=rt["on_track"],
    )
