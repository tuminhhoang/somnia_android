"""Tests for Oura sleep data parsers and normalization."""

from datetime import datetime

import pytest

from somnia.integrations.oura.parsers import (
    ParsedSleepPeriod,
    SleepEpoch,
    _extract_wake_episodes,
    _parse_epochs,
    parse_sleep_period,
    to_raw_sleep_record,
)


def _make_raw_sleep(**overrides) -> dict:
    """Build a minimal raw Oura sleep API response for testing."""
    base = {
        "id": "oura-sleep-001",
        "day": "2026-03-18",
        "type": "long_sleep",
        "bedtime_start": "2026-03-17T23:00:00+00:00",
        "bedtime_end": "2026-03-18T07:00:00+00:00",
        "latency": 720,  # 12 min in seconds
        "efficiency": 88,
        "total_sleep_duration": 25200,  # 7h in seconds
        "time_in_bed": 28800,  # 8h in seconds
        "awake_time": 3600,  # 1h in seconds
        "deep_sleep_duration": 5400,  # 90 min
        "light_sleep_duration": 12600,  # 210 min
        "rem_sleep_duration": 7200,  # 120 min
        "restless_periods": 3,
        "lowest_heart_rate": 52,
        "average_heart_rate": 58.5,
        "average_hrv": 45,
        "average_breath": 14.2,
        # 5-min epoch string: 4 deep, 3 light, 2 rem, 1 awake, 2 light
        "sleep_phase_5_min": "444422231122",
        "hrv": {
            "interval": 300,
            "items": [None, 45, 52, 48, 50, 46, 44, 51, 49, 47, 53, 50],
            "timestamp": "2026-03-17T23:00:00+00:00",
        },
        "heart_rate": {
            "interval": 300,
            "items": [None, 58, 56, 54, 52, 53, 55, 54, 56, 57, 55, 56],
            "timestamp": "2026-03-17T23:00:00+00:00",
        },
    }
    base.update(overrides)
    return base


class TestParseEpochs:
    def test_basic_parsing(self):
        start = datetime(2026, 3, 17, 23, 0)
        epochs = _parse_epochs("4421", start)
        assert len(epochs) == 4
        assert epochs[0].stage == "deep"
        assert epochs[1].stage == "deep"
        assert epochs[2].stage == "light"
        assert epochs[3].stage == "awake"

    def test_timestamps_increment(self):
        start = datetime(2026, 3, 17, 23, 0)
        epochs = _parse_epochs("442", start)
        assert epochs[0].timestamp == start
        assert epochs[2].timestamp == datetime(2026, 3, 17, 23, 10)

    def test_empty_string(self):
        epochs = _parse_epochs("", datetime(2026, 1, 1))
        assert epochs == []

    def test_unknown_chars_skipped(self):
        epochs = _parse_epochs("4X21", datetime(2026, 1, 1))
        assert len(epochs) == 3  # X is skipped


class TestExtractWakeEpisodes:
    def test_no_wake_after_onset(self):
        start = datetime(2026, 3, 17, 23, 0)
        # All sleep after onset, no awake
        epochs = _parse_epochs("4422", start)
        episodes = _extract_wake_episodes(epochs)
        assert episodes == []

    def test_single_wake_episode(self):
        start = datetime(2026, 3, 17, 23, 0)
        # deep, deep, awake, awake, light, light
        epochs = _parse_epochs("441122", start)
        episodes = _extract_wake_episodes(epochs)
        assert len(episodes) == 1
        assert episodes[0]["duration_s"] == 600  # 2 epochs * 300s
        assert episodes[0]["duration_m"] == 10

    def test_initial_awake_excluded(self):
        start = datetime(2026, 3, 17, 23, 0)
        # awake, awake, deep, deep (no wake after sleep onset)
        epochs = _parse_epochs("1144", start)
        episodes = _extract_wake_episodes(epochs)
        assert episodes == []

    def test_multiple_wake_episodes(self):
        start = datetime(2026, 3, 17, 23, 0)
        # deep, awake, light, awake, rem
        epochs = _parse_epochs("41213", start)
        episodes = _extract_wake_episodes(epochs)
        assert len(episodes) == 2

    def test_empty_epochs(self):
        assert _extract_wake_episodes([]) == []

    def test_all_awake(self):
        start = datetime(2026, 3, 17, 23, 0)
        epochs = _parse_epochs("1111", start)
        episodes = _extract_wake_episodes(epochs)
        assert episodes == []  # never slept


