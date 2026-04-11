"""Google Health Connect data parsers and normalization.

Parses Health Connect record payloads (sent from the React Native app)
into the Somnia RawSleepRecord schema for metric computation.

The mobile app reads Health Connect on-device via
react-native-health-connect and POSTs structured JSON to the backend.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime

from somnia.integrations.health_connect.constants import SLEEP_STAGE_MAP


@dataclass
class HealthConnectSleepStage:
    """A single sleep stage within a Health Connect sleep session."""

    start_time: datetime
    end_time: datetime
    stage_type: int  # 0-6 per Health Connect Stage enum

    @property
    def stage(self) -> str:
        return SLEEP_STAGE_MAP.get(self.stage_type, "unknown")

    @property
    def duration_seconds(self) -> int:
        return int((self.end_time - self.start_time).total_seconds())

    @property
    def duration_minutes(self) -> int:
        return self.duration_seconds // 60


@dataclass
class ParsedHealthConnectSleep:
    """Parsed and aggregated sleep session from Health Connect."""

    date: str
    source_package: str

    # Timestamps
    session_start: datetime
    session_end: datetime

    # Stage durations (minutes)
    deep_min: int
    rem_min: int
    light_min: int
    awake_min: int
    total_sleep_min: int
    time_in_bed_min: int

    # Vitals
    hrv_samples: list[float] = field(default_factory=list)  # RMSSD ms
    hr_samples: list[float] = field(default_factory=list)  # bpm
    resting_hr: float = 0.0
    resp_rate: float = 0.0
    spo2_samples: list[float] = field(default_factory=list)  # percentage
    body_temp_delta: float | None = None

    # Wake episodes
    wake_episodes: list[dict] = field(default_factory=list)

    # Raw stages
    stages: list[HealthConnectSleepStage] = field(default_factory=list)


def parse_health_connect_sleep(payload: dict) -> ParsedHealthConnectSleep:
    """Parse a Health Connect sync payload from the mobile app.

    Expected payload structure (sent by React Native app):
    {
        "date": "2026-03-18",
        "sleep_sessions": [{
            "start_time": "...",
            "end_time": "...",
            "stages": [{"start_time": "...", "end_time": "...", "stage_type": 5}, ...],
            "source_package": "com.samsung.health"
        }],
        "hrv_samples": [{"timestamp": "...", "value": 45.2}, ...],
        "hr_samples": [{"timestamp": "...", "value": 58}, ...],
        "resting_hr": 54.0,
        "resp_rate": 14.5,
        "spo2_samples": [{"timestamp": "...", "value": 97.2}, ...],
        "body_temp_delta": -0.3
    }
    """
    sessions = payload.get("sleep_sessions", [])
    if not sessions:
        return ParsedHealthConnectSleep(
            date=payload.get("date", ""),
            source_package="",
            session_start=datetime.min,
            session_end=datetime.min,
            deep_min=0,
            rem_min=0,
            light_min=0,
            awake_min=0,
            total_sleep_min=0,
            time_in_bed_min=0,
        )

    # Use the longest session as primary (main overnight sleep)
    main_session = max(sessions, key=lambda s: _session_duration(s))

    session_start = datetime.fromisoformat(main_session["start_time"])
    session_end = datetime.fromisoformat(main_session["end_time"])

    # Parse stages
    stages = _parse_stages(main_session.get("stages", []))

    # Aggregate stage durations
    stage_minutes: dict[str, int] = {"deep": 0, "rem": 0, "light": 0, "awake": 0}
    for s in stages:
        stage = s.stage
        if stage in stage_minutes:
            stage_minutes[stage] += s.duration_minutes
        elif stage == "unknown":
            stage_minutes["light"] += s.duration_minutes

    deep_min = stage_minutes["deep"]
    rem_min = stage_minutes["rem"]
    light_min = stage_minutes["light"]
    awake_min = stage_minutes["awake"]
    total_sleep_min = deep_min + rem_min + light_min
    time_in_bed_min = int((session_end - session_start).total_seconds() // 60)

    # Extract wake episodes
    wake_episodes = _extract_wake_episodes(stages)

    # Parse vitals
    hrv_samples = [s["value"] for s in payload.get("hrv_samples", []) if s.get("value")]
    hr_samples = [s["value"] for s in payload.get("hr_samples", []) if s.get("value")]
    spo2_samples = [
        s["value"] * 100 if s["value"] <= 1.0 else s["value"]
        for s in payload.get("spo2_samples", [])
        if s.get("value")
    ]

    return ParsedHealthConnectSleep(
        date=payload.get("date", ""),
        source_package=main_session.get("source_package", ""),
        session_start=session_start,
        session_end=session_end,
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
        body_temp_delta=payload.get("body_temp_delta"),
        wake_episodes=wake_episodes,
        stages=stages,
    )


def _session_duration(session: dict) -> int:
    """Calculate session duration in seconds for sorting."""
    try:
        start = datetime.fromisoformat(session["start_time"])
        end = datetime.fromisoformat(session["end_time"])
        return int((end - start).total_seconds())
    except (KeyError, ValueError):
        return 0


def _parse_stages(raw: list[dict]) -> list[HealthConnectSleepStage]:
    """Parse raw stage dicts into typed objects."""
    stages: list[HealthConnectSleepStage] = []
    for item in raw:
        try:
            start = datetime.fromisoformat(item["start_time"])
            end = datetime.fromisoformat(item["end_time"])
            stage_type = int(item.get("stage_type", 0))
            # Skip out_of_bed stages
            if stage_type == 3:
                continue
            stages.append(HealthConnectSleepStage(
                start_time=start,
                end_time=end,
                stage_type=stage_type,
            ))
        except (KeyError, ValueError):
            continue
    stages.sort(key=lambda s: s.start_time)
    return stages


def _extract_wake_episodes(stages: list[HealthConnectSleepStage]) -> list[dict]:
    """Extract wake episodes after initial sleep onset."""
    if not stages:
        return []

    onset_idx = next(
        (i for i, s in enumerate(stages) if s.stage not in ("awake", "out_of_bed", "unknown")),
        None,
    )
    if onset_idx is None:
        return []

    episodes: list[dict] = []
    for s in stages[onset_idx:]:
        if s.stage == "awake" and s.duration_minutes > 0:
            episodes.append({
                "start": s.start_time,
                "duration_s": s.duration_seconds,
                "duration_m": s.duration_minutes,
            })
    return episodes


def to_raw_sleep_record(parsed: ParsedHealthConnectSleep) -> dict:
    """Convert ParsedHealthConnectSleep to the Somnia RawSleepRecord schema."""
    return {
        "source": "health_connect",
        "source_id": f"hc-{parsed.date}-{parsed.source_package}",
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
        "skin_temp_delta": parsed.body_temp_delta,
        "sleep_start_ts": int(parsed.session_start.timestamp()) if parsed.session_start != datetime.min else 0,
        "wake_time_ts": int(parsed.session_end.timestamp()) if parsed.session_end != datetime.min else 0,
    }


def _estimate_sleep_onset(parsed: ParsedHealthConnectSleep) -> int:
    """Estimate sleep onset latency from stage sequence."""
    onset_minutes = 0
    for s in parsed.stages:
        if s.stage in ("awake", "unknown"):
            onset_minutes += s.duration_minutes
        else:
            break
    return onset_minutes
