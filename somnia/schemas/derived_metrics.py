"""Schema for computed derived metrics per patient per night."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime


@dataclass
class DerivedMetrics:
    patient_id: str
    date: date
    computed_at: datetime

    # METRIC_01 — Sleep Efficiency Index
    sleep_efficiency: float  # 0–100%
    tib_action: str  # expand | restrict | hold
    new_tib_min: int  # prescribed TIB

    # METRIC_02 — Sleep Debt Index
    sleep_debt_index: float  # 0–100

    # METRIC_03 — Circadian Alignment Score
    circadian_alignment: float  # 0–100
    chronotype_offset_h: float  # hours ±
    social_jetlag_h: float  # hours

    # METRIC_04 — Arousal Index
    arousal_index: float  # 0–100
    arousal_subtype: str  # frequency | duration | hrv_instability | none

    # METRIC_05 — CBT-I Readiness Score
    cbti_readiness: float  # 0–100
    active_module: str  # stimulus_control | sleep_restriction | ...
    module_confidence: str  # high | medium | low

    # METRIC_06 — Recovery Trajectory
    trajectory: float  # -1.0 to +1.0
    predicted_isi_w6: float  # projected ISI at week 6
    on_track: bool  # True if predicted_isi_w6 < 8
