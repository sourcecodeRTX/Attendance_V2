"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { StudentSortOption } from "@/lib/types/student";

interface UIState {
  sidebarCollapsed: boolean;
  mobileNavOpen: boolean;
  soundEnabled: boolean;
  studentSortOption: StudentSortOption;
  
  // Actions
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setMobileNavOpen: (open: boolean) => void;
  toggleSound: () => void;
  setSoundEnabled: (enabled: boolean) => void;
  setStudentSortOption: (option: StudentSortOption) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      mobileNavOpen: false,
      soundEnabled: true,
      studentSortOption: "ascending" as StudentSortOption,

      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

      setSidebarCollapsed: (collapsed: boolean) =>
        set({ sidebarCollapsed: collapsed }),

      setMobileNavOpen: (open: boolean) =>
        set({ mobileNavOpen: open }),

      toggleSound: () =>
        set((state) => ({ soundEnabled: !state.soundEnabled })),

      setSoundEnabled: (enabled: boolean) =>
        set({ soundEnabled: enabled }),

      setStudentSortOption: (option: StudentSortOption) =>
        set({ studentSortOption: option }),
    }),
    {
      name: "ui-storage",
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        soundEnabled: state.soundEnabled,
        studentSortOption: state.studentSortOption,
      }),
    }
  )
);
