import { db } from "./index";
import { doc, setDoc, deleteDoc, collection as firestoreCollection, getDocs } from "firebase/firestore";
import { firestore, auth } from "@/lib/firebase/config";
import type { SyncQueueItem } from "@/lib/types/sync";
import { SYNC_DEBOUNCE_MS, MAX_SYNC_RETRIES } from "@/lib/utils/constants";

export type { SyncQueueItem };

let syncTimeout: ReturnType<typeof setTimeout> | null = null;
let isSyncing = false;
let pendingRerun = false;

export async function addToSyncQueue(
  type: SyncQueueItem["type"],
  collection: SyncQueueItem["collection"],
  documentId: string,
  data: unknown
): Promise<void> {
  await db.syncQueue.add({
    type,
    collection,
    documentId,
    data,
    createdAt: Date.now(),
    retryCount: 0,
  });
}

export function triggerSync(): void {
  if (syncTimeout) clearTimeout(syncTimeout);

  syncTimeout = setTimeout(() => {
    processQueue();
  }, SYNC_DEBOUNCE_MS);

  emitSyncEvent();
}

function emitSyncEvent(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("sync-status-changed"));
  }
}

async function processQueue(): Promise<void> {
  if (typeof navigator === "undefined" || !navigator.onLine) {
    return;
  }

  if (isSyncing) {
    // Queue another run after current finishes
    pendingRerun = true;
    return;
  }

  isSyncing = true;
  emitSyncEvent();

  try {
    const queue = await db.syncQueue.orderBy("createdAt").toArray();

    for (const item of queue) {
      try {
        await syncItem(item);
        await db.syncQueue.delete(item.id!);
      } catch (error) {
        if (item.retryCount >= MAX_SYNC_RETRIES) {
          console.error("Sync failed after max retries:", item);
          await db.syncQueue.delete(item.id!);
        } else {
          await db.syncQueue.update(item.id!, {
            retryCount: item.retryCount + 1,
            lastError: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }
    }
  } finally {
    isSyncing = false;
    emitSyncEvent();

    if (pendingRerun) {
      pendingRerun = false;
      processQueue();
    }
  }
}

async function syncItem(item: SyncQueueItem): Promise<void> {
  const user = auth.currentUser;
  if (!user) {
    console.log("No authenticated user, skipping sync");
    return;
  }

  const docRef = doc(firestore, "users", user.uid, item.collection, item.documentId);

  try {
    switch (item.type) {
      case "create":
      case "update": {
        const raw = item.data as Record<string, unknown>;
        const cleaned: Record<string, unknown> = { syncedAt: new Date().toISOString(), userId: user.uid };
        for (const [k, v] of Object.entries(raw)) {
          if (v !== undefined) cleaned[k] = v;
        }
        await setDoc(docRef, cleaned, { merge: true });
        console.log(`Synced ${item.type} for ${item.collection}/${item.documentId}`);
        break;
      }

      case "delete":
        await deleteDoc(docRef);
        console.log(`Synced delete for ${item.collection}/${item.documentId}`);
        break;

      default:
        console.warn(`Unknown sync type: ${item.type}`);
    }
  } catch (error) {
    console.error(`Failed to sync ${item.collection}/${item.documentId}:`, error);
    throw error;
  }
}

export async function processSyncQueue(): Promise<void> {
  await processQueue();
}

export async function getPendingSyncCount(): Promise<number> {
  return db.syncQueue.count();
}

export async function getSyncQueue(): Promise<SyncQueueItem[]> {
  return db.syncQueue.orderBy("createdAt").toArray();
}

export async function clearSyncQueue(): Promise<void> {
  await db.syncQueue.clear();
}

export async function retryFailedSync(): Promise<void> {
  const failedItems = await db.syncQueue
    .filter((item) => item.retryCount > 0)
    .toArray();

  for (const item of failedItems) {
    await db.syncQueue.update(item.id!, { retryCount: 0, lastError: undefined });
  }

  triggerSync();
}

export async function clearCloudData(): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");

  const collections = ["students", "subjects", "attendance"] as const;

  for (const col of collections) {
    const colRef = firestoreCollection(firestore, "users", user.uid, col);
    const snapshot = await getDocs(colRef);
    const deletes = snapshot.docs.map((d) => deleteDoc(d.ref));
    await Promise.all(deletes);
  }
}

export interface PullResult {
  students: number;
  subjects: number;
  attendance: number;
  errors: number;
}

export async function pullFromCloud(): Promise<PullResult> {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");

  const result: PullResult = { students: 0, subjects: 0, attendance: 0, errors: 0 };
  const now = Date.now();

  // --- Students ---
  try {
    const studentsRef = firestoreCollection(firestore, "users", user.uid, "students");
    const studentsSnap = await getDocs(studentsRef);
    for (const d of studentsSnap.docs) {
      try {
        const data = d.data();
        await db.students.put({
          id: d.id,
          ownerId: data.ownerId ?? user.uid,
          roll: data.roll ?? 0,
          name: data.name ?? "",
          section: data.section ?? "",
          department: data.department ?? "",
          sortOrder: data.sortOrder ?? 0,
          createdAt: data.createdAt ?? new Date().toISOString(),
          updatedAt: data.updatedAt ?? new Date().toISOString(),
          isDeleted: data.isDeleted ?? false,
          lastSynced: now,
          pendingSync: false,
        });
        result.students++;
      } catch (e) {
        console.error("Failed to save student", d.id, e);
        result.errors++;
      }
    }
  } catch (e) {
    console.error("Failed to fetch students collection", e);
  }

  // --- Subjects ---
  try {
    const subjectsRef = firestoreCollection(firestore, "users", user.uid, "subjects");
    const subjectsSnap = await getDocs(subjectsRef);
    for (const d of subjectsSnap.docs) {
      try {
        const data = d.data();
        await db.subjects.put({
          id: d.id,
          ownerId: data.ownerId ?? user.uid,
          name: data.name ?? "",
          code: data.code ?? "",
          teacherName: data.teacherName ?? "",
          createdAt: data.createdAt ?? new Date().toISOString(),
          updatedAt: data.updatedAt ?? new Date().toISOString(),
          isArchived: data.isArchived ?? false,
          lastSynced: now,
          pendingSync: false,
        });
        result.subjects++;
      } catch (e) {
        console.error("Failed to save subject", d.id, e);
        result.errors++;
      }
    }
  } catch (e) {
    console.error("Failed to fetch subjects collection", e);
  }

  // --- Attendance ---
  try {
    const attendanceRef = firestoreCollection(firestore, "users", user.uid, "attendance");
    const attendanceSnap = await getDocs(attendanceRef);
    for (const d of attendanceSnap.docs) {
      try {
        const data = d.data();
        await db.attendance.put({
          id: d.id,
          subjectId: data.subjectId ?? "",
          ownerId: data.ownerId ?? user.uid,
          date: data.date ?? "",
          records: data.records ?? [],
          summary: data.summary ?? { total: 0, present: 0, absent: 0, unmarked: 0, percentage: 0 },
          mode: data.mode ?? "mark-present",
          isCompleted: data.isCompleted ?? false,
          createdAt: data.createdAt ?? new Date().toISOString(),
          updatedAt: data.updatedAt ?? new Date().toISOString(),
          lastSynced: now,
          pendingSync: false,
          localVersion: data.localVersion ?? 1,
          serverVersion: data.serverVersion ?? 1,
        });
        result.attendance++;
      } catch (e) {
        console.error("Failed to save attendance", d.id, e);
        result.errors++;
      }
    }
  } catch (e) {
    console.error("Failed to fetch attendance collection", e);
  }

  return result;
}

// Initialize online listener
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    console.log("Back online, processing sync queue...");
    processQueue();
  });
}
