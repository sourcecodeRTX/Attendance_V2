import Dexie, { type Table } from "dexie";
import type { User } from "@/lib/types/user";
import type { Student } from "@/lib/types/student";
import type { Subject } from "@/lib/types/subject";
import type { AttendanceRecord } from "@/lib/types/attendance";
import type { SyncQueueItem } from "@/lib/types/sync";

export interface LocalUser {
  id: string;
  data: User;
  lastSynced: number;
}

export interface LocalStudent extends Student {
  lastSynced: number;
  pendingSync: boolean;
}

export interface LocalSubject extends Subject {
  lastSynced: number;
  pendingSync: boolean;
}

export interface LocalAttendance extends AttendanceRecord {
  lastSynced: number;
  pendingSync: boolean;
  localVersion: number;
  serverVersion: number;
}

class AttendanceDatabase extends Dexie {
  users!: Table<LocalUser, string>;
  students!: Table<LocalStudent, string>;
  subjects!: Table<LocalSubject, string>;
  attendance!: Table<LocalAttendance, string>;
  syncQueue!: Table<SyncQueueItem, number>;

  constructor() {
    super("AttendanceTrackerV2");

    this.version(1).stores({
      users: "id",
      students: "id, ownerId, [ownerId+roll], roll, pendingSync",
      subjects: "id, ownerId, pendingSync",
      attendance: "id, subjectId, ownerId, date, pendingSync",
      syncQueue: "++id, type, collection, createdAt",
    });

    // Version 2: Add name index to subjects for orderBy queries
    this.version(2).stores({
      users: "id",
      students: "id, ownerId, [ownerId+roll], roll, pendingSync",
      subjects: "id, ownerId, name, pendingSync",
      attendance: "id, subjectId, ownerId, date, pendingSync",
      syncQueue: "++id, type, collection, createdAt",
    });

    // Version 3: Add sortOrder field to students for original import order
    this.version(3).stores({
      users: "id",
      students: "id, ownerId, [ownerId+roll], roll, sortOrder, pendingSync",
      subjects: "id, ownerId, name, pendingSync",
      attendance: "id, subjectId, ownerId, date, pendingSync",
      syncQueue: "++id, type, collection, createdAt",
    }).upgrade(async (tx) => {
      // Assign sortOrder to existing students based on their current roll order
      const students = await tx.table("students").toArray();
      const byOwner = new Map<string, typeof students>();
      for (const s of students) {
        const list = byOwner.get(s.ownerId) || [];
        list.push(s);
        byOwner.set(s.ownerId, list);
      }
      byOwner.forEach(async (list) => {
        list.sort((a: { roll: number }, b: { roll: number }) => a.roll - b.roll);
        for (let i = 0; i < list.length; i++) {
          await tx.table("students").update(list[i].id, { sortOrder: i });
        }
      });
    });
  }
}

export const db = new AttendanceDatabase();

export function generateUUID(): string {
  return crypto.randomUUID();
}

export async function clearAllData(): Promise<void> {
  await db.transaction("rw", [db.users, db.students, db.subjects, db.attendance, db.syncQueue], async () => {
    await db.users.clear();
    await db.students.clear();
    await db.subjects.clear();
    await db.attendance.clear();
    await db.syncQueue.clear();
  });
}

export async function getDatabaseStats(): Promise<{
  students: number;
  subjects: number;
  attendanceRecords: number;
  pendingSyncs: number;
}> {
  const [students, subjects, attendanceRecords, pendingSyncs] = await Promise.all([
    db.students.count(),
    db.subjects.count(),
    db.attendance.count(),
    db.syncQueue.count(),
  ]);

  return { students, subjects, attendanceRecords, pendingSyncs };
}
