"""Tests for Google Health Connect integration — parsers and ingest."""

from datetime import datetime

import pytest

from somnia.integrations.health_connect.parsers import (
    HealthConnectSleepStage,
    parse_health_connect_sleep,
    to_raw_sleep_record,
    _extract_wake_episodes,
    _parse_stages,
    _estimate_sleep_onset,
)
from somnia.integrations.health_connect.ingest import ingest_health_connect_payload
from somnia.integrations.health_connect.constants import SLEEP_STAGE_MAP


def _make_payload(**overrides) -> dict:
    """Build a minimal Health Connect sync payload for testing."""
    base = {
        "date": "2026-03-18",
        "sleep_sessions": [
            {
                "start_time": "2026-03-17T23:00:00+00:00",
                "end_time": "2026-03-18T06:30:00+00:00",
                "source_package": "com.samsung.health",
                "stages": [
                    {"start_time": "2026-03-17T23:00:00+00:00", "end_time": "2026-03-17T23:15:00+00:00", "stage_type": 1},  # awake
                    {"start_time": "2026-03-17T23:15:00+00:00", "end_time": "2026-03-18T00:30:00+00:00", "stage_type": 5},  # deep
                    {"start_time": "2026-03-18T00:30:00+00:00", "end_time": "2026-03-18T02:00:00+00:00", "stage_type": 4},  # light
                    {"start_time": "2026-03-18T02:00:00+00:00", "end_time": "2026-03-18T02:10:00+00:00", "stage_type": 1},  # awake
                    {"start_time": "2026-03-18T02:10:00+00:00", "end_time": "2026-03-18T03:30:00+00:00", "stage_type": 6},  # REM
                    {"start_time": "2026-03-18T03:30:00+00:00", "end_time": "2026-03-18T06:30:00+00:00", "stage_type": 4},  # light
                ],
            }
        ],
        "hrv_samples": [
            {"timestamp": "2026-03-18T00:00:00+00:00", "value": 42.5},
            {"timestamp": "2026-03-18T02:00:00+00:00", "value": 48.1},
            {"timestamp": "2026-03-18T04:00:00+00:00", "value": 51.3},
        ],
        "hr_samples": [
            {"timestamp": "2026-03-18T00:00:00+00:00", "value": 55},
            {"timestamp": "2026-03-18T02:00:00+00:00", "value": 53},
        ],
        "resting_hr": 51.0,
        "resp_rate": 15.0,
        "spo2_samples": [
            {"timestamp": "2026-03-18T01:00:00+00:00", "value": 96.8},
        ],
        "body_temp_delta": -0.2,
    }
    base.update(overrides)
    return base


# ---- HealthConnectSleepStage ----


class TestHealthConnectSleepStage:
    def test_stage_mapping(self):
        s = HealthConnectSleepStage(
            start_time=datetime(2026, 3, 18, 0, 0),
            end_time=datetime(2026, 3, 18, 1, 30),
            stage_type=5,
        )
        assert s.stage == "deep"
        assert s.duration_minutes == 90

    def test_all_stage_values(self):
        for val, expected in SLEEP_STAGE_MAP.items():
            s = HealthConnectSleepStage(
                start_time=datetime(2026, 1, 1),
                end_time=datetime(2026, 1, 1, 0, 5),
                stage_type=val,
            )
            assert s.stage == expected


# ---- _parse_stages ----


class TestParseStages:
    def test_parses_valid_stages(self):
        raw = [
            {"start_time": "2026-03-18T00:00:00+00:00", "end_time": "2026-03-18T01:00:00+00:00", "stage_type": 5},
            {"start_time": "2026-03-18T01:00:00+00:00", "end_time": "2026-03-18T02:00:00+00:00", "stage_type": 4},
        ]
        stages = _parse_stages(raw)
        assert len(stages) == 2
        assert stages[0].stage == "deep"
        assert stages[1].stage == "light"

    def test_skips_out_of_bed(self):
        raw = [
            {"start_time": "2026-03-18T00:00:00+00:00", "end_time": "2026-03-18T01:00:00+00:00", "stage_type": 3},
            {"start_time": "2026-03-18T01:00:00+00:00", "end_time": "2026-03-18T02:00:00+00:00", "stage_type": 5},
        ]
        stages = _parse_stages(raw)
        assert len(stages) == 1  # out_of_bed skipped

    def test_handles_invalid(self):
        raw = [{"invalid": True}, {"start_time": "2026-03-18T00:00:00+00:00", "end_time": "2026-03-18T01:00:00+00:00", "stage_type": 4}]
        stages = _parse_stages(raw)
        assert len(stages) == 1

    def test_sorted_by_start_time(self):
        raw = [
            {"start_time": "2026-03-18T02:00:00+00:00", "end_time": "2026-03-18T03:00:00+00:00", "stage_type": 6},
            {"start_time": "2026-03-18T00:00:00+00:00", "end_time": "2026-03-18T01:00:00+00:00", "stage_type": 5},
        ]
        stages = _parse_stages(raw)
        assert stages[0].stage == "deep"  # earlier start time first


# ---- _extract_wake_episodes ----


