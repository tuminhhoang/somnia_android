"""Apple HealthKit data ingest for a single patient.

Unlike the Oura integration (which pulls from a REST API), Apple Health
data is pushed from the mobile app. The app reads HealthKit on-device
and POSTs the payload to our backend. This module normalizes that payload
into the same RawSleepRecord schema used by the metric engine.

Flow:
  1. React Native app reads HealthKit via expo-health or react-native-health
  2. App POSTs structured JSON to /api/v1/integrations/apple-health/sync
  3. This module parses and normalizes the payload
  4. Returns dict matching RawSleepRecord for metric computation
"""

from __future__ import annotations

from somnia.integrations.apple_health.parsers import (
    parse_healthkit_sleep,
    to_raw_sleep_record,
)


def ingest_healthkit_payload(
    patient_id: str,
    payload: dict,
) -> dict:
    """Process a HealthKit sync payload from the mobile app.

    Args:
        patient_id: internal Somnia patient ID
        payload: structured JSON from the mobile app containing:
            - sleep_samples: HealthKit sleep analysis samples
            - hrv_samples: HRV SDNN readings
            - hr_samples: heart rate readings
            - resting_hr: resting heart rate
            - resp_rate: respiratory rate
            - spo2_samples: blood oxygen readings
            - wrist_temp_delta: wrist temperature deviation

    Returns:
        Normalized dict matching RawSleepRecord schema, ready for
        metric engine computation.
    """
    parsed = parse_healthkit_sleep(payload)

    if parsed.total_sleep_min == 0:
        return {
            "status": "no_sleep_data",
            "patient_id": patient_id,
            "date": payload.get("date", ""),
        }

    record = to_raw_sleep_record(parsed)
    record["patient_id"] = patient_id
    record["source"] = "apple_health"

    return record
