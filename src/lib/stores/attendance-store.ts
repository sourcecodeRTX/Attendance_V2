"use client";

import { create } from "zustand";
import type {
  AttendanceRecord,
  AttendanceMode,
  StudentAttendanceRecord,
  AttendanceSummary,
} from "@/lib/types/attendance";
import * as attendanceDb from "@/lib/db/attendance";

interface AttendanceState {
  currentRecord: AttendanceRecord | null;
  mode: AttendanceMode;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  preSelectAllStates: Map<string, StudentAttendanceRecord["status"]> | null;

  // Actions
  startSession: (ownerId: string, subjectId: string, date: string) => Promise<void>;
  loadExistingSession: (id: string) => Promise<void>;
  toggleStudent: (studentId: string) => Promise<void>;
  markAllPresent: () => Promise<void>;
  markAllAbsent: () => Promise<void>;
  restorePreSelectStates: () => Promise<void>;
  completeAttendance: () => Promise<void>;
  reopenAttendance: () => Promise<void>;
  setMode: (mode: AttendanceMode) => void;
  resetSession: () => void;
  setError: (error: string | null) => void;

  // Computed
  stats: () => AttendanceSummary;
}

const defaultStats: AttendanceSummary = {
  total: 0,
  present: 0,
  absent: 0,
  unmarked: 0,
  percentage: 0,
};

export const useAttendanceStore = create<AttendanceState>((set, get) => ({
  currentRecord: null,
  mode: "mark-present",
  isLoading: false,
  isSaving: false,
  error: null,
  preSelectAllStates: null,

  startSession: async (ownerId: string, subjectId: string, date: string) => {
    set({ isLoading: true, error: null });
    try {
      const record = await attendanceDb.startAttendanceSession(
        ownerId,
        subjectId,
        date,
        get().mode
      );
      set({ currentRecord: record, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to start session",
        isLoading: false,
      });
    }
  },

  loadExistingSession: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const record = await attendanceDb.getAttendanceById(id);
      if (!record) {
        throw new Error("Attendance record not found");
      }
      set({ currentRecord: record, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to load session",
        isLoading: false,
      });
    }
  },

  toggleStudent: async (studentId: string) => {
    const { currentRecord, mode } = get();
    if (!currentRecord) return;

    set({ isSaving: true });
    try {
      const updated = await attendanceDb.toggleStudentStatus(
        currentRecord.id,
        studentId,
        mode
      );
      set({ currentRecord: updated, isSaving: false, preSelectAllStates: null });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to update status",
        isSaving: false,
      });
    }
  },

  markAllPresent: async () => {
    const { currentRecord } = get();
    if (!currentRecord) return;

    // Save current states before marking all
    const statesMap = new Map(
      currentRecord.records.map((r) => [r.studentId, r.status])
    );
    set({ preSelectAllStates: statesMap, isSaving: true });

    try {
      const updated = await attendanceDb.markAllAs(currentRecord.id, "present");
      set({ currentRecord: updated, isSaving: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to mark all present",
        isSaving: false,
      });
    }
  },

  markAllAbsent: async () => {
    const { currentRecord } = get();
    if (!currentRecord) return;

    // Save current states before marking all
    const statesMap = new Map(
      currentRecord.records.map((r) => [r.studentId, r.status])
    );
    set({ preSelectAllStates: statesMap, isSaving: true });

    try {
      const updated = await attendanceDb.markAllAs(currentRecord.id, "absent");
      set({ currentRecord: updated, isSaving: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to mark all absent",
        isSaving: false,
      });
    }
  },

  restorePreSelectStates: async () => {
    const { currentRecord, preSelectAllStates } = get();
    if (!currentRecord || !preSelectAllStates) return;

    set({ isSaving: true });
    try {
      const restoredRecords = currentRecord.records.map((r) => ({
        ...r,
        status: preSelectAllStates.get(r.studentId) || r.status,
      }));
      const updated = await attendanceDb.updateAttendanceRecord(
        currentRecord.id,
        restoredRecords
      );
      set({ currentRecord: updated, preSelectAllStates: null, isSaving: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to restore states",
        isSaving: false,
      });
    }
  },

  completeAttendance: async () => {
    const { currentRecord } = get();
    if (!currentRecord) return;

    set({ isSaving: true });
    try {
      const updated = await attendanceDb.completeAttendance(currentRecord.id);
      set({ currentRecord: updated, isSaving: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to complete attendance",
        isSaving: false,
      });
    }
  },

  reopenAttendance: async () => {
    const { currentRecord } = get();
    if (!currentRecord) return;

    set({ isSaving: true });
    try {
      const updated = await attendanceDb.reopenAttendance(currentRecord.id);
      set({ currentRecord: updated, isSaving: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to reopen attendance",
        isSaving: false,
      });
    }
  },

  setMode: (mode: AttendanceMode) => set({ mode }),

  resetSession: () =>
    set({
      currentRecord: null,
      isLoading: false,
      isSaving: false,
      error: null,
      preSelectAllStates: null,
    }),

  setError: (error: string | null) => set({ error }),

  stats: () => {
    const { currentRecord } = get();
    return currentRecord?.summary ?? defaultStats;
  },
}));