class TestExtractWakeEpisodes:
    def test_mid_sleep_wake(self):
        stages = _parse_stages([
            {"start_time": "2026-03-18T00:00:00+00:00", "end_time": "2026-03-18T02:00:00+00:00", "stage_type": 5},
            {"start_time": "2026-03-18T02:00:00+00:00", "end_time": "2026-03-18T02:15:00+00:00", "stage_type": 1},
            {"start_time": "2026-03-18T02:15:00+00:00", "end_time": "2026-03-18T04:00:00+00:00", "stage_type": 4},
        ])
        episodes = _extract_wake_episodes(stages)
        assert len(episodes) == 1
        assert episodes[0]["duration_m"] == 15

    def test_initial_awake_excluded(self):
        stages = _parse_stages([
            {"start_time": "2026-03-18T00:00:00+00:00", "end_time": "2026-03-18T00:20:00+00:00", "stage_type": 1},
            {"start_time": "2026-03-18T00:20:00+00:00", "end_time": "2026-03-18T04:00:00+00:00", "stage_type": 5},
        ])
        episodes = _extract_wake_episodes(stages)
        assert episodes == []

    def test_empty(self):
        assert _extract_wake_episodes([]) == []


# ---- parse_health_connect_sleep ----


class TestParseHealthConnectSleep:
    def test_full_parse(self):
        payload = _make_payload()
        parsed = parse_health_connect_sleep(payload)

        assert parsed.date == "2026-03-18"
        assert parsed.source_package == "com.samsung.health"
        assert parsed.deep_min == 75  # 23:15 to 00:30
        assert parsed.rem_min == 80  # 02:10 to 03:30
        assert parsed.light_min == 90 + 180  # 00:30-02:00 + 03:30-06:30
        assert parsed.awake_min == 15 + 10  # initial + mid-sleep
        assert parsed.total_sleep_min == parsed.deep_min + parsed.rem_min + parsed.light_min

    def test_vitals(self):
        payload = _make_payload()
        parsed = parse_health_connect_sleep(payload)
        assert len(parsed.hrv_samples) == 3
        assert parsed.resting_hr == 51.0
        assert parsed.resp_rate == 15.0
        assert parsed.body_temp_delta == -0.2

    def test_wake_episodes(self):
        payload = _make_payload()
        parsed = parse_health_connect_sleep(payload)
        assert len(parsed.wake_episodes) == 1
        assert parsed.wake_episodes[0]["duration_m"] == 10

    def test_empty_sessions(self):
        payload = _make_payload(sleep_sessions=[])
        parsed = parse_health_connect_sleep(payload)
        assert parsed.total_sleep_min == 0

    def test_picks_longest_session(self):
        payload = _make_payload(sleep_sessions=[
            {
                "start_time": "2026-03-18T14:00:00+00:00",
                "end_time": "2026-03-18T14:30:00+00:00",
                "source_package": "nap",
                "stages": [{"start_time": "2026-03-18T14:00:00+00:00", "end_time": "2026-03-18T14:30:00+00:00", "stage_type": 4}],
            },
            {
                "start_time": "2026-03-17T23:00:00+00:00",
                "end_time": "2026-03-18T06:00:00+00:00",
                "source_package": "main",
                "stages": [{"start_time": "2026-03-17T23:00:00+00:00", "end_time": "2026-03-18T06:00:00+00:00", "stage_type": 5}],
            },
        ])
        parsed = parse_health_connect_sleep(payload)
        assert parsed.source_package == "main"


# ---- to_raw_sleep_record ----


class TestToRawSleepRecord:
    def test_conversion(self):
        payload = _make_payload()
        parsed = parse_health_connect_sleep(payload)
        record = to_raw_sleep_record(parsed)

        assert record["source"] == "health_connect"
        assert record["date"] == "2026-03-18"
        assert record["total_sleep_min"] == parsed.total_sleep_min
        assert record["resting_hr"] == 51.0
        assert record["skin_temp_delta"] == -0.2
        assert len(record["hrv_ms"]) == 3
        assert record["sleep_stages"]["deep"] == parsed.deep_min
        assert record["sleep_stages"]["total"] == parsed.total_sleep_min

    def test_sleep_onset_estimated(self):
        payload = _make_payload()
        parsed = parse_health_connect_sleep(payload)
        record = to_raw_sleep_record(parsed)
        assert record["sleep_onset_min"] == 15  # initial awake


# ---- ingest_health_connect_payload ----


class TestIngestHealthConnectPayload:
    def test_successful_ingest(self):
        payload = _make_payload()
        result = ingest_health_connect_payload("patient-002", payload)

        assert result["patient_id"] == "patient-002"
        assert result["source"] == "health_connect"
        assert result["total_sleep_min"] > 0

    def test_no_sleep_data(self):
        payload = _make_payload(sleep_sessions=[])
        result = ingest_health_connect_payload("patient-002", payload)
        assert result["status"] == "no_sleep_data"

    def test_record_schema(self):
        payload = _make_payload()
        result = ingest_health_connect_payload("patient-002", payload)
        expected_keys = {
            "source", "source_id", "date", "hrv_ms", "spo2",
            "sleep_stages", "total_sleep_min", "time_in_bed_min",
            "sleep_onset_min", "wake_episodes", "resting_hr",
            "resp_rate", "skin_temp_delta", "sleep_start_ts",
            "wake_time_ts", "patient_id",
        }
        assert expected_keys.issubset(set(result.keys()))
