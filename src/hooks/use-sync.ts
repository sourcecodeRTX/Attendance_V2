"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { db } from "@/lib/db";
import { processSyncQueue, getSyncQueue, retryFailedSync, clearSyncQueue } from "@/lib/db/sync";
import type { SyncQueueItem } from "@/lib/types/sync";
import { useOnline } from "./use-online";

function useSyncEvent(callback: () => void) {
  const cbRef = useRef(callback);
  cbRef.current = callback;

  useEffect(() => {
    const handler = () => cbRef.current();
    window.addEventListener("sync-status-changed", handler);
    return () => window.removeEventListener("sync-status-changed", handler);
  }, []);
}

interface SyncStatus {
  pendingCount: number;
  isSyncing: boolean;
  hasError: boolean;
  lastSyncTime: Date | null;
}

export function useSyncStatus(): SyncStatus {
  const [status, setStatus] = useState<SyncStatus>({
    pendingCount: 0,
    isSyncing: false,
    hasError: false,
    lastSyncTime: null,
  });

  const refresh = useCallback(async () => {
    try {
      const count = await db.syncQueue.count();
      setStatus((prev) => ({
        ...prev,
        pendingCount: count,
        lastSyncTime: count < prev.pendingCount ? new Date() : prev.lastSyncTime,
      }));
    } catch {
      // ignore
    }
  }, []);

  useSyncEvent(refresh);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return status;
}

interface DetailedSyncStatus {
  pendingCount: number;
  isSyncing: boolean;
  hasError: boolean;
  lastSyncTime: Date | null;
  queueItems: SyncQueueItem[];
  failedCount: number;
}

export function useDetailedSyncStatus(): DetailedSyncStatus {
  const [status, setStatus] = useState<DetailedSyncStatus>({
    pendingCount: 0,
    isSyncing: false,
    hasError: false,
    lastSyncTime: null,
    queueItems: [],
    failedCount: 0,
  });

  const refresh = useCallback(async () => {
    try {
      const items = await getSyncQueue();
      const failed = items.filter((i) => i.retryCount > 0).length;
      setStatus((prev) => ({
        ...prev,
        pendingCount: items.length,
        queueItems: items,
        failedCount: failed,
        hasError: failed > 0,
        lastSyncTime: items.length < prev.pendingCount ? new Date() : prev.lastSyncTime,
      }));
    } catch {
      // ignore
    }
  }, []);

  useSyncEvent(refresh);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return status;
}

export function useSync() {
  const isOnline = useOnline();
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const syncingRef = useRef(false);
  const [pendingCount, setPendingCount] = useState(0);

  const sync = useCallback(async () => {
    if (!isOnline || syncingRef.current) return;

    syncingRef.current = true;
    setIsSyncing(true);
    setError(null);

    try {
      await processSyncQueue();
      setLastSyncTime(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      syncingRef.current = false;
      setIsSyncing(false);
    }
  }, [isOnline]);

  const retryFailed = useCallback(async () => {
    await retryFailedSync();
    await sync();
  }, [sync]);

  const clearQueue = useCallback(async () => {
    await clearSyncQueue();
  }, []);

  // Refresh pending count on sync events
  const refreshCount = useCallback(async () => {
    try {
      const count = await db.syncQueue.count();
      setPendingCount(count);
      // Auto-trigger sync when new items appear
      if (count > 0 && isOnline && !syncingRef.current) {
        sync();
      }
    } catch {
      // ignore
    }
  }, [isOnline, sync]);
  useSyncEvent(refreshCount);

  // Sync immediately when coming online
  useEffect(() => {
    if (isOnline) sync();
  }, [isOnline, sync]);

  // Sync on visibility change (tab re-focus)
  useEffect(() => {
    if (!isOnline) return;

    const onVisible = () => {
      if (document.visibilityState === "visible") sync();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [isOnline, sync]);

  // Safety-net poll every 15s (reduced from 30s for faster sync)
  useEffect(() => {
    if (!isOnline) return;
    const interval = setInterval(sync, 15000);
    return () => clearInterval(interval);
  }, [isOnline, sync]);

  return { sync, isSyncing, error, lastSyncTime, retryFailed, clearQueue, pendingCount };
}
