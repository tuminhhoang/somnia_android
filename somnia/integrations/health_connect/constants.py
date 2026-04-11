"""Google Health Connect data type identifiers used by Somnia.

These correspond to Android Health Connect record types read on-device
by the React Native app and sent to the backend via sync endpoint.
"""

# Sleep session — SleepSessionRecord
# Stage values from SleepSessionRecord.Stage
SLEEP_STAGE_MAP = {
    0: "unknown",
    1: "awake",        # STAGE_TYPE_AWAKE
    2: "light",        # STAGE_TYPE_SLEEPING (undifferentiated)
    3: "out_of_bed",   # STAGE_TYPE_OUT_OF_BED
    4: "light",        # STAGE_TYPE_LIGHT
    5: "deep",         # STAGE_TYPE_DEEP
    6: "rem",          # STAGE_TYPE_REM
}

# Record types Somnia reads from Health Connect
RECORD_TYPES = {
    "sleep_session": "SleepSessionRecord",
    "heart_rate": "HeartRateRecord",
    "heart_rate_variability": "HeartRateVariabilityRmssdRecord",
    "resting_heart_rate": "RestingHeartRateRecord",
    "respiratory_rate": "RespiratoryRateRecord",
    "oxygen_saturation": "OxygenSaturationRecord",
    "body_temperature": "BodyTemperatureRecord",
    "steps": "StepsRecord",
}

# All permissions Somnia requests
READ_PERMISSIONS = [
    "android.permission.health.READ_SLEEP",
    "android.permission.health.READ_HEART_RATE",
    "android.permission.health.READ_HEART_RATE_VARIABILITY",
    "android.permission.health.READ_RESTING_HEART_RATE",
    "android.permission.health.READ_RESPIRATORY_RATE",
    "android.permission.health.READ_OXYGEN_SATURATION",
    "android.permission.health.READ_BODY_TEMPERATURE",
    "android.permission.health.READ_STEPS",
]
