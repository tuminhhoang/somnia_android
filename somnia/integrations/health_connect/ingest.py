"""Google Health Connect data ingest for a single patient.

Like Apple Health, Health Connect data is pushed from the mobile app.
The React Native app reads Health Connect on-device via
react-native-health-connect and POSTs the payload to our backend.
"""

from __future__ import annotations

from somnia.integrations.health_connect.parsers import (
    parse_health_connect_sleep,
    to_raw_sleep_record,
)


def ingest_health_connect_payload(
    patient_id: str,
    payload: dict,
) -> dict:
    """Process a Health Connect sync payload from the mobile app.

    Args:
        patient_id: internal Somnia patient ID
        payload: structured JSON from the mobile app containing:
            - sleep_sessions: Health Connect sleep session records
            - hrv_samples: HRV RMSSD readings
            - hr_samples: heart rate readings
            - resting_hr: resting heart rate
            - resp_rate: respiratory rate
            - spo2_samples: blood oxygen readings
            - body_temp_delta: body temperature deviation

    Returns:
        Normalized dict matching RawSleepRecord schema.
    """
    parsed = parse_health_connect_sleep(payload)

    if parsed.total_sleep_min == 0:
        return {
            "status": "no_sleep_data",
            "patient_id": patient_id,
            "date": payload.get("date", ""),
        }

    record = to_raw_sleep_record(parsed)
    record["patient_id"] = patient_id
    record["source"] = "health_connect"

    return record
