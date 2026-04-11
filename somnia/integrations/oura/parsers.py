"""Oura sleep data parsers and normalization.

Parses raw Oura API responses into structured dataclasses and converts
them to the Somnia RawSleepRecord schema for metric computation.
"""

from __future__ import annotations

import statistics
from dataclasses import dataclass, field
from datetime import datetime, timedelta

STAGE_MAP = {
    "1": "awake",
    "2": "light",
    "3": "rem",
    "4": "deep",
}

EPOCH_SECONDS = 300  # 5 minutes per epoch


@dataclass
class SleepEpoch:
    index: int
    timestamp: datetime
    stage: str  # awake | light | rem | deep
    duration_s: int = 300


@dataclass
class ParsedSleepPeriod:
    # Identifiers
    oura_id: str
    date: str
    sleep_type: str  # long_sleep | short_sleep | nap

    # Timestamps
    bedtime_start: datetime
    bedtime_end: datetime

    # Stage durations (seconds)
    deep_s: int
    rem_s: int
    light_s: int
    awake_s: int
    total_sleep_s: int
    time_in_bed_s: int

    # Stage percentages
    deep_pct: float
    rem_pct: float
    light_pct: float
    awake_pct: float

    # Key metrics
    efficiency: float  # 0-100%
    latency_s: int  # seconds to sleep onset
    restless_count: int

    # Vitals
    avg_hrv_ms: float
    resting_hr: int
    avg_hr: float
    avg_breath: float

    # Time-series
    hrv_series: list[float | None] = field(default_factory=list)
    hr_series: list[float | None] = field(default_factory=list)
    epochs: list[SleepEpoch] = field(default_factory=list)

    # Wake episodes (derived)
    wake_episodes: list[dict] = field(default_factory=list)

    # Flags
    is_main_sleep: bool = False


def parse_sleep_period(raw: dict) -> ParsedSleepPeriod:
    """Parse a raw Oura sleep period API response into a structured object.

    Args:
        raw: Single item from get_sleep_periods() response.

    Returns:
        ParsedSleepPeriod with all fields populated.
    """
    bedtime_start = datetime.fromisoformat(raw["bedtime_start"])
    bedtime_end = datetime.fromisoformat(raw["bedtime_end"])

    # --- Parse sleep stage sequence ---
    phase_str = raw.get("sleep_phase_5_min", "")
    epochs = _parse_epochs(phase_str, bedtime_start)

    # --- Stage durations from epochs (ground truth) ---
    stage_counts: dict[str, int] = {"awake": 0, "light": 0, "rem": 0, "deep": 0}
    for epoch in epochs:
        stage_counts[epoch.stage] += 1

    deep_s = stage_counts["deep"] * EPOCH_SECONDS
    rem_s = stage_counts["rem"] * EPOCH_SECONDS
    light_s = stage_counts["light"] * EPOCH_SECONDS
    awake_s = stage_counts["awake"] * EPOCH_SECONDS

    # Use API-provided values as fallback if phase string empty
    if not epochs:
        deep_s = raw.get("deep_sleep_duration", 0) or 0
        rem_s = raw.get("rem_sleep_duration", 0) or 0
        light_s = raw.get("light_sleep_duration", 0) or 0
        awake_s = raw.get("awake_time", 0) or 0

    total_sleep_s = deep_s + rem_s + light_s
    time_in_bed_s = raw.get("time_in_bed", 0) or (
        deep_s + rem_s + light_s + awake_s
    )

    # --- Stage percentages ---
    denom = total_sleep_s if total_sleep_s > 0 else 1
    deep_pct = (deep_s / denom) * 100
    rem_pct = (rem_s / denom) * 100
    light_pct = (light_s / denom) * 100
    awake_pct = (awake_s / time_in_bed_s) * 100 if time_in_bed_s > 0 else 0

    # --- Efficiency ---
    efficiency = raw.get("efficiency") or (
        (total_sleep_s / time_in_bed_s * 100) if time_in_bed_s > 0 else 0
    )

    # --- HRV time-series ---
    hrv_raw = raw.get("hrv", {})
    hrv_series = hrv_raw.get("items", [])
    hrv_clean = [abs(v) for v in hrv_series if v is not None and v != 0]
    avg_hrv_ms = statistics.mean(hrv_clean) if hrv_clean else 0.0

    # --- HR time-series ---
    hr_raw = raw.get("heart_rate", {})
    hr_series = hr_raw.get("items", [])

    # --- Wake episodes from epoch sequence ---
    wake_episodes = _extract_wake_episodes(epochs)

    return ParsedSleepPeriod(
        oura_id=raw["id"],
        date=raw["day"],
        sleep_type=raw.get("type", "unknown"),
        bedtime_start=bedtime_start,
        bedtime_end=bedtime_end,
        deep_s=deep_s,
        rem_s=rem_s,
        light_s=light_s,
        awake_s=awake_s,
        total_sleep_s=total_sleep_s,
        time_in_bed_s=time_in_bed_s,
        deep_pct=round(deep_pct, 1),
        rem_pct=round(rem_pct, 1),
        light_pct=round(light_pct, 1),
        awake_pct=round(awake_pct, 1),
        efficiency=round(float(efficiency), 1),
        latency_s=raw.get("latency", 0) or 0,
        restless_count=raw.get("restless_periods", 0) or 0,
        avg_hrv_ms=round(avg_hrv_ms, 1),
        resting_hr=raw.get("lowest_heart_rate", 0) or 0,
        avg_hr=raw.get("average_heart_rate", 0.0) or 0.0,
        avg_breath=raw.get("average_breath", 0.0) or 0.0,
        hrv_series=hrv_series,
        hr_series=hr_series,
        epochs=epochs,
        wake_episodes=wake_episodes,
        is_main_sleep=raw.get("type") == "long_sleep",
    )