class TestParseSleepPeriod:
    def test_basic_parse(self):
        raw = _make_raw_sleep()
        parsed = parse_sleep_period(raw)

        assert parsed.oura_id == "oura-sleep-001"
        assert parsed.date == "2026-03-18"
        assert parsed.sleep_type == "long_sleep"
        assert parsed.is_main_sleep is True
        assert parsed.resting_hr == 52
        assert parsed.avg_breath == 14.2
        assert parsed.latency_s == 720
        assert parsed.restless_count == 3

    def test_stage_durations_from_epochs(self):
        raw = _make_raw_sleep(sleep_phase_5_min="444422231122")
        parsed = parse_sleep_period(raw)
        # "444422231122": 4=deep(4), 2=light(5), 3=rem(1), 1=awake(2)
        assert parsed.deep_s == 4 * 300
        assert parsed.light_s == 5 * 300
        assert parsed.rem_s == 1 * 300
        assert parsed.awake_s == 2 * 300

    def test_fallback_to_api_durations(self):
        raw = _make_raw_sleep(sleep_phase_5_min="")
        parsed = parse_sleep_period(raw)
        assert parsed.deep_s == 5400  # from API field
        assert parsed.rem_s == 7200

    def test_hrv_series_parsed(self):
        raw = _make_raw_sleep()
        parsed = parse_sleep_period(raw)
        assert len(parsed.hrv_series) == 12
        assert parsed.avg_hrv_ms > 0

    def test_efficiency_from_api(self):
        raw = _make_raw_sleep(efficiency=92)
        parsed = parse_sleep_period(raw)
        assert parsed.efficiency == 92.0

    def test_wake_episodes_derived(self):
        # deep, deep, awake, light, light
        raw = _make_raw_sleep(sleep_phase_5_min="44122")
        parsed = parse_sleep_period(raw)
        assert len(parsed.wake_episodes) == 1
        assert parsed.wake_episodes[0]["duration_m"] == 5


class TestToRawSleepRecord:
    def test_conversion(self):
        raw = _make_raw_sleep()
        parsed = parse_sleep_period(raw)
        record = to_raw_sleep_record(parsed)

        assert record["source"] == "oura"
        assert record["source_id"] == "oura-sleep-001"
        assert record["date"] == "2026-03-18"
        assert isinstance(record["hrv_ms"], list)
        assert all(v > 0 for v in record["hrv_ms"])
        assert record["sleep_stages"]["deep"] == parsed.deep_s // 60
        assert record["sleep_stages"]["light"] == parsed.light_s // 60
        assert record["sleep_stages"]["rem"] == parsed.rem_s // 60
        assert record["total_sleep_min"] == parsed.total_sleep_s // 60
        assert record["time_in_bed_min"] == parsed.time_in_bed_s // 60
        assert record["sleep_onset_min"] == parsed.latency_s // 60
        assert record["resting_hr"] == 52
        assert record["resp_rate"] == 14.2
        assert record["skin_temp_delta"] is None  # not from sleep endpoint
        assert isinstance(record["sleep_start_ts"], int)
        assert isinstance(record["wake_time_ts"], int)

    def test_wake_episodes_mapped(self):
        raw = _make_raw_sleep(sleep_phase_5_min="44122")
        parsed = parse_sleep_period(raw)
        record = to_raw_sleep_record(parsed)
        assert len(record["wake_episodes"]) == 1
        assert "duration" in record["wake_episodes"][0]
