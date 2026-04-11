"""Tests for all Somnia proprietary metrics (METRIC_01 through METRIC_06)."""

import pytest

from somnia.metrics import (
    arousal_index,
    cbti_readiness_score,
    circadian_alignment_score,
    sleep_debt_index,
    sleep_efficiency_index,
    recovery_trajectory,
)


# ---- METRIC_01: Sleep Efficiency Index ----


class TestSleepEfficiencyIndex:
    def test_high_efficiency_expands_window(self):
        result = sleep_efficiency_index(tst=450, tib=480)
        assert result["se"] == 93.8
        assert result["action"] == "expand_window"
        assert result["new_tib"] == 495  # 480 + 15

    def test_low_efficiency_restricts_window(self):
        result = sleep_efficiency_index(tst=360, tib=480)
        assert result["se"] == 75.0
        assert result["action"] == "restrict_window"
        assert result["new_tib"] == 465  # 480 - 15

    def test_mid_efficiency_holds(self):
        result = sleep_efficiency_index(tst=420, tib=480)
        assert result["se"] == 87.5
        assert result["action"] == "hold"
        assert result["new_tib"] == 480

    def test_safety_floor(self):
        # Very short TIB that would go below 5.5h with restriction
        result = sleep_efficiency_index(tst=200, tib=340)
        assert result["action"] == "restrict_window"
        assert result["new_tib"] == 330  # floor at 5.5h

    def test_zero_tib_raises(self):
        with pytest.raises(ValueError):
            sleep_efficiency_index(tst=0, tib=0)


# ---- METRIC_02: Sleep Debt Index ----


class TestSleepDebtIndex:
    def test_no_debt(self):
        history = [480] * 14  # exactly meets sleep need every night
        assert sleep_debt_index(history) == 0.0

    def test_full_deficit(self):
        history = [0] * 14  # zero sleep every night
        sdi = sleep_debt_index(history)
        assert sdi > 0
        assert sdi <= 100

    def test_partial_deficit(self):
        history = [420] * 14  # 1h deficit each night
        sdi = sleep_debt_index(history)
        assert 0 < sdi < 100

    def test_recent_nights_weighted_more(self):
        # Recent bad night should increase debt more than old bad night
        recent_bad = [300] + [480] * 13
        old_bad = [480] * 13 + [300]
        assert sleep_debt_index(recent_bad) > sleep_debt_index(old_bad)

    def test_empty_history_raises(self):
        with pytest.raises(ValueError):
            sleep_debt_index([])


# ---- METRIC_03: Circadian Alignment Score ----


class TestCircadianAlignmentScore:
    def test_perfect_consistency(self):
        onsets = [1380.0] * 14  # 23:00 every night
        wakes = [420.0] * 14  # 07:00 every morning
        result = circadian_alignment_score(onsets, wakes, temp_nadir=240.0)
        assert result["cas"] == 100.0  # zero variance = perfect
        assert result["social_jetlag_h"] == 0.0

    def test_high_variability_lowers_score(self):
        onsets = [1320, 1440, 1380, 1260, 1500, 1350, 1410, 1290, 1470, 1380,
                  1320, 1440, 1380, 1260]
        wakes = [420, 540, 480, 360, 600, 450, 510, 390, 570, 480,
                 420, 540, 480, 360]
        result = circadian_alignment_score(onsets, wakes, temp_nadir=240.0)
        assert result["cas"] < 100.0

    def test_insufficient_data_raises(self):
        with pytest.raises(ValueError):
            circadian_alignment_score([1380.0], [420.0], 240.0)


# ---- METRIC_04: Arousal Index ----


class TestArousalIndex:
    def test_no_arousals(self):
        result = arousal_index(
            wake_episodes=[],
            hrv_series=[50.0, 52.0, 48.0, 51.0, 49.0],
            sleep_stages={"light": 120, "deep": 90, "rem": 90, "total": 300},
        )
        assert result["ai"] < 30
        assert result["subtype"] == "none"

    def test_frequent_arousals(self):
        episodes = [{"duration": 3}] * 10  # 10 short awakenings
        result = arousal_index(
            wake_episodes=episodes,
            hrv_series=[50.0, 52.0, 48.0, 51.0, 49.0],
            sleep_stages={"light": 120, "deep": 90, "rem": 90, "total": 300},
        )
        assert result["ai"] > 30
        assert result["subtype"] == "frequency"

    def test_long_wake_duration(self):
        episodes = [{"duration": 30}, {"duration": 25}]  # long awakenings
        result = arousal_index(
            wake_episodes=episodes,
            hrv_series=[50.0, 52.0, 48.0, 51.0, 49.0],
            sleep_stages={"light": 120, "deep": 90, "rem": 90, "total": 300},
        )
        assert result["ai"] > 0

    def test_insufficient_hrv_raises(self):
        with pytest.raises(ValueError):
            arousal_index([], [50.0], {"light": 120, "deep": 90, "rem": 90, "total": 300})


# ---- METRIC_05: CBT-I Readiness Score ----


class TestCBTIReadinessScore:
    def test_high_arousal_routes_stimulus_control(self):
        result = cbti_readiness_score(se=85.0, hrv_trend=1.0, ai=65.0, isi_score=12)
        assert result["first_module"] == "stimulus_control"

    def test_low_efficiency_routes_sleep_restriction(self):
        result = cbti_readiness_score(se=70.0, hrv_trend=1.0, ai=40.0, isi_score=12)
        assert result["first_module"] == "sleep_restriction"

    def test_high_isi_routes_cognitive(self):
        result = cbti_readiness_score(se=80.0, hrv_trend=1.0, ai=40.0, isi_score=18)
        assert result["first_module"] == "cognitive_restructuring"

    def test_mild_routes_hygiene(self):
        result = cbti_readiness_score(se=88.0, hrv_trend=2.0, ai=20.0, isi_score=10)
        assert result["first_module"] == "sleep_hygiene"

    def test_confidence_levels(self):
        high = cbti_readiness_score(se=95.0, hrv_trend=3.0, ai=10.0, isi_score=5)
        assert high["confidence"] == "high"

        low = cbti_readiness_score(se=50.0, hrv_trend=-3.0, ai=80.0, isi_score=25)
        assert low["confidence"] == "low"


# ---- METRIC_06: Recovery Trajectory ----


class TestRecoveryTrajectory:
    def test_improving_trajectory(self):
        result = recovery_trajectory(
            se_history=[75.0, 80.0, 85.0, 88.0],
            hrv_history=[30.0, 33.0, 36.0, 39.0],
            isi_history=[20, 16, 12, 8],
        )
        assert result["trajectory"] > 0
        assert result["on_track"] is True

    def test_worsening_trajectory(self):
        result = recovery_trajectory(
            se_history=[90.0, 85.0, 80.0, 75.0],
            hrv_history=[40.0, 37.0, 34.0, 31.0],
            isi_history=[8, 12, 16, 20],
        )
        assert result["trajectory"] < 0
        assert result["on_track"] is False

    def test_insufficient_data_raises(self):
        with pytest.raises(ValueError):
            recovery_trajectory([85.0], [35.0], [12])

    def test_slopes_present(self):
        result = recovery_trajectory(
            se_history=[80.0, 85.0],
            hrv_history=[30.0, 33.0],
            isi_history=[18, 14],
        )
        assert "slopes" in result
        assert "se_pct_per_week" in result["slopes"]
        assert "hrv_ms_per_week" in result["slopes"]
        assert "isi_pts_per_week" in result["slopes"]
