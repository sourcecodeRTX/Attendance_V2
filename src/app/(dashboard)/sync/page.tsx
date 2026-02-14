"use client";

import { useState } from "react";
import {
  RefreshCw,
  Cloud,
  CloudOff,
  CheckCircle,
  AlertCircle,
  Trash2,
  RotateCcw,
  Database,
  Loader2,
  Clock,
  ArrowUpCircle,
  ArrowDownCircle,
  XCircle,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useOnline } from "@/hooks/use-online";
import { useDetailedSyncStatus, useSync } from "@/hooks/use-sync";
import { useToast } from "@/hooks/use-toast";
import { db, getDatabaseStats } from "@/lib/db";
import { clearCloudData, pullFromCloud } from "@/lib/db/sync";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { cn } from "@/lib/utils/cn";
import { useEffect } from "react";

export default function SyncPage() {
  const isOnline = useOnline();
  const { pendingCount, queueItems, failedCount } = useDetailedSyncStatus();
  const { sync, isSyncing, error, lastSyncTime, retryFailed, clearQueue } = useSync();
  const { toast } = useToast();

  const [clearDataOpen, setClearDataOpen] = useState(false);
  const [clearQueueOpen, setClearQueueOpen] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [clearMode, setClearMode] = useState<"local" | "everywhere">("local");
  const [stats, setStats] = useState({ students: 0, subjects: 0, attendanceRecords: 0, pendingSyncs: 0 });

  useEffect(() => {
    const loadStats = async () => {
      try {
        const s = await getDatabaseStats();
        setStats(s);
      } catch {}
    };
    loadStats();
    const interval = setInterval(loadStats, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleSyncNow = async () => {
    await sync();
    toast({ title: "Sync complete", description: pendingCount > 0 ? `${pendingCount} items still pending` : "Everything is up to date" });
  };

  const handleRetryFailed = async () => {
    await retryFailed();
    toast({ title: "Retrying", description: "Failed items have been queued for retry" });
  };

  const handleClearQueue = async () => {
    await clearQueue();
    setClearQueueOpen(false);
    toast({ title: "Queue cleared", description: "All pending sync items have been removed" });
  };

  const handleDownloadFromCloud = async () => {
    setDownloading(true);
    try {
      const result = await pullFromCloud();
      const total = result.students + result.subjects + result.attendance;
      const errMsg = result.errors > 0 ? ` (${result.errors} failed)` : "";
      toast({
        title: total > 0 ? "Download complete" : "No data found",
        description: total > 0
          ? `Downloaded ${result.students} students, ${result.subjects} subjects, ${result.attendance} records${errMsg}`
          : "No data found in your cloud account. Try syncing first.",
        variant: result.errors > 0 ? "destructive" : "default",
      });
    } catch {
      toast({ title: "Error", description: "Failed to download cloud data", variant: "destructive" });
    } finally {
      setDownloading(false);
    }
  };

  const handleClearAllData = async () => {
    setClearing(true);
    try {
      if (clearMode === "everywhere" && isOnline) {
        await clearCloudData();
      }

      await db.students.clear();
      await db.subjects.clear();
      await db.attendance.clear();
      await db.syncQueue.clear();

      const msg = clearMode === "everywhere"
        ? "Local and cloud data deleted"
        : "Local data deleted (cloud data untouched)";
      toast({ title: "Data cleared", description: msg });
      setClearDataOpen(false);
    } catch {
      toast({ title: "Error", description: "Failed to clear data", variant: "destructive" });
    } finally {
      setClearing(false);
    }
  };

  const typeIcon = (type: string) => {
    switch (type) {
      case "create": return <ArrowUpCircle className="h-4 w-4 text-green-500" />;
      case "update": return <ArrowDownCircle className="h-4 w-4 text-blue-500" />;
      case "delete": return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <Cloud className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Sync & Data</h1>
        <p className="text-muted-foreground">Monitor sync status and manage your data</p>
      </div>

      {/* Top row: Connection + Controls side by side on desktop */}
      <div className="grid gap-6 lg:grid-cols-2">

      {/* Connection Status */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isOnline ? (
                <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
                  <Cloud className="h-5 w-5 text-green-500" />
                </div>
              ) : (
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                  <CloudOff className="h-5 w-5 text-muted-foreground" />
                </div>
              )}
              <div>
                <p className="font-medium">{isOnline ? "Online" : "Offline"}</p>
                <p className="text-sm text-muted-foreground">
                  {isOnline
                    ? pendingCount === 0
                      ? "Everything is synced"
                      : `${pendingCount} item${pendingCount > 1 ? "s" : ""} waiting to sync`
                    : "Changes will sync when you're back online"}
                </p>
              </div>
            </div>
            {lastSyncTime && (
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {lastSyncTime.toLocaleTimeString()}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Sync Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Sync Controls
          </CardTitle>
          <CardDescription>Manually trigger sync operations</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            className="w-full"
            onClick={handleSyncNow}
            disabled={!isOnline || isSyncing}
          >
            {isSyncing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            {isSyncing ? "Syncing..." : "Sync Now"}
          </Button>

          <Button
            variant="outline"
            className="w-full"
            onClick={handleDownloadFromCloud}
            disabled={!isOnline || downloading}
          >
            {downloading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            {downloading ? "Downloading..." : "Download from Cloud"}
          </Button>

          {failedCount > 0 && (
            <Button
              variant="outline"
              className="w-full"
              onClick={handleRetryFailed}
              disabled={!isOnline || isSyncing}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Retry {failedCount} Failed Item{failedCount > 1 ? "s" : ""}
            </Button>
          )}

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      </div>{/* end top row grid */}

      {/* Bottom row: Queue + Data side by side on desktop */}
      <div className="grid gap-6 lg:grid-cols-2">

      {/* Sync Queue */}
      {queueItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Cloud className="h-5 w-5" />
                Pending Items
              </span>
              <span className="text-sm font-normal text-muted-foreground">
                {queueItems.length} item{queueItems.length > 1 ? "s" : ""}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {queueItems.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg border text-sm",
                    item.retryCount > 0 ? "border-destructive/30 bg-destructive/5" : "border-border"
                  )}
                >
                  <div className="flex items-center gap-3">
                    {typeIcon(item.type)}
                    <div>
                      <p className="font-medium capitalize">{item.type} {item.collection}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                        {item.documentId}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {item.retryCount > 0 && (
                      <span className="text-destructive">
                        {item.retryCount} retries
                      </span>
                    )}
                    <span>{new Date(item.createdAt).toLocaleTimeString()}</span>
                  </div>
                </div>
              ))}
            </div>

            <Separator className="my-4" />
            <Button
              variant="outline"
              size="sm"
              className="w-full text-muted-foreground"
              onClick={() => setClearQueueOpen(true)}
            >
              <Trash2 className="mr-2 h-3 w-3" />
              Clear Queue
            </Button>
          </CardContent>
        </Card>
      )}

      {/* All Synced */}
      {queueItems.length === 0 && isOnline && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <CheckCircle className="h-10 w-10 text-green-500 mb-3" />
              <p className="font-medium">All Synced</p>
              <p className="text-sm text-muted-foreground">No pending changes</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Local Data Stats — always visible */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Local Data
          </CardTitle>
          <CardDescription>Data stored on this device</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 rounded-lg bg-muted/50 text-center">
              <p className="text-2xl font-bold">{stats.students}</p>
              <p className="text-xs text-muted-foreground">Students</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 text-center">
              <p className="text-2xl font-bold">{stats.subjects}</p>
              <p className="text-xs text-muted-foreground">Subjects</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 text-center">
              <p className="text-2xl font-bold">{stats.attendanceRecords}</p>
              <p className="text-xs text-muted-foreground">Records</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 text-center">
              <p className="text-2xl font-bold">{stats.pendingSyncs}</p>
              <p className="text-xs text-muted-foreground">Pending Syncs</p>
            </div>
          </div>

          <Separator className="my-4" />

          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium text-destructive">Clear Data</p>
              <p className="text-xs text-muted-foreground">
                Remove students, subjects, and attendance records
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full sm:w-auto border-destructive text-destructive hover:bg-destructive/10"
                onClick={() => { setClearMode("local"); setClearDataOpen(true); }}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Clear Local Only
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="w-full sm:w-auto"
                disabled={!isOnline}
                onClick={() => { setClearMode("everywhere"); setClearDataOpen(true); }}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Clear Everywhere
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      </div>{/* end bottom row grid */}

      {/* Clear Queue Confirmation */}
      <AlertDialog open={clearQueueOpen} onOpenChange={setClearQueueOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear Sync Queue</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove all pending sync items. Unsynced changes will be lost and won&apos;t be uploaded to the cloud. Are you sure?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearQueue} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Clear Queue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Clear All Data Confirmation */}
      <AlertDialog open={clearDataOpen} onOpenChange={setClearDataOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {clearMode === "everywhere" ? "Clear All Data Everywhere" : "Clear Local Data"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {clearMode === "everywhere"
                ? "This will permanently delete all students, subjects, and attendance records from this device AND your cloud account. This cannot be undone."
                : "This will delete all data from this device only. Your cloud data will remain intact and you can re-download it anytime using the \"Download from Cloud\" button."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearAllData}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={clearing}
            >
              {clearing && <LoadingSpinner size="sm" className="mr-2" />}
              {clearMode === "everywhere" ? "Delete Everything" : "Delete Local Data"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
