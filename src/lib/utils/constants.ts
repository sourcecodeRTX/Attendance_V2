export const APP_NAME = "ATT Tracker";
export const APP_VERSION = "2.0.0";

export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
} as const;

export const SIDEBAR_WIDTH = 260;
export const SIDEBAR_WIDTH_COLLAPSED = 72;
export const HEADER_HEIGHT = 64;

export const SYNC_DEBOUNCE_MS = 100;
export const MAX_SYNC_RETRIES = 3;

export const MAX_WHATSAPP_LENGTH = 4096;
export const CLOUD_CODE_LENGTH = 8;

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_IMPORT_SIZE = 10000;

export const ATTENDANCE_MODES = {
  MARK_PRESENT: "mark-present",
  MARK_ABSENT: "mark-absent",
} as const;

export const STATUS = {
  PRESENT: "present",
  ABSENT: "absent",
  UNMARKED: "unmarked",
} as const;

export const EXPORT_FORMATS = {
  CSV: "csv",
  EXCEL: "excel",
  PDF: "pdf",
  JSON: "json",
} as const;

export const NAV_ITEMS = [
  { icon: "LayoutDashboard", label: "Dashboard", href: "/" },
  { icon: "Users", label: "Students", href: "/students" },
  { icon: "BookOpen", label: "Subjects", href: "/subjects" },
  { icon: "CheckSquare", label: "Attendance", href: "/attendance" },
  { icon: "Download", label: "Export", href: "/export" },
] as const;

export const KEYBOARD_SHORTCUTS = {
  togglePresent: { key: "p", ctrl: false },
  toggleAbsent: { key: "a", ctrl: false },
  toggleSound: { key: "s", ctrl: false },
  complete: { key: "Enter", ctrl: true },
  search: { key: "k", ctrl: true },
} as const;

export const FIREBASE_ERROR_MESSAGES: Record<string, string> = {
  "auth/user-not-found": "No account found with this email",
  "auth/wrong-password": "Incorrect password",
  "auth/email-already-in-use": "An account with this email already exists",
  "auth/weak-password": "Password is too weak",
  "auth/invalid-email": "Invalid email address",
  "auth/invalid-credential": "Invalid email or password",
  "auth/network-request-failed": "Network error. Check your connection.",
  "auth/too-many-requests": "Too many attempts. Please try again later.",
  "auth/requires-recent-login": "Please log in again to perform this action.",
};
