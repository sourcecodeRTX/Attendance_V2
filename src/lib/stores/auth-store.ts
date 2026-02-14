"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User, UserPreferences } from "@/lib/types/user";

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  preferences: UserPreferences;
  _hasHydrated?: boolean;
  
  // Actions
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  updatePreferences: (preferences: Partial<UserPreferences>) => void;
  reset: () => void;
}

const defaultPreferences: UserPreferences = {
  theme: "system",
  defaultMode: "mark-present",
  soundEnabled: true,
  keyboardShortcutsEnabled: true,
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isLoading: true,
      isAuthenticated: false,
      preferences: defaultPreferences,

      setUser: (user) =>
        set({
          user,
          isAuthenticated: user !== null,
          isLoading: false,
        }),

      setLoading: (loading) =>
        set({ isLoading: loading }),

      updatePreferences: (preferences) =>
        set((state) => ({
          preferences: { ...state.preferences, ...preferences },
        })),

      reset: () =>
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          preferences: defaultPreferences,
        }),
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        preferences: state.preferences,
      }),
      onRehydrateStorage: () => {
        return (state) => {
          if (state) {
            state._hasHydrated = true;
          }
        };
      },
    }
  )
);
