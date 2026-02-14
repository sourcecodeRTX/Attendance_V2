import { db, type LocalAttendance } from "./index";
import type {
  AttendanceSummary,
  StudentAttendanceRecord,
  AttendanceMode,
} from "@/lib/types/attendance";
import { addToSyncQueue, triggerSync } from "./sync";
import { getStudents } from "./students";

function generateAttendanceId(subjectId: string, date: string): string {
  return `${subjectId}_${date}`;
}

function calculateSummary(records: StudentAttendanceRecord[]): AttendanceSummary {
  const total = records.length;
  const present = records.filter((r) => r.status === "present").length;
  const absent = records.filter((r) => r.status === "absent").length;
  const unmarked = records.filter((r) => r.status === "unmarked").length;
  const percentage = total > 0 ? Math.round((present / total) * 100 * 10) / 10 : 0;

  return { total, present, absent, unmarked, percentage };
}

export async function startAttendanceSession(
  ownerId: string,
  subjectId: string,
  date: string,
  mode: AttendanceMode = "mark-present"
): Promise<LocalAttendance> {
  const id = generateAttendanceId(subjectId, date);
  
  // Check if attendance already exists for this date
  const existing = await db.attendance.get(id);
  if (existing) {
    return existing;
  }

  // Get all students
  const students = await getStudents(ownerId);
  
  const now = new Date().toISOString();
  const records: StudentAttendanceRecord[] = students.map((student) => ({
    studentId: student.id,
    roll: student.roll,
    name: student.name,
    status: "unmarked",
  }));

  const attendance: LocalAttendance = {
    id,
    subjectId,
    ownerId,
    date,
    records,
    summary: calculateSummary(records),
    mode,
    isCompleted: false,
    createdAt: now,
    updatedAt: now,
    lastSynced: 0,
    pendingSync: true,
    localVersion: 1,
    serverVersion: 0,
  };

  await db.attendance.add(attendance);
  await addToSyncQueue("create", "attendance", id, attendance);
  triggerSync();

  return attendance;
}

export async function updateAttendanceRecord(
  id: string,
  records: StudentAttendanceRecord[]
): Promise<LocalAttendance> {
  const attendance = await db.attendance.get(id);
  if (!attendance) throw new Error("Attendance record not found");

  const updated: LocalAttendance = {
    ...attendance,
    records,
    summary: calculateSummary(records),
    updatedAt: new Date().toISOString(),
    pendingSync: true,
    localVersion: attendance.localVersion + 1,
  };

  await db.attendance.put(updated);
  await addToSyncQueue("update", "attendance", id, updated);
  triggerSync();

  return updated;
}

export async function toggleStudentStatus(
  attendanceId: string,
  studentId: string,
  mode: AttendanceMode
): Promise<LocalAttendance> {
  const attendance = await db.attendance.get(attendanceId);
  if (!attendance) throw new Error("Attendance record not found");

  const records = attendance.records.map((r) => {
    if (r.studentId !== studentId) return r;

    let newStatus: StudentAttendanceRecord["status"];
    if (r.status === "unmarked") {
      newStatus = mode === "mark-present" ? "present" : "absent";
    } else {
      newStatus = "unmarked";
    }

    return { ...r, status: newStatus, markedAt: new Date().toISOString() };
  });

  return updateAttendanceRecord(attendanceId, records);
}

export async function markAllAs(
  attendanceId: string,
  status: "present" | "absent" | "unmarked"
): Promise<LocalAttendance> {
  const attendance = await db.attendance.get(attendanceId);
  if (!attendance) throw new Error("Attendance record not found");

  const records = attendance.records.map((r) => ({
    ...r,
    status,
    markedAt: new Date().toISOString(),
  }));

  return updateAttendanceRecord(attendanceId, records);
}

export async function completeAttendance(id: string): Promise<LocalAttendance> {
  const attendance = await db.attendance.get(id);
  if (!attendance) throw new Error("Attendance record not found");

  const updated: LocalAttendance = {
    ...attendance,
    isCompleted: true,
    updatedAt: new Date().toISOString(),
    pendingSync: true,
    localVersion: attendance.localVersion + 1,
  };

  await db.attendance.put(updated);
  await addToSyncQueue("update", "attendance", id, updated);
  triggerSync();

  return updated;
}

export async function reopenAttendance(id: string): Promise<LocalAttendance> {
  const attendance = await db.attendance.get(id);
  if (!attendance) throw new Error("Attendance record not found");

  const updated: LocalAttendance = {
    ...attendance,
    isCompleted: false,
    updatedAt: new Date().toISOString(),
    pendingSync: true,
    localVersion: attendance.localVersion + 1,
  };

  await db.attendance.put(updated);
  await addToSyncQueue("update", "attendance", id, updated);
  triggerSync();

  return updated;
}

export async function getAttendanceById(id: string): Promise<LocalAttendance | undefined> {
  return db.attendance.get(id);
}

export async function getAttendanceBySubjectAndDate(
  subjectId: string,
  date: string
): Promise<LocalAttendance | undefined> {
  const id = generateAttendanceId(subjectId, date);
  return db.attendance.get(id);
}

export async function getAttendanceHistory(
  subjectId: string
): Promise<LocalAttendance[]> {
  return db.attendance
    .where("subjectId")
    .equals(subjectId)
    .reverse()
    .sortBy("date");
}

export async function getAttendanceByOwner(ownerId: string): Promise<LocalAttendance[]> {
  return db.attendance.where("ownerId").equals(ownerId).toArray();
}

export async function deleteAttendance(id: string): Promise<void> {
  await db.attendance.delete(id);
  await addToSyncQueue("delete", "attendance", id, null);
  triggerSync();
}
