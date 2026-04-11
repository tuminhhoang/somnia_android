"""Unified schema for raw sleep data from all wearable sources."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date


@dataclass
class RawSleepRecord:
    patient_id: str
    date: date

    # Biometric time-series
    hrv_ms: list[float]  # 5-min RMSSD samples overnight (ms)
    spo2: list[float]  # Blood oxygen % — 5-min intervals
    skin_temp_delta: float  # °C deviation from personal baseline

    # Sleep architecture
    sleep_stages: dict  # {"light": int, "deep": int, "rem": int, "awake": int} — minutes
    total_sleep_min: int  # TST — total sleep time excl. awake
    time_in_bed_min: int  # TIB — lights out → out of bed
    sleep_onset_min: int  # SOL — minutes to fall asleep
    wake_episodes: list[dict] = field(default_factory=list)  # [{"start": ts, "duration": int}]

    # Vitals
    resting_hr: float = 0.0  # Lowest 5-min avg overnight HR (bpm)
    resp_rate: float = 0.0  # Average respiratory rate (breaths/min)

    # Timestamps
    sleep_start_ts: int = 0  # Unix epoch UTC
    wake_time_ts: int = 0  # Unix epoch UTC
