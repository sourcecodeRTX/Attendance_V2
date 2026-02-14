"use client";

import { create } from "zustand";
import type { Student, ImportResult, ImportMode, CreateStudentInput } from "@/lib/types/student";
import * as studentDb from "@/lib/db/students";

interface StudentsState {
  students: Student[];
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  selectedIds: Set<string>;

  // Actions
  loadStudents: (ownerId: string) => Promise<void>;
  addStudent: (ownerId: string, data: CreateStudentInput) => Promise<Student>;
  updateStudent: (id: string, updates: Partial<Student>) => Promise<void>;
  deleteStudent: (id: string) => Promise<void>;
  restoreStudent: (id: string) => Promise<void>;
  importStudents: (ownerId: string, students: CreateStudentInput[], mode: ImportMode) => Promise<ImportResult>;
  deleteAllStudents: (ownerId: string) => Promise<number>;
  
  // UI Actions
  setSearchQuery: (query: string) => void;
  toggleSelection: (id: string) => void;
  selectAll: () => void;
  clearSelection: () => void;
  setError: (error: string | null) => void;
}

export const useStudentsStore = create<StudentsState>((set, get) => ({
  students: [],
  isLoading: false,
  error: null,
  searchQuery: "",
  selectedIds: new Set(),

  loadStudents: async (ownerId: string) => {
    set({ isLoading: true, error: null });
    try {
      const students = await studentDb.getStudents(ownerId);
      set({ students, isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : "Failed to load students",
        isLoading: false 
      });
    }
  },

  addStudent: async (ownerId: string, data: CreateStudentInput) => {
    try {
      const student = await studentDb.createStudent(ownerId, data);
      set((state) => ({ students: [...state.students, student] }));
      return student;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to add student";
      set({ error: message });
      throw error;
    }
  },

  updateStudent: async (id: string, updates: Partial<Student>) => {
    try {
      const updated = await studentDb.updateStudent(id, updates);
      set((state) => ({
        students: state.students.map((s) => (s.id === id ? updated : s)),
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update student";
      set({ error: message });
      throw error;
    }
  },

  deleteStudent: async (id: string) => {
    try {
      await studentDb.deleteStudent(id);
      set((state) => ({
        students: state.students.filter((s) => s.id !== id),
        selectedIds: new Set(Array.from(state.selectedIds).filter((sid) => sid !== id)),
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete student";
      set({ error: message });
      throw error;
    }
  },

  restoreStudent: async (id: string) => {
    try {
      await studentDb.restoreStudent(id);
      // Reload students to get the restored one
      const ownerId = get().students[0]?.ownerId;
      if (ownerId) {
        await get().loadStudents(ownerId);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to restore student";
      set({ error: message });
      throw error;
    }
  },

  importStudents: async (ownerId: string, students: CreateStudentInput[], mode: ImportMode) => {
    set({ isLoading: true, error: null });
    try {
      const result = await studentDb.importStudents(ownerId, students, mode);
      await get().loadStudents(ownerId);
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to import students";
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  deleteAllStudents: async (ownerId: string) => {
    set({ isLoading: true, error: null });
    try {
      const count = await studentDb.deleteAllStudents(ownerId);
      set({ students: [], isLoading: false, selectedIds: new Set() });
      return count;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete students";
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  setSearchQuery: (query: string) => set({ searchQuery: query }),

  toggleSelection: (id: string) => {
    set((state) => {
      const newSelection = new Set(state.selectedIds);
      if (newSelection.has(id)) {
        newSelection.delete(id);
      } else {
        newSelection.add(id);
      }
      return { selectedIds: newSelection };
    });
  },

  selectAll: () => {
    set((state) => ({
      selectedIds: new Set(state.students.map((s) => s.id)),
    }));
  },

  clearSelection: () => set({ selectedIds: new Set() }),

  setError: (error: string | null) => set({ error }),
}));