def _parse_epochs(phase_str: str, bedtime_start: datetime) -> list[SleepEpoch]:
    """Parse the sleep_phase_5_min string into SleepEpoch objects.

    Encoding: "1" = awake, "2" = light, "3" = REM, "4" = deep.
    Each character represents a 5-minute epoch from bedtime_start.
    """
    epochs: list[SleepEpoch] = []
    for i, char in enumerate(phase_str):
        stage = STAGE_MAP.get(char)
        if stage is None:
            continue
        ts = bedtime_start + timedelta(seconds=i * EPOCH_SECONDS)
        epochs.append(SleepEpoch(index=i, timestamp=ts, stage=stage))
    return epochs


def _extract_wake_episodes(epochs: list[SleepEpoch]) -> list[dict]:
    """Extract discrete wake episodes from epoch sequence.

    Only counts awakenings after initial sleep onset (excludes sleep latency).
    """
    if not epochs:
        return []

    # Find first non-awake epoch (sleep onset)
    sleep_onset_idx = next(
        (i for i, e in enumerate(epochs) if e.stage != "awake"),
        None,
    )
    if sleep_onset_idx is None:
        return []

    episodes: list[dict] = []
    in_wake = False
    wake_start_idx = 0

    for i, epoch in enumerate(epochs):
        if i < sleep_onset_idx:
            continue

        if epoch.stage == "awake" and not in_wake:
            in_wake = True
            wake_start_idx = i
        elif epoch.stage != "awake" and in_wake:
            in_wake = False
            duration_s = (i - wake_start_idx) * EPOCH_SECONDS
            episodes.append(
                {
                    "start": epochs[wake_start_idx].timestamp,
                    "duration_s": duration_s,
                    "duration_m": duration_s // 60,
                }
            )

    # Handle wake episode at end of record
    if in_wake:
        duration_s = (len(epochs) - wake_start_idx) * EPOCH_SECONDS
        episodes.append(
            {
                "start": epochs[wake_start_idx].timestamp,
                "duration_s": duration_s,
                "duration_m": duration_s // 60,
            }
        )

    return episodes


def to_raw_sleep_record(parsed: ParsedSleepPeriod) -> dict:
    """Convert ParsedSleepPeriod to the Somnia RawSleepRecord schema.

    Maps Oura fields to the normalized schema consumed by the metric engine.
    """
    return {
        "source": "oura",
        "source_id": parsed.oura_id,
        "date": parsed.date,
        "hrv_ms": [
            abs(v) for v in parsed.hrv_series if v is not None and v != 0
        ],
        "sleep_stages": {
            "light": parsed.light_s // 60,
            "deep": parsed.deep_s // 60,
            "rem": parsed.rem_s // 60,
            "awake": parsed.awake_s // 60,
            "total": parsed.total_sleep_s // 60,
        },
        "total_sleep_min": parsed.total_sleep_s // 60,
        "time_in_bed_min": parsed.time_in_bed_s // 60,
        "sleep_onset_min": parsed.latency_s // 60,
        "wake_episodes": [
            {"duration": e["duration_m"]}
            for e in parsed.wake_episodes
            if e["duration_m"] > 0
        ],
        "resting_hr": parsed.resting_hr,
        "resp_rate": parsed.avg_breath,
        "skin_temp_delta": None,  # comes from daily_readiness endpoint
        "sleep_start_ts": int(parsed.bedtime_start.timestamp()),
        "wake_time_ts": int(parsed.bedtime_end.timestamp()),
    }
