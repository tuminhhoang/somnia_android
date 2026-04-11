"""Tests for Apple HealthKit integration — parsers and ingest."""

from datetime import datetime

import pytest

from somnia.integrations.apple_health.parsers import (
    HealthKitSleepSample,
    parse_healthkit_sleep,
    to_raw_sleep_record,
    _extract_wake_episodes,
    _parse_sleep_samples,
    _estimate_sleep_onset,
)
from somnia.integrations.apple_health.ingest import ingest_healthkit_payload
from somnia.integrations.apple_health.constants import SLEEP_STAGE_MAP


def _make_payload(**overrides) -> dict:
    """Build a minimal HealthKit sync payload for testing."""
    base = {
        "date": "2026-03-18",
        "sleep_samples": [
            {
                "start_date": "2026-03-17T23:00:00+00:00",
                "end_date": "2026-03-17T23:12:00+00:00",
                "value": 2,  # awake (sleep latency)
                "source_name": "Apple Watch",
            },
            {
                "start_date": "2026-03-17T23:12:00+00:00",
                "end_date": "2026-03-18T00:30:00+00:00",
                "value": 4,  # deep
                "source_name": "Apple Watch",
            },
            {
                "start_date": "2026-03-18T00:30:00+00:00",
                "end_date": "2026-03-18T02:00:00+00:00",
                "value": 3,  # light (core)
                "source_name": "Apple Watch",
            },
            {
                "start_date": "2026-03-18T02:00:00+00:00",
                "end_date": "2026-03-18T02:10:00+00:00",
                "value": 2,  # awake (mid-sleep)
                "source_name": "Apple Watch",
            },
            {
                "start_date": "2026-03-18T02:10:00+00:00",
                "end_date": "2026-03-18T03:30:00+00:00",
                "value": 5,  # REM
                "source_name": "Apple Watch",
            },
            {
                "start_date": "2026-03-18T03:30:00+00:00",
                "end_date": "2026-03-18T06:30:00+00:00",
                "value": 3,  # light
                "source_name": "Apple Watch",
            },
        ],
        "hrv_samples": [
            {"timestamp": "2026-03-18T00:00:00+00:00", "value": 45.2},
            {"timestamp": "2026-03-18T01:00:00+00:00", "value": 52.1},
            {"timestamp": "2026-03-18T02:00:00+00:00", "value": 48.7},
            {"timestamp": "2026-03-18T03:00:00+00:00", "value": 50.3},
        ],
        "hr_samples": [
            {"timestamp": "2026-03-18T00:00:00+00:00", "value": 56},
            {"timestamp": "2026-03-18T01:00:00+00:00", "value": 54},
            {"timestamp": "2026-03-18T02:00:00+00:00", "value": 58},
        ],
        "resting_hr": 52.0,
        "resp_rate": 14.5,
        "spo2_samples": [
            {"timestamp": "2026-03-18T01:00:00+00:00", "value": 0.972},
            {"timestamp": "2026-03-18T03:00:00+00:00", "value": 0.968},
        ],
        "wrist_temp_delta": -0.3,
    }
    base.update(overrides)
    return base


# ---- HealthKitSleepSample ----


class TestHealthKitSleepSample:
    def test_stage_mapping(self):
        s = HealthKitSleepSample(
            start_date=datetime(2026, 3, 18, 0, 0),
            end_date=datetime(2026, 3, 18, 1, 0),
            value=4,
        )
        assert s.stage == "deep"
        assert s.duration_minutes == 60

    def test_all_stage_values(self):
        for val, expected in SLEEP_STAGE_MAP.items():
            s = HealthKitSleepSample(
                start_date=datetime(2026, 1, 1),
                end_date=datetime(2026, 1, 1, 0, 5),
                value=val,
            )
            assert s.stage == expected

    def test_unknown_stage(self):
        s = HealthKitSleepSample(
            start_date=datetime(2026, 1, 1),
            end_date=datetime(2026, 1, 1, 0, 5),
            value=99,
        )
        assert s.stage == "unknown"


# ---- parse_sleep_samples ----


