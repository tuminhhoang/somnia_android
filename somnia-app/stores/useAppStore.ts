/**
 * Global application state — Zustand store.
 */

import { create } from "zustand";
import type { DerivedMetrics, CoachMessage, BedtimeWindow } from "@/types";

export interface UserProfile {
  name: string;
  age: string;
  gender: string;
  weight: string;
  height: string;
}

export interface WearableHealth {
  heartRate: number | null;
  spo2: number | null;
  hrv: number | null;
  systolic: number | null;
  diastolic: number | null;
  temperature: number | null;
  stress: number | null;
  steps: number | null;
  calories: number | null;
  battery: number | null;
  lastUpdated: string | null;
}

export interface SleepSummary {
  date: string;
  totalMinutes: number;
  timeinBedMinutes: number;
  efficiency: number;
  deepMinutes: number;
  remMinutes: number;
  lightMinutes: number;
  awakeMinutes: number;
}

export interface DiaryEntry {
  id: string;
  date: string;
  quality: number;
  alertness: number;
  notes: string;
}

interface AppState {
  // Auth
  patientId: string | null;
  isOnboarded: boolean;

  // Metrics
  todayMetrics: DerivedMetrics | null;
  bedtimeWindow: BedtimeWindow | null;

  // Coach
  coachMessages: CoachMessage[];
  coachLoading: boolean;

  // User profile & settings
  userProfile: UserProfile | null;
  sleepGoalHours: number;
  sleepGoalMinutes: number;
  bedtimeReminderEnabled: boolean;
  bedtimeReminderTime: string;

  // Wearable device connection (shared across tabs)
  connectedBracelet: string | null;
  connectedRing: string | null;

  // Live health metrics from wearable
  wearableHealth: WearableHealth;

  // Sleep stages from last wearable sync
  sleepSummary: SleepSummary | null;

  // Sleep diary entries
  diaryEntries: DiaryEntry[];

  // Actions
  setPatientId: (id: string | null) => void;
  setOnboarded: (val: boolean) => void;
  setTodayMetrics: (m: DerivedMetrics) => void;
  setBedtimeWindow: (w: BedtimeWindow) => void;
  addCoachMessage: (msg: CoachMessage) => void;
  setCoachLoading: (val: boolean) => void;
  setUserProfile: (p: UserProfile) => void;
  setSleepGoal: (hours: number, minutes: number) => void;
  setBedtimeReminder: (enabled: boolean, time: string) => void;
  setConnectedBracelet: (addr: string | null) => void;
  setConnectedRing: (addr: string | null) => void;
  updateWearableHealth: (data: Partial<WearableHealth>) => void;
  setSleepSummary: (s: SleepSummary) => void;
  addDiaryEntry: (entry: DiaryEntry) => void;
}

export const useAppStore = create<AppState>((set) => ({
  patientId: null,
  isOnboarded: false,
  todayMetrics: null,
  bedtimeWindow: null,
  coachMessages: [],
  coachLoading: false,
  userProfile: null,
  sleepGoalHours: 8,
  sleepGoalMinutes: 0,
  bedtimeReminderEnabled: false,
  bedtimeReminderTime: "22:00",
  connectedBracelet: null,
  connectedRing: null,
  wearableHealth: {
    heartRate: null, spo2: null, hrv: null,
    systolic: null, diastolic: null, temperature: null,
    stress: null, steps: null, calories: null,
    battery: null, lastUpdated: null,
  },
  sleepSummary: null,
  diaryEntries: [],

  setPatientId: (id) => set({ patientId: id }),
  setOnboarded: (val) => set({ isOnboarded: val }),
  setTodayMetrics: (m) => set({ todayMetrics: m }),
  setBedtimeWindow: (w) => set({ bedtimeWindow: w }),
  addCoachMessage: (msg) =>
    set((s) => ({ coachMessages: [...s.coachMessages, msg] })),
  setCoachLoading: (val) => set({ coachLoading: val }),
  setUserProfile: (p) => set({ userProfile: p }),
  setSleepGoal: (hours, minutes) => set({ sleepGoalHours: hours, sleepGoalMinutes: minutes }),
  setBedtimeReminder: (enabled, time) => set({ bedtimeReminderEnabled: enabled, bedtimeReminderTime: time }),
  setConnectedBracelet: (addr) => set({ connectedBracelet: addr }),
  setConnectedRing: (addr) => set({ connectedRing: addr }),
  updateWearableHealth: (data) =>
    set((s) => ({
      wearableHealth: { ...s.wearableHealth, ...data, lastUpdated: new Date().toISOString() },
    })),
  setSleepSummary: (s) => set({ sleepSummary: s }),
  addDiaryEntry: (entry) =>
    set((s) => ({ diaryEntries: [entry, ...s.diaryEntries] })),
}));
