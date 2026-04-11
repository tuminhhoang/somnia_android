/**
 * Apple HealthKit integration for Somnia.
 *
 * Reads sleep, HRV, heart rate, SpO2, and temperature data from HealthKit
 * on-device, then syncs to the Somnia backend for metric computation.
 *
 * Uses react-native-health for HealthKit access (iOS only).
 * Android equivalent uses Health Connect via a separate module.
 */

import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

// HealthKit type identifiers
const HK_TYPES = {
  sleepAnalysis: "SleepAnalysis",
  heartRate: "HeartRate",
  heartRateVariability: "HeartRateVariabilitySDNN",
  restingHeartRate: "RestingHeartRate",
  respiratoryRate: "RespiratoryRate",
  oxygenSaturation: "OxygenSaturation",
  appleSleepingWristTemperature: "AppleSleepingWristTemperature",
} as const;

// Permissions requested from HealthKit
const READ_PERMISSIONS = [
  HK_TYPES.sleepAnalysis,
  HK_TYPES.heartRate,
  HK_TYPES.heartRateVariability,
  HK_TYPES.restingHeartRate,
  HK_TYPES.respiratoryRate,
  HK_TYPES.oxygenSaturation,
  HK_TYPES.appleSleepingWristTemperature,
];

/**
 * Check if Apple Health is available (iOS only, not simulator).
 */
export function isAppleHealthAvailable(): boolean {
  return Platform.OS === "ios";
}

/**
 * Request HealthKit authorization.
 *
 * NOTE: This function is a typed interface. The actual HealthKit calls
 * require react-native-health to be installed and linked. In production,
 * replace the placeholder with:
 *
 *   import AppleHealthKit from 'react-native-health';
 *   AppleHealthKit.initHealthKit({ permissions: { read: READ_PERMISSIONS } }, cb);
 */
export async function requestHealthKitPermissions(): Promise<boolean> {
  if (!isAppleHealthAvailable()) return false;

  try {
    // Placeholder — in production this calls:
    // AppleHealthKit.initHealthKit({ permissions: { read: READ_PERMISSIONS } })
    await SecureStore.setItemAsync("apple_health_connected", "true");
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if Apple Health is connected/authorized.
 */
export async function isAppleHealthConnected(): Promise<boolean> {
  if (!isAppleHealthAvailable()) return false;
  const val = await SecureStore.getItemAsync("apple_health_connected");
  return val === "true";
}

/**
 * Disconnect Apple Health (revoke local state; actual HealthKit
 * permissions are managed in iOS Settings).
 */
export async function disconnectAppleHealth(): Promise<void> {
  await SecureStore.deleteItemAsync("apple_health_connected");
}

/**
 * Read last night's sleep data from HealthKit and return a structured
 * payload ready to sync to the Somnia backend.
 *
 * In production, this reads from HealthKit via react-native-health.
 * The returned object matches the HealthKitSyncRequest schema expected
 * by POST /api/v1/integrations/apple-health/sync.
 */
export interface HealthKitSyncPayload {
  date: string;
  sleep_samples: Array<{
    start_date: string;
    end_date: string;
    value: number;
    source_name: string;
  }>;
  hrv_samples: Array<{ timestamp: string; value: number }>;
  hr_samples: Array<{ timestamp: string; value: number }>;
  resting_hr: number;
  resp_rate: number;
  spo2_samples: Array<{ timestamp: string; value: number }>;
  wrist_temp_delta: number | null;
}

export async function readLastNightSleep(): Promise<HealthKitSyncPayload | null> {
  if (!isAppleHealthAvailable()) return null;

  // Calculate date range: yesterday 18:00 to today 12:00
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(18, 0, 0, 0);

  const today = new Date(now);
  today.setHours(12, 0, 0, 0);

  const dateStr = yesterday.toISOString().split("T")[0];

  // In production, replace with actual HealthKit queries:
  //
  // const sleepSamples = await AppleHealthKit.getSleepSamples({
  //   startDate: yesterday.toISOString(),
  //   endDate: today.toISOString(),
  //   ascending: true,
  // });
  //
  // const hrvSamples = await AppleHealthKit.getHeartRateVariabilitySamples({
  //   startDate: yesterday.toISOString(),
  //   endDate: today.toISOString(),
  // });
  //
  // ... etc for each data type

  return {
    date: dateStr,
    sleep_samples: [],
    hrv_samples: [],
    hr_samples: [],
    resting_hr: 0,
    resp_rate: 0,
    spo2_samples: [],
    wrist_temp_delta: null,
  };
}

/**
 * Sync last night's HealthKit data to the Somnia backend.
 */
export async function syncHealthKitToBackend(
  patientId: string,
  apiBase: string
): Promise<{ status: string } | null> {
  const payload = await readLastNightSleep();
  if (!payload) return null;

  const token = await SecureStore.getItemAsync("auth_token");

  const resp = await fetch(
    `${apiBase}/api/v1/integrations/apple-health/sync`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ patient_id: patientId, ...payload }),
    }
  );

  if (!resp.ok) return null;
  return resp.json();
}
