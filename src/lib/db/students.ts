import { db, type LocalStudent, generateUUID } from "./index";
import type { CreateStudentInput, ImportMode, ImportResult } from "@/lib/types/student";
import { addToSyncQueue, triggerSync } from "./sync";

export async function createStudent(
  ownerId: string,
  data: CreateStudentInput
): Promise<LocalStudent> {
  const existing = await db.students
    .where("[ownerId+roll]")
    .equals([ownerId, data.roll])
    .first();

  if (existing && !existing.isDeleted) {
    throw new Error(`Student with roll ${data.roll} already exists`);
  }

  const id = generateUUID();
  const now = new Date().toISOString();

  const student: LocalStudent = {
    id,
    ownerId,
    roll: data.roll,
    name: data.name,
    section: data.section ?? "",
    department: data.department ?? "",
    createdAt: now,
    updatedAt: now,
    isDeleted: false,
    lastSynced: 0,
    pendingSync: true,
  };

  await db.students.add(student);
  await addToSyncQueue("create", "students", id, student);
  triggerSync();

  return student;
}

export async function updateStudent(
  id: string,
  updates: Partial<LocalStudent>
): Promise<LocalStudent> {
  const student = await db.students.get(id);
  if (!student) throw new Error("Student not found");

  const updated: LocalStudent = {
    ...student,
    ...updates,
    updatedAt: new Date().toISOString(),
    pendingSync: true,
  };

  await db.students.put(updated);
  await addToSyncQueue("update", "students", id, updated);
  triggerSync();

  return updated;
}

export async function deleteStudent(id: string): Promise<void> {
  await updateStudent(id, { isDeleted: true });
}

export async function restoreStudent(id: string): Promise<void> {
  await updateStudent(id, { isDeleted: false });
}

export async function getStudents(ownerId: string): Promise<LocalStudent[]> {
  return db.students
    .where("ownerId")
    .equals(ownerId)
    .filter((s) => !s.isDeleted)
    .toArray();
}

export async function getStudentById(id: string): Promise<LocalStudent | undefined> {
  return db.students.get(id);
}

export async function importStudents(
  ownerId: string,
  students: CreateStudentInput[],
  mode: ImportMode
): Promise<ImportResult> {
  const results: ImportResult = {
    added: 0,
    updated: 0,
    skipped: 0,
    errors: [],
    skippedItems: [],
  };

  const existing = await db.students.where("ownerId").equals(ownerId).toArray();
  const existingByRoll = new Map(existing.map((s) => [s.roll, s]));

  for (const input of students) {
    try {
      const existingStudent = existingByRoll.get(input.roll);

      if (existingStudent && !existingStudent.isDeleted) {
        if (mode === "skip") {
          results.skipped++;
          results.skippedItems.push({
            roll: input.roll,
            name: input.name,
            reason: "Duplicate roll number",
          });
          continue;
        }
        if (mode === "replace" || mode === "merge") {
          await updateStudent(existingStudent.id, {
            name: input.name,
            section: input.section ?? existingStudent.section,
            department: input.department ?? existingStudent.department,
          });
          results.updated++;
          continue;
        }
      }

      await createStudent(ownerId, input);
      results.added++;
    } catch (error) {
      results.errors.push({
        roll: input.roll,
        name: input.name,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return results;
}

export async function deleteAllStudents(ownerId: string): Promise<number> {
  const students = await getStudents(ownerId);
  let count = 0;

  for (const student of students) {
    await deleteStudent(student.id);
    count++;
  }

  return count;
}
