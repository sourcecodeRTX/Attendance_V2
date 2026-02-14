import { db, type LocalSubject, generateUUID } from "./index";
import type { CreateSubjectInput } from "@/lib/types/subject";
import { addToSyncQueue, triggerSync } from "./sync";

export async function createSubject(
  ownerId: string,
  data: CreateSubjectInput
): Promise<LocalSubject> {
  const id = generateUUID();
  const now = new Date().toISOString();

  const subject: LocalSubject = {
    id,
    ownerId,
    name: data.name,
    code: data.code ?? "",
    section: data.section ?? "",
    className: data.className ?? "",
    teacherName: data.teacherName ?? "",
    createdAt: now,
    updatedAt: now,
    isArchived: false,
    lastSynced: 0,
    pendingSync: true,
  };

  await db.subjects.add(subject);
  await addToSyncQueue("create", "subjects", id, subject);
  triggerSync();

  return subject;
}

export async function updateSubject(
  id: string,
  updates: Partial<LocalSubject>
): Promise<LocalSubject> {
  const subject = await db.subjects.get(id);
  if (!subject) throw new Error("Subject not found");

  const updated: LocalSubject = {
    ...subject,
    ...updates,
    updatedAt: new Date().toISOString(),
    pendingSync: true,
  };

  await db.subjects.put(updated);
  await addToSyncQueue("update", "subjects", id, updated);
  triggerSync();

  return updated;
}

export async function archiveSubject(id: string): Promise<void> {
  await updateSubject(id, { isArchived: true });
}

export async function restoreSubject(id: string): Promise<void> {
  await updateSubject(id, { isArchived: false });
}

export async function deleteSubject(id: string): Promise<void> {
  // Soft delete by archiving - allows for undo
  await updateSubject(id, { isArchived: true });
}

export async function permanentlyDeleteSubject(id: string): Promise<void> {
  const subject = await db.subjects.get(id);
  if (!subject) throw new Error("Subject not found");

  await db.subjects.delete(id);
  await addToSyncQueue("delete", "subjects", id, null);
  triggerSync();
}

export async function getSubjects(ownerId: string): Promise<LocalSubject[]> {
  return db.subjects
    .where("ownerId")
    .equals(ownerId)
    .filter((s) => !s.isArchived)
    .toArray();
}

export async function getAllSubjects(ownerId: string): Promise<LocalSubject[]> {
  return db.subjects.where("ownerId").equals(ownerId).toArray();
}

export async function getSubjectById(id: string): Promise<LocalSubject | undefined> {
  return db.subjects.get(id);
}
