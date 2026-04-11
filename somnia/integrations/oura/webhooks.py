"""Oura webhook handler for real-time data push.

Oura supports webhooks that fire on data create/update/delete events.
When a sleep-relevant event arrives, re-trigger ingest for the affected patient.
"""

from __future__ import annotations

# Webhook event types
WEBHOOK_EVENTS = ["create", "update", "delete"]

# Supported data types for webhook subscription
DATA_TYPES = [
    "tag",
    "enhanced_tag",
    "workout",
    "session",
    "sleep",
    "daily_sleep",
    "daily_readiness",
    "daily_activity",
    "daily_spo2",
    "sleep_time",
    "rest_mode_period",
    "daily_stress",
    "daily_cardiovascular_age",
    "daily_resilience",
    "vo2_max",
]

# Data types that should trigger a metric re-computation
METRIC_RELEVANT_TYPES = {
    "sleep",
    "daily_sleep",
    "daily_readiness",
    "daily_spo2",
}


def should_reingest(payload: dict) -> bool:
    """Determine if an incoming webhook should trigger a patient re-ingest.

    Args:
        payload: raw webhook payload from Oura.

    Returns:
        True if the event warrants re-ingesting the patient's data.
    """
    event_type = payload.get("event_type")
    data_type = payload.get("data_type")

    if event_type == "delete":
        return False

    return data_type in METRIC_RELEVANT_TYPES
