export interface User {
  id: string;
  email: string;
  displayName: string;
  className: string;
  section: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserPreferences {
  theme: "light" | "dark" | "system";
  defaultMode: "mark-present" | "mark-absent";
  soundEnabled: boolean;
  keyboardShortcutsEnabled: boolean;
}
