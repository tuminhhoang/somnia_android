/**
 * Google Health Connect integration for Somnia (Android only).
 *
 * Reads sleep, HRV, heart rate, SpO2, and temperature data from
 * Health Connect on-device, then syncs to the Somnia backend.
 *
 * Uses react-native-health-connect for Health Connect access.
 */

import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

// Health Connect record types
const HC_RECORD_TYPES = {
  sleepSession: "SleepSession",
  heartRate: "HeartRate",
  heartRateVariability: "HeartRateVariabilityRmssd",
  restingHeartRate: "RestingHeartRate",
  respiratoryRate: "RespiratoryRate",
  oxygenSaturation: "OxygenSaturation",
  bodyTemperature: "BodyTemperature",
} as const;

/**
 * Check if Health Connect is available (Android only).
 */
export function isHealthConnectAvailable(): boolean {
  return Platform.OS === "android";
}

/**
 * Request Health Connect permissions.
 *
 * In production, replace with:
 *   import { initialize, requestPermission } from 'react-native-health-connect';
 *   await initialize();
 *   await requestPermission([
 *     { accessType: 'read', recordType: 'SleepSession' },
 *     { accessType: 'read', recordType: 'HeartRate' },
 *     ...
 *   ]);
 */
export async function requestHealthConnectPermissions(): Promise<boolean> {
  if (!isHealthConnectAvailable()) return false;

  try {
    await SecureStore.setItemAsync("health_connect_connected", "true");
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if Health Connect is connected/authorized.
 */
export async function isHealthConnectConnected(): Promise<boolean> {
  if (!isHealthConnectAvailable()) return false;
  const val = await SecureStore.getItemAsync("health_connect_connected");
  return val === "true";
}

/**
 * Disconnect Health Connect (revoke local state; actual permissions
 * are managed in Android Settings > Health Connect).
 */
export async function disconnectHealthConnect(): Promise<void> {
  await SecureStore.deleteItemAsync("health_connect_connected");
}

/**
 * Payload matching the HealthConnectSyncRequest backend schema.
 */
export interface HealthConnectSyncPayload {
  date: string;
  sleep_sessions: Array<{
    start_time: string;
    end_time: string;
    stages: Array<{
      start_time: string;
      end_time: string;
      stage_type: number;
    }>;
    source_package: string;
  }>;
  hrv_samples: Array<{ timestamp: string; value: number }>;
  hr_samples: Array<{ timestamp: string; value: number }>;
  resting_hr: number;
  resp_rate: number;
  spo2_samples: Array<{ timestamp: string; value: number }>;
  body_temp_delta: number | null;
}

/**
 * Read last night's sleep data from Health Connect.
 *
 * In production, replace with actual Health Connect queries:
 *   const sessions = await readRecords('SleepSession', { ... });
 *   const hrv = await readRecords('HeartRateVariabilityRmssd', { ... });
 */
export async function readLastNightSleep(): Promise<HealthConnectSyncPayload | null> {
  if (!isHealthConnectAvailable()) return null;

  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(18, 0, 0, 0);

  const dateStr = yesterday.toISOString().split("T")[0];

  return {
    date: dateStr,
    sleep_sessions: [],
    hrv_samples: [],
    hr_samples: [],
    resting_hr: 0,
    resp_rate: 0,
    spo2_samples: [],
    body_temp_delta: null,
  };
}

/**
 * Sync last night's Health Connect data to the Somnia backend.
 */
export async function syncHealthConnectToBackend(
  patientId: string,
  apiBase: string
): Promise<{ status: string } | null> {
  const payload = await readLastNightSleep();
  if (!payload) return null;

  const token = await SecureStore.getItemAsync("auth_token");

  const resp = await fetch(
    `${apiBase}/api/v1/integrations/health-connect/sync`,
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
