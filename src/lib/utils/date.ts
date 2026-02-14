import { format, parseISO, isValid } from "date-fns";

export function formatDate(date: Date | string, formatStr = "MMM d, yyyy"): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  if (!isValid(d)) return "Invalid date";
  return format(d, formatStr);
}

export function formatDateTime(date: Date | string): string {
  return formatDate(date, "MMM d, yyyy 'at' h:mm a");
}

export function formatDateISO(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function getTodayISO(): string {
  return formatDateISO(new Date());
}

export function getRelativeTime(date: Date | string): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  if (!isValid(d)) return "Unknown";

  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}
