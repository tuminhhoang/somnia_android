"""Nightly Oura data ingest for a single patient.

Called by the Celery nightly job. Pulls sleep + readiness + SpO2 + stress
data from Oura API, normalizes to the Somnia RawSleepRecord schema, and
enriches with supplementary fields.
"""

from __future__ import annotations

from datetime import date, timedelta

from somnia.integrations.oura.client import OuraClient
from somnia.integrations.oura.parsers import parse_sleep_period, to_raw_sleep_record


def ingest_patient_night(
    patient_id: str,
    access_token: str,
    target_date: str | None = None,
) -> dict:
    """Full nightly ingest for one patient.

    Args:
        patient_id:   internal Somnia patient ID
        access_token: valid Oura OAuth access token
        target_date:  YYYY-MM-DD to ingest (defaults to yesterday)

    Returns:
        Normalized dict matching RawSleepRecord schema, enriched with
        supplementary Oura fields (SpO2, stress, resilience, etc.).
    """
    d = target_date or (date.today() - timedelta(days=1)).isoformat()

    with OuraClient(access_token) as client:
        # 1. Sleep periods (primary — contains HRV, stages, epochs)
        sleep_periods = client.get_sleep_periods(d, d)
        main_sleep = next(
            (s for s in sleep_periods if s.get("type") == "long_sleep"),
            sleep_periods[0] if sleep_periods else None,
        )
        if not main_sleep:
            return {"status": "no_sleep_data", "patient_id": patient_id, "date": d}

        parsed = parse_sleep_period(main_sleep)
        record = to_raw_sleep_record(parsed)

        # 2. Daily readiness — adds skin temp delta + HRV balance
        readiness_list = client.get_daily_readiness(d, d)
        if readiness_list:
            r = readiness_list[0]
            record["skin_temp_delta"] = r.get("temperature_deviation")
            record["hrv_balance_score"] = r.get("contributors", {}).get(
                "hrv_balance"
            )
            record["readiness_score"] = r.get("score")

        # 3. Daily SpO2
        spo2_list = client.get_daily_spo2(d, d)
        if spo2_list:
            record["spo2_avg"] = (
                spo2_list[0].get("spo2_percentage", {}).get("average")
            )
            record["bdi"] = spo2_list[0].get("breathing_disturbance_index")

        # 4. Daily stress
        stress_list = client.get_daily_stress(d, d)
        if stress_list:
            record["stress_high_min"] = stress_list[0].get("stress_high", 0)
            record["recovery_high_min"] = stress_list[0].get("recovery_high", 0)
            record["day_summary"] = stress_list[0].get("day_summary")

        # 5. Sleep time recommendation (Oura's own bedtime)
        sleep_time_list = client.get_sleep_time(d, d)
        if sleep_time_list:
            record["oura_bedtime_recommendation"] = sleep_time_list[0].get(
                "recommendation"
            )
            record["oura_optimal_bedtime"] = sleep_time_list[0].get(
                "optimal_bedtime"
            )

        # 6. Resilience
        resilience_list = client.get_daily_resilience(d, d)
        if resilience_list:
            record["resilience_level"] = resilience_list[0].get("level")

        # 7. Check rest mode (exclude from metric engine if active)
        rest_mode = client.get_rest_mode_period(d, d)
        record["in_rest_mode"] = len(rest_mode) > 0

    record["patient_id"] = patient_id
    record["source"] = "oura"

    return record
