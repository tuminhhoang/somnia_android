"""Apple HealthKit data type identifiers used by Somnia.

These correspond to HKQuantityType / HKCategoryType identifiers
read on-device and sent to the backend via the mobile app.
"""

# Sleep analysis — HKCategoryTypeIdentifierSleepAnalysis
# Values: inBed=0, asleepUnspecified=1, awake=2, asleepCore=3, asleepDeep=4, asleepREM=5
SLEEP_ANALYSIS = "HKCategoryTypeIdentifierSleepAnalysis"

SLEEP_STAGE_MAP = {
    0: "in_bed",
    1: "asleep_unspecified",
    2: "awake",
    3: "light",  # asleepCore = N1+N2
    4: "deep",   # asleepDeep = N3
    5: "rem",    # asleepREM
}

# Heart rate — HKQuantityTypeIdentifierHeartRate (bpm)
HEART_RATE = "HKQuantityTypeIdentifierHeartRate"

# Heart rate variability — HKQuantityTypeIdentifierHeartRateVariabilitySDNN (ms)
HRV_SDNN = "HKQuantityTypeIdentifierHeartRateVariabilitySDNN"

# Resting heart rate — HKQuantityTypeIdentifierRestingHeartRate (bpm)
RESTING_HEART_RATE = "HKQuantityTypeIdentifierRestingHeartRate"

# Respiratory rate — HKQuantityTypeIdentifierRespiratoryRate (breaths/min)
RESPIRATORY_RATE = "HKQuantityTypeIdentifierRespiratoryRate"

# Blood oxygen — HKQuantityTypeIdentifierOxygenSaturation (0.0–1.0 fraction)
OXYGEN_SATURATION = "HKQuantityTypeIdentifierOxygenSaturation"

# Body temperature — HKQuantityTypeIdentifierAppleSleepingWristTemperature (°C delta)
WRIST_TEMPERATURE = "HKQuantityTypeIdentifierAppleSleepingWristTemperature"

# Step count (for activity context)
STEP_COUNT = "HKQuantityTypeIdentifierStepCount"

# All types Somnia requests from HealthKit
ALL_READ_TYPES = [
    SLEEP_ANALYSIS,
    HEART_RATE,
    HRV_SDNN,
    RESTING_HEART_RATE,
    RESPIRATORY_RATE,
    OXYGEN_SATURATION,
    WRIST_TEMPERATURE,
    STEP_COUNT,
]