class TestParseSleepSamples:
    def test_parses_valid_samples(self):
        raw = [
            {"start_date": "2026-03-18T00:00:00+00:00", "end_date": "2026-03-18T01:00:00+00:00", "value": 4},
            {"start_date": "2026-03-18T01:00:00+00:00", "end_date": "2026-03-18T02:00:00+00:00", "value": 3},
        ]
        samples = _parse_sleep_samples(raw)
        assert len(samples) == 2
        assert samples[0].stage == "deep"
        assert samples[1].stage == "light"

    def test_skips_in_bed_samples(self):
        raw = [
            {"start_date": "2026-03-18T00:00:00+00:00", "end_date": "2026-03-18T08:00:00+00:00", "value": 0},
            {"start_date": "2026-03-18T00:00:00+00:00", "end_date": "2026-03-18T01:00:00+00:00", "value": 4},
        ]
        samples = _parse_sleep_samples(raw)
        assert len(samples) == 1  # inBed (0) skipped

    def test_handles_invalid_entries(self):
        raw = [
            {"start_date": "invalid", "end_date": "2026-03-18T01:00:00+00:00", "value": 4},
            {},
            {"start_date": "2026-03-18T00:00:00+00:00", "end_date": "2026-03-18T01:00:00+00:00", "value": 3},
        ]
        samples = _parse_sleep_samples(raw)
        assert len(samples) == 1


# ---- extract_wake_episodes ----


class TestExtractWakeEpisodes:
    def test_mid_sleep_wake(self):
        samples = _parse_sleep_samples([
            {"start_date": "2026-03-18T00:00:00+00:00", "end_date": "2026-03-18T02:00:00+00:00", "value": 4},
            {"start_date": "2026-03-18T02:00:00+00:00", "end_date": "2026-03-18T02:15:00+00:00", "value": 2},
            {"start_date": "2026-03-18T02:15:00+00:00", "end_date": "2026-03-18T04:00:00+00:00", "value": 3},
        ])
        episodes = _extract_wake_episodes(samples)
        assert len(episodes) == 1
        assert episodes[0]["duration_m"] == 15

    def test_no_wake_after_onset(self):
        samples = _parse_sleep_samples([
            {"start_date": "2026-03-18T00:00:00+00:00", "end_date": "2026-03-18T04:00:00+00:00", "value": 4},
            {"start_date": "2026-03-18T04:00:00+00:00", "end_date": "2026-03-18T06:00:00+00:00", "value": 3},
        ])
        episodes = _extract_wake_episodes(samples)
        assert episodes == []

    def test_initial_awake_excluded(self):
        samples = _parse_sleep_samples([
            {"start_date": "2026-03-18T00:00:00+00:00", "end_date": "2026-03-18T00:20:00+00:00", "value": 2},
            {"start_date": "2026-03-18T00:20:00+00:00", "end_date": "2026-03-18T04:00:00+00:00", "value": 4},
        ])
        episodes = _extract_wake_episodes(samples)
        assert episodes == []  # initial awake is sleep latency, not a wake episode

    def test_empty_samples(self):
        assert _extract_wake_episodes([]) == []


# ---- parse_healthkit_sleep ----


