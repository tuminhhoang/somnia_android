/**
 * Global application state — Zustand store.
 */

import { create } from "zustand";
import type { DerivedMetrics, CoachMessage, BedtimeWindow } from "@/types";

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

  // Actions
  setPatientId: (id: string | null) => void;
  setOnboarded: (val: boolean) => void;
  setTodayMetrics: (m: DerivedMetrics) => void;
  setBedtimeWindow: (w: BedtimeWindow) => void;
  addCoachMessage: (msg: CoachMessage) => void;
  setCoachLoading: (val: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  patientId: null,
  isOnboarded: false,
  todayMetrics: null,
  bedtimeWindow: null,
  coachMessages: [],
  coachLoading: false,

  setPatientId: (id) => set({ patientId: id }),
  setOnboarded: (val) => set({ isOnboarded: val }),
  setTodayMetrics: (m) => set({ todayMetrics: m }),
  setBedtimeWindow: (w) => set({ bedtimeWindow: w }),
  addCoachMessage: (msg) =>
    set((s) => ({ coachMessages: [...s.coachMessages, msg] })),
  setCoachLoading: (val) => set({ coachLoading: val }),
}));
