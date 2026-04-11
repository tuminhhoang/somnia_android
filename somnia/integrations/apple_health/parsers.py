"""Apple HealthKit data parsers and normalization.

Parses HealthKit sample payloads (sent from the React Native app) into
the Somnia RawSleepRecord schema for metric computation.

The mobile app reads HealthKit on-device and POSTs structured JSON
to the backend — this module normalizes that payload.
"""

from __future__ import annotations

import statistics
from dataclasses import dataclass, field
from datetime import datetime, timedelta

from somnia.integrations.apple_health.constants import SLEEP_STAGE_MAP


@dataclass
class HealthKitSleepSample:
    """A single HealthKit sleep analysis sample."""

    start_date: datetime
    end_date: datetime
    value: int  # 0=inBed, 1=asleepUnspecified, 2=awake, 3=core, 4=deep, 5=REM
    source_name: str = ""
    source_bundle_id: str = ""

    @property
    def stage(self) -> str:
        return SLEEP_STAGE_MAP.get(self.value, "unknown")

    @property
    def duration_seconds(self) -> int:
        return int((self.end_date - self.start_date).total_seconds())

    @property
    def duration_minutes(self) -> int:
        return self.duration_seconds // 60


@dataclass
class ParsedHealthKitSleep:
    """Parsed and aggregated sleep session from HealthKit samples."""

    date: str
    source_name: str

    # Timestamps
    bedtime_start: datetime
    bedtime_end: datetime

    # Stage durations (minutes)
    deep_min: int
    rem_min: int
    light_min: int
    awake_min: int
    total_sleep_min: int
    time_in_bed_min: int

    # Vitals (from companion samples)
    hrv_samples: list[float] = field(default_factory=list)  # SDNN ms
    hr_samples: list[float] = field(default_factory=list)  # bpm
    resting_hr: float = 0.0  # bpm
    resp_rate: float = 0.0  # breaths/min
    spo2_samples: list[float] = field(default_factory=list)  # percentage
    wrist_temp_delta: float | None = None  # °C

    # Wake episodes
    wake_episodes: list[dict] = field(default_factory=list)

    # Raw samples for debugging
    samples: list[HealthKitSleepSample] = field(default_factory=list)