class TestParseHealthKitSleep:
    def test_full_parse(self):
        payload = _make_payload()
        parsed = parse_healthkit_sleep(payload)

        assert parsed.date == "2026-03-18"
        assert parsed.source_name == "Apple Watch"
        assert parsed.deep_min == 78  # 23:12 to 00:30 = 78 min
        assert parsed.rem_min == 80  # 02:10 to 03:30
        assert parsed.light_min == 90 + 180  # 00:30-02:00 + 03:30-06:30
        assert parsed.awake_min == 12 + 10  # initial + mid-sleep
        assert parsed.total_sleep_min == parsed.deep_min + parsed.rem_min + parsed.light_min

    def test_hrv_samples_extracted(self):
        payload = _make_payload()
        parsed = parse_healthkit_sleep(payload)
        assert len(parsed.hrv_samples) == 4
        assert parsed.hrv_samples[0] == 45.2

    def test_spo2_converted_from_fraction(self):
        payload = _make_payload()
        parsed = parse_healthkit_sleep(payload)
        assert len(parsed.spo2_samples) == 2
        assert parsed.spo2_samples[0] == 97.2  # 0.972 * 100

    def test_vitals(self):
        payload = _make_payload()
        parsed = parse_healthkit_sleep(payload)
        assert parsed.resting_hr == 52.0
        assert parsed.resp_rate == 14.5
        assert parsed.wrist_temp_delta == -0.3

    def test_wake_episodes_derived(self):
        payload = _make_payload()
        parsed = parse_healthkit_sleep(payload)
        assert len(parsed.wake_episodes) == 1
        assert parsed.wake_episodes[0]["duration_m"] == 10

    def test_empty_samples(self):
        payload = _make_payload(sleep_samples=[])
        parsed = parse_healthkit_sleep(payload)
        assert parsed.total_sleep_min == 0

    def test_unspecified_sleep_counts_as_light(self):
        payload = _make_payload(sleep_samples=[
            {"start_date": "2026-03-18T00:00:00+00:00", "end_date": "2026-03-18T06:00:00+00:00",
             "value": 1, "source_name": "Old Watch"},
        ])
        parsed = parse_healthkit_sleep(payload)
        assert parsed.light_min == 360  # all counted as light
        assert parsed.deep_min == 0
        assert parsed.rem_min == 0


# ---- to_raw_sleep_record ----


class TestToRawSleepRecord:
    def test_conversion(self):
        payload = _make_payload()
        parsed = parse_healthkit_sleep(payload)
        record = to_raw_sleep_record(parsed)

        assert record["source"] == "apple_health"
        assert record["date"] == "2026-03-18"
        assert record["total_sleep_min"] == parsed.total_sleep_min
        assert record["time_in_bed_min"] == parsed.time_in_bed_min
        assert record["resting_hr"] == 52.0
        assert record["resp_rate"] == 14.5
        assert record["skin_temp_delta"] == -0.3
        assert len(record["hrv_ms"]) == 4
        assert len(record["spo2"]) == 2
        assert record["sleep_stages"]["deep"] == parsed.deep_min
        assert record["sleep_stages"]["rem"] == parsed.rem_min
        assert record["sleep_stages"]["total"] == parsed.total_sleep_min

    def test_wake_episodes_mapped(self):
        payload = _make_payload()
        parsed = parse_healthkit_sleep(payload)
        record = to_raw_sleep_record(parsed)
        assert len(record["wake_episodes"]) == 1
        assert "duration" in record["wake_episodes"][0]

    def test_sleep_onset_estimated(self):
        payload = _make_payload()
        parsed = parse_healthkit_sleep(payload)
        record = to_raw_sleep_record(parsed)
        assert record["sleep_onset_min"] == 12  # initial awake period


# ---- ingest_healthkit_payload ----


class TestIngestHealthKitPayload:
    def test_successful_ingest(self):
        payload = _make_payload()
        result = ingest_healthkit_payload("patient-001", payload)

        assert result["patient_id"] == "patient-001"
        assert result["source"] == "apple_health"
        assert result["date"] == "2026-03-18"
        assert result["total_sleep_min"] > 0

    def test_no_sleep_data(self):
        payload = _make_payload(sleep_samples=[])
        result = ingest_healthkit_payload("patient-001", payload)
        assert result["status"] == "no_sleep_data"

    def test_record_matches_schema(self):
        payload = _make_payload()
        result = ingest_healthkit_payload("patient-001", payload)

        # Verify all RawSleepRecord keys are present
        expected_keys = {
            "source", "source_id", "date", "hrv_ms", "spo2",
            "sleep_stages", "total_sleep_min", "time_in_bed_min",
            "sleep_onset_min", "wake_episodes", "resting_hr",
            "resp_rate", "skin_temp_delta", "sleep_start_ts",
            "wake_time_ts", "patient_id",
        }
        assert expected_keys.issubset(set(result.keys()))
