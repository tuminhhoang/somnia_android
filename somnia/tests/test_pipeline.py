"""Tests for the nightly computation pipeline and coach context."""

from datetime import date

from somnia.pipeline.compute import compute_nightly_metrics
from somnia.pipeline.coach_context import build_coach_context
from somnia.schemas.raw_sleep_record import RawSleepRecord


def _make_record() -> RawSleepRecord:
    return RawSleepRecord(
        patient_id="test-001",
        date=date(2026, 3, 18),
        hrv_ms=[45.0, 48.0, 50.0, 47.0, 46.0, 49.0, 51.0, 48.0],
        spo2=[97.0, 96.5, 97.2, 96.8],
        skin_temp_delta=-0.3,
        sleep_stages={"light": 150, "deep": 90, "rem": 80, "awake": 30},
        total_sleep_min=320,
        time_in_bed_min=380,
        sleep_onset_min=12,
        wake_episodes=[{"start": 1000, "duration": 8}, {"start": 2000, "duration": 3}],
        resting_hr=58.0,
        resp_rate=14.5,
        sleep_start_ts=1710720000,
        wake_time_ts=1710748800,
    )


class TestComputeNightlyMetrics:
    def test_computes_all_metrics(self):
        record = _make_record()
        result = compute_nightly_metrics(
            record=record,
            history_14d_tst=[320, 400, 380, 420, 360, 390, 410, 350, 370, 400, 380, 360, 390, 370],
            onsets_14d=[1380.0] * 14,
            wakes_14d=[420.0] * 14,
            temp_nadir=240.0,
            hrv_trend_7d=1.5,
            isi_score=12,
        )
        assert result.patient_id == "test-001"
        assert 0 <= result.sleep_efficiency <= 100
        assert result.tib_action in ("expand_window", "restrict_window", "hold")
        assert result.new_tib_min >= 330
        assert 0 <= result.sleep_debt_index <= 100
        assert 0 <= result.circadian_alignment <= 100
        assert 0 <= result.arousal_index <= 100
        assert 0 <= result.cbti_readiness <= 100
        assert result.active_module in (
            "stimulus_control", "sleep_restriction",
            "cognitive_restructuring", "sleep_hygiene",
        )

    def test_with_weekly_history(self):
        record = _make_record()
        result = compute_nightly_metrics(
            record=record,
            history_14d_tst=[320] * 14,
            onsets_14d=[1380.0] * 14,
            wakes_14d=[420.0] * 14,
            temp_nadir=240.0,
            hrv_trend_7d=1.0,
            isi_score=15,
            se_weekly=[75.0, 78.0, 82.0],
            hrv_weekly=[30.0, 32.0, 35.0],
            isi_weekly=[20, 16, 12],
        )
        assert result.trajectory != 0.0


class TestBuildCoachContext:
    def test_produces_prompt_string(self):
        record = _make_record()
        metrics = compute_nightly_metrics(
            record=record,
            history_14d_tst=[320] * 14,
            onsets_14d=[1380.0] * 14,
            wakes_14d=[420.0] * 14,
            temp_nadir=240.0,
            hrv_trend_7d=1.0,
            isi_score=12,
        )
        context = build_coach_context(metrics, lights_out="23:00", rise_time="06:30")
        assert "Somnia" in context
        assert "Sleep Efficiency" in context
        assert "23:00" in context
        assert "06:30" in context
        assert "RULES:" in context