def parse_healthkit_sleep(payload: dict) -> ParsedHealthKitSleep:
    """Parse a HealthKit sleep payload from the mobile app.

    Expected payload structure (sent by React Native app):
    {
        "date": "2026-03-18",
        "sleep_samples": [
            {"start_date": "...", "end_date": "...", "value": 3, "source_name": "..."},
            ...
        ],
        "hrv_samples": [{"timestamp": "...", "value": 45.2}, ...],
        "hr_samples": [{"timestamp": "...", "value": 58}, ...],
        "resting_hr": 54.0,
        "resp_rate": 14.5,
        "spo2_samples": [{"timestamp": "...", "value": 97.2}, ...],
        "wrist_temp_delta": -0.3
    }
    """
    # Parse sleep samples
    raw_samples = payload.get("sleep_samples", [])
    samples = _parse_sleep_samples(raw_samples)

    if not samples:
        return ParsedHealthKitSleep(
            date=payload.get("date", ""),
            source_name="",
            bedtime_start=datetime.min,
            bedtime_end=datetime.min,
            deep_min=0,
            rem_min=0,
            light_min=0,
            awake_min=0,
            total_sleep_min=0,
            time_in_bed_min=0,
        )

    # Sort by start time
    samples.sort(key=lambda s: s.start_date)

    # Overall session boundaries
    bedtime_start = samples[0].start_date
    bedtime_end = samples[-1].end_date

    # Aggregate stage durations
    stage_minutes: dict[str, int] = {"deep": 0, "rem": 0, "light": 0, "awake": 0}
    for s in samples:
        stage = s.stage
        if stage in stage_minutes:
            stage_minutes[stage] += s.duration_minutes
        elif stage == "asleep_unspecified":
            # If Apple Watch doesn't distinguish stages, count as light
            stage_minutes["light"] += s.duration_minutes

    deep_min = stage_minutes["deep"]
    rem_min = stage_minutes["rem"]
    light_min = stage_minutes["light"]
    awake_min = stage_minutes["awake"]
    total_sleep_min = deep_min + rem_min + light_min
    time_in_bed_min = int((bedtime_end - bedtime_start).total_seconds() // 60)

    # Extract wake episodes (after sleep onset)
    wake_episodes = _extract_wake_episodes(samples)

    # Parse vitals
    hrv_samples = [s["value"] for s in payload.get("hrv_samples", []) if s.get("value")]
    hr_samples = [s["value"] for s in payload.get("hr_samples", []) if s.get("value")]
    spo2_samples = [
        s["value"] * 100 if s["value"] <= 1.0 else s["value"]
        for s in payload.get("spo2_samples", [])
        if s.get("value")
    ]

    source_name = samples[0].source_name if samples else ""

    return ParsedHealthKitSleep(
        date=payload.get("date", ""),
        source_name=source_name,
        bedtime_start=bedtime_start,
        bedtime_end=bedtime_end,
        deep_min=deep_min,
        rem_min=rem_min,
        light_min=light_min,
        awake_min=awake_min,
        total_sleep_min=total_sleep_min,
        time_in_bed_min=time_in_bed_min,
        hrv_samples=hrv_samples,
        hr_samples=hr_samples,
        resting_hr=payload.get("resting_hr", 0.0) or 0.0,
        resp_rate=payload.get("resp_rate", 0.0) or 0.0,
        spo2_samples=spo2_samples,
        wrist_temp_delta=payload.get("wrist_temp_delta"),
        wake_episodes=wake_episodes,
        samples=samples,
    )


def _parse_sleep_samples(raw: list[dict]) -> list[HealthKitSleepSample]:
    """Parse raw sleep sample dicts into typed objects."""
    samples: list[HealthKitSleepSample] = []
    for item in raw:
        try:
            start = datetime.fromisoformat(item["start_date"])
            end = datetime.fromisoformat(item["end_date"])
            value = int(item.get("value", 1))
            # Skip "inBed" samples (value=0) — they overlap with stage samples
            if value == 0:
                continue
            samples.append(
                HealthKitSleepSample(
                    start_date=start,
                    end_date=end,
                    value=value,
                    source_name=item.get("source_name", ""),
                    source_bundle_id=item.get("source_bundle_id", ""),
                )
            )
        except (KeyError, ValueError):
            continue
    return samples


def _extract_wake_episodes(samples: list[HealthKitSleepSample]) -> list[dict]:
    """Extract wake episodes from sorted sleep samples.

    Only includes awakenings after initial sleep onset.
    """
    # Find first non-awake sample (sleep onset)
    onset_idx = next(
        (i for i, s in enumerate(samples) if s.stage not in ("awake", "in_bed")),
        None,
    )
    if onset_idx is None:
        return []

    episodes: list[dict] = []
    for s in samples[onset_idx:]:
        if s.stage == "awake" and s.duration_minutes > 0:
            episodes.append(
                {
                    "start": s.start_date,
                    "duration_s": s.duration_seconds,
                    "duration_m": s.duration_minutes,
                }
            )

    return episodes


def to_raw_sleep_record(parsed: ParsedHealthKitSleep) -> dict:
    """Convert ParsedHealthKitSleep to the Somnia RawSleepRecord schema.

    Maps Apple HealthKit fields to the normalized schema consumed by the
    metric engine — same output format as the Oura integration.
    """
    return {
        "source": "apple_health",
        "source_id": f"hk-{parsed.date}-{parsed.source_name}",
        "date": parsed.date,
        "hrv_ms": parsed.hrv_samples,
        "spo2": parsed.spo2_samples,
        "sleep_stages": {
            "light": parsed.light_min,
            "deep": parsed.deep_min,
            "rem": parsed.rem_min,
            "awake": parsed.awake_min,
            "total": parsed.total_sleep_min,
        },
        "total_sleep_min": parsed.total_sleep_min,
        "time_in_bed_min": parsed.time_in_bed_min,
        "sleep_onset_min": _estimate_sleep_onset(parsed),
        "wake_episodes": [
            {"duration": e["duration_m"]}
            for e in parsed.wake_episodes
            if e["duration_m"] > 0
        ],
        "resting_hr": parsed.resting_hr,
        "resp_rate": parsed.resp_rate,
        "skin_temp_delta": parsed.wrist_temp_delta,
        "sleep_start_ts": int(parsed.bedtime_start.timestamp()) if parsed.bedtime_start != datetime.min else 0,
        "wake_time_ts": int(parsed.bedtime_end.timestamp()) if parsed.bedtime_end != datetime.min else 0,
    }


def _estimate_sleep_onset(parsed: ParsedHealthKitSleep) -> int:
    """Estimate sleep onset latency from sample sequence.

    Counts minutes of awake time before the first sleep stage sample.
    """
    if not parsed.samples:
        return 0

    onset_minutes = 0
    for s in parsed.samples:
        if s.stage in ("awake", "in_bed", "asleep_unspecified"):
            onset_minutes += s.duration_minutes
        else:
            break
    return onset_minutes
