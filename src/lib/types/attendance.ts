export type AttendanceStatus = "present" | "absent" | "unmarked";
export type AttendanceMode = "mark-present" | "mark-absent";

export interface StudentAttendanceRecord {
  studentId: string;
  roll: number;
  name: string;
  status: AttendanceStatus;
  markedAt?: string;
}

export interface AttendanceSummary {
  total: number;
  present: number;
  absent: number;
  unmarked: number;
  percentage: number;
}

export interface AttendanceRecord {
  id: string; // "{subjectId}_{date}"
  subjectId: string;
  ownerId: string;
  date: string; // ISO date string YYYY-MM-DD
  records: StudentAttendanceRecord[];
  summary: AttendanceSummary;
  mode: AttendanceMode;
  isCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceHistoryItem {
  id: string;
  date: string;
  subjectId: string;
  subjectName: string;
  summary: AttendanceSummary;
  isCompleted: boolean;
}

export interface StudentAttendanceStats {
  studentId: string;
  studentName: string;
  roll: number;
  totalSessions: number;
  presentCount: number;
  absentCount: number;
  attendancePercentage: number;
}
