export type SyncStatus = "synced" | "syncing" | "pending" | "offline" | "error";

export interface SyncQueueItem {
  id?: number;
  type: "create" | "update" | "delete";
  collection: "students" | "subjects" | "attendance";
  documentId: string;
  data: unknown;
  createdAt: number;
  retryCount: number;
  lastError?: string;
}

export interface SyncState {
  status: SyncStatus;
  pendingCount: number;
  lastSyncedAt?: number;
  error?: string;
}

export interface LocalEntity {
  lastSynced: number;
  pendingSync: boolean;
  localVersion: number;
  serverVersion: number;
}
