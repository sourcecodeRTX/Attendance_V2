"use client";

import { Cloud, CloudOff, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useOnline } from "@/hooks/use-online";
import { useSyncStatus } from "@/hooks/use-sync";

interface SyncIndicatorProps {
  collapsed?: boolean;
}

export function SyncIndicator({ collapsed }: SyncIndicatorProps) {
  const isOnline = useOnline();
  const { pendingCount, isSyncing, hasError } = useSyncStatus();

  const getStatus = () => {
    if (!isOnline) return "offline";
    if (hasError) return "error";
    if (isSyncing) return "syncing";
    if (pendingCount > 0) return "pending";
    return "synced";
  };

  const status = getStatus();

  const statusConfig = {
    synced: {
      icon: CheckCircle,
      color: "text-success",
      label: "Synced",
    },
    syncing: {
      icon: Loader2,
      color: "text-info",
      label: "Syncing...",
      animate: true,
    },
    pending: {
      icon: Cloud,
      color: "text-warning",
      label: `${pendingCount} pending`,
    },
    offline: {
      icon: CloudOff,
      color: "text-muted-foreground",
      label: "Offline",
    },
    error: {
      icon: AlertCircle,
      color: "text-destructive",
      label: "Sync error",
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div className={cn(
      "flex items-center gap-2 px-3 py-2",
      collapsed && "justify-center px-2"
    )}>
      <Icon
        className={cn(
          "h-4 w-4",
          config.color,
          "animate" in config && config.animate && "animate-spin"
        )}
      />
      {!collapsed && (
        <span className="text-xs text-muted-foreground">{config.label}</span>
      )}
    </div>
  );
}
