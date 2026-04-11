/**
 * Somnia API client — communicates with the FastAPI metric engine.
 */

import * as SecureStore from "expo-secure-store";
import type { DerivedMetrics, ISIResponse, SleepDiaryEntry, WeeklyProgress } from "@/types";

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? "https://api.somniasanitas.com";

async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync("auth_token");
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getToken();
  const resp = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (!resp.ok) {
    throw new Error(`API ${resp.status}: ${resp.statusText}`);
  }
  return resp.json() as Promise<T>;
}

// --- Metrics ---

export async function fetchTonightMetrics(
  patientId: string,
  date: string
): Promise<DerivedMetrics> {
  return request(`/api/v1/metrics/${patientId}?date=${date}`);
}

export async function fetchWeeklyProgress(
  patientId: string
): Promise<WeeklyProgress[]> {
  return request(`/api/v1/metrics/${patientId}/weekly`);
}

// --- Sleep Diary ---

export async function fetchSleepDiary(
  patientId: string,
  startDate: string,
  endDate: string
): Promise<SleepDiaryEntry[]> {
  return request(
    `/api/v1/diary/${patientId}?start=${startDate}&end=${endDate}`
  );
}

export async function submitDiaryEntry(
  patientId: string,
  entry: Partial<SleepDiaryEntry>
): Promise<SleepDiaryEntry> {
  return request(`/api/v1/diary/${patientId}`, {
    method: "POST",
    body: JSON.stringify(entry),
  });
}

// --- ISI ---

export async function submitISI(
  patientId: string,
  response: ISIResponse
): Promise<{ score: number; severity: string }> {
  return request(`/api/v1/isi/${patientId}`, {
    method: "POST",
    body: JSON.stringify(response),
  });
}

// --- Coach ---

export async function sendCoachMessage(
  patientId: string,
  message: string
): Promise<{ reply: string }> {
  return request(`/api/v1/coach/${patientId}/message`, {
    method: "POST",
    body: JSON.stringify({ message }),
  });
}

// --- Auth ---

export async function login(
  email: string,
  password: string
): Promise<{ token: string; patient_id: string }> {
  return request("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

// --- Health Check ---

export async function healthCheck(): Promise<{ status: string }> {
  return request("/api/v1/health");
}
