"use client";

import { create } from "zustand";
import type { Subject, CreateSubjectInput } from "@/lib/types/subject";
import * as subjectDb from "@/lib/db/subjects";

interface SubjectsState {
  subjects: Subject[];
  isLoading: boolean;
  error: string | null;

  // Actions
  loadSubjects: (ownerId: string) => Promise<void>;
  addSubject: (ownerId: string, data: CreateSubjectInput) => Promise<Subject>;
  updateSubject: (id: string, updates: Partial<Subject>) => Promise<void>;
  archiveSubject: (id: string) => Promise<void>;
  restoreSubject: (id: string) => Promise<void>;
  deleteSubject: (id: string) => Promise<void>;
  setError: (error: string | null) => void;
}

export const useSubjectsStore = create<SubjectsState>((set, get) => ({
  subjects: [],
  isLoading: false,
  error: null,

  loadSubjects: async (ownerId: string) => {
    set({ isLoading: true, error: null });
    try {
      const subjects = await subjectDb.getSubjects(ownerId);
      set({ subjects, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to load subjects",
        isLoading: false,
      });
    }
  },

  addSubject: async (ownerId: string, data: CreateSubjectInput) => {
    try {
      const subject = await subjectDb.createSubject(ownerId, data);
      set((state) => ({ subjects: [...state.subjects, subject] }));
      return subject;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to add subject";
      set({ error: message });
      throw error;
    }
  },

  updateSubject: async (id: string, updates: Partial<Subject>) => {
    try {
      const updated = await subjectDb.updateSubject(id, updates);
      set((state) => ({
        subjects: state.subjects.map((s) => (s.id === id ? updated : s)),
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update subject";
      set({ error: message });
      throw error;
    }
  },

  archiveSubject: async (id: string) => {
    try {
      await subjectDb.archiveSubject(id);
      set((state) => ({
        subjects: state.subjects.filter((s) => s.id !== id),
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to archive subject";
      set({ error: message });
      throw error;
    }
  },

  restoreSubject: async (id: string) => {
    try {
      await subjectDb.restoreSubject(id);
      const ownerId = get().subjects[0]?.ownerId;
      if (ownerId) {
        await get().loadSubjects(ownerId);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to restore subject";
      set({ error: message });
      throw error;
    }
  },

  deleteSubject: async (id: string) => {
    try {
      await subjectDb.deleteSubject(id);
      set((state) => ({
        subjects: state.subjects.filter((s) => s.id !== id),
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete subject";
      set({ error: message });
      throw error;
    }
  },

  setError: (error: string | null) => set({ error }),
}));
