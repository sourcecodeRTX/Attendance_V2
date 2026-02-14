"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  CheckSquare,
  Users,
  Check,
  X,
  Save,
  Undo2,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { db } from "@/lib/db";
import {
  getAttendanceBySubjectAndDate,
  startAttendanceSession,
  updateAttendanceRecord,
} from "@/lib/db/attendance";
import type { Student } from "@/lib/types/student";
import type { Subject } from "@/lib/types/subject";
import type { AttendanceStatus, StudentAttendanceRecord } from "@/lib/types/attendance";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useUIStore } from "@/lib/stores/ui-store";
import { useToast } from "@/hooks/use-toast";
import { useSound } from "@/hooks/use-sound";
import { LoadingSpinner, LoadingScreen } from "@/components/shared/loading-spinner";
import { EmptyState } from "@/components/shared/empty-state";
import { cn } from "@/lib/utils/cn";

export default function AttendancePage() {
  const router = useRouter();
  const { toast } = useToast();
  const { playPresent, playAbsent, isEnabled: soundEnabled } = useSound();
  const { user, updatePreferences } = useAuthStore();
  const { studentSortOption } = useUIStore();

  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({});
  const [savedSnapshot, setSavedSnapshot] = useState<Record<string, AttendanceStatus>>({});
  const [existingRecordId, setExistingRecordId] = useState<string | null>(null);
  const [undoDialogOpen, setUndoDialogOpen] = useState(false);

  const hasChanges = useMemo(
    () => JSON.stringify(attendance) !== JSON.stringify(savedSnapshot),
    [attendance, savedSnapshot]
  );

  const canSave = hasChanges || !existingRecordId;

  // Load students & subjects once (filtered by ownerId + active only)
  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      try {
        const [s, sub] = await Promise.all([
          db.students
            .where("ownerId")
            .equals(user.id)
            .filter((st) => !st.isDeleted)
            .toArray(),
          db.subjects
            .where("ownerId")
            .equals(user.id)
            .filter((su) => !su.isArchived)
            .toArray(),
        ]);
        sub.sort((a, b) => a.name.localeCompare(b.name));
        setStudents(s);
        setSubjects(sub);
        if (sub.length > 0 && !selectedSubject) setSelectedSubject(sub[0].id);
      } catch {
        toast({ title: "Error", description: "Failed to load data", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load existing attendance or start fresh all-present
  useEffect(() => {
    if (!selectedSubject || !selectedDate || students.length === 0) return;

    (async () => {
      try {
        const existing = await getAttendanceBySubjectAndDate(selectedSubject, selectedDate);

        if (existing) {
          // Build map from existing records
          const map: Record<string, AttendanceStatus> = {};
          // Start with all present as default for any new students
          students.forEach((s) => { map[s.id] = "present"; });
          // Overlay existing statuses
          for (const rec of existing.records) {
            if (rec.status === "present" || rec.status === "absent") {
              map[rec.studentId] = rec.status;
            } else {
              map[rec.studentId] = "present"; // treat unmarked as present
            }
          }
          setAttendance(map);
          setSavedSnapshot(map);
          setExistingRecordId(existing.id);
        } else {
          // Fresh session: all present
          const fresh: Record<string, AttendanceStatus> = {};
          students.forEach((s) => { fresh[s.id] = "present"; });
          setAttendance(fresh);
          setSavedSnapshot(fresh);
          setExistingRecordId(null);
        }
      } catch (err) {
        console.error("Failed to load attendance:", err);
      }
    })();
  }, [selectedSubject, selectedDate, students]);

  // Toggle a student between present and absent
  const toggle = useCallback(
    (id: string) => {
      setAttendance((prev) => {
        const next = prev[id] === "present" ? "absent" : "present";
        if (next === "present") playPresent();
        else playAbsent();
        return { ...prev, [id]: next };
      });
    },
    [playPresent, playAbsent]
  );

  // Mark everyone at once
  const markAll = (status: AttendanceStatus) => {
    const map: Record<string, AttendanceStatus> = {};
    students.forEach((s) => {
      map[s.id] = status;
    });
    setAttendance(map);
    if (status === "present") playPresent();
    else playAbsent();
  };

  // Undo to last saved state
  const handleUndo = () => {
    setAttendance(savedSnapshot);
    setUndoDialogOpen(false);
    toast({ title: "Reverted", description: "Attendance restored to last saved state" });
  };

  // Save attendance
  const handleSave = async () => {
    if (!selectedSubject || !selectedDate) return;
    setSaving(true);
    try {
      const records: StudentAttendanceRecord[] = Object.entries(attendance).map(
        ([studentId, status]) => {
          const stu = students.find((s) => s.id === studentId);
          return { studentId, roll: stu?.roll ?? 0, name: stu?.name ?? "", status };
        }
      );

      if (existingRecordId) {
        await updateAttendanceRecord(existingRecordId, records);
      } else {
        const session = await startAttendanceSession(user?.id ?? "local", selectedSubject, selectedDate);
        await updateAttendanceRecord(session.id, records);
        setExistingRecordId(session.id);
      }

      // Update snapshot to match current state (marks as "no changes")
      setSavedSnapshot({ ...attendance });

      toast({ title: "Saved", description: "Attendance saved successfully" });
    } catch {
      toast({ title: "Error", description: "Failed to save attendance", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // Stats
  const stats = useMemo(() => {
    const vals = Object.values(attendance);
    const present = vals.filter((s) => s === "present").length;
    const absent = vals.filter((s) => s === "absent").length;
    return { present, absent, total: students.length };
  }, [attendance, students]);

  // --- Guards ---
  if (loading) return <LoadingScreen message="Loading attendance..." />;

  if (subjects.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Attendance</h1>
        <Card>
          <CardContent className="py-8">
            <EmptyState
              icon={CheckSquare}
              title="No subjects yet"
              description="Add a subject first"
              action={{ label: "Add Subject", onClick: () => router.push("/subjects") }}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (students.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Attendance</h1>
        <Card>
          <CardContent className="py-8">
            <EmptyState
              icon={Users}
              title="No students yet"
              description="Add students first"
              action={{ label: "Add Student", onClick: () => router.push("/students") }}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Attendance</h1>
          <p className="text-muted-foreground">Tap a student to toggle present / absent</p>
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <Button variant="outline" onClick={() => setUndoDialogOpen(true)}>
              <Undo2 className="mr-2 h-4 w-4" />
              Undo
            </Button>
          )}
          <Button onClick={handleSave} disabled={saving || !canSave}>
            {saving ? <LoadingSpinner size="sm" className="mr-2" /> : <Save className="mr-2 h-4 w-4" />}
            Save
          </Button>
        </div>
      </div>

      {/* Subject & Date */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Subject</Label>
          <select
            value={selectedSubject || ""}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
          >
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} {s.code && `(${s.code})`}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label>Date</Label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.present}</div>
            <div className="text-xs text-muted-foreground">Present</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-2xl font-bold text-red-500">{stats.absent}</div>
            <div className="text-xs text-muted-foreground">Absent</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-xs text-muted-foreground">Total</div>
          </CardContent>
        </Card>
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => markAll("present")}
          className="text-green-600 border-green-600 hover:bg-green-600/10"
        >
          <Check className="mr-2 h-4 w-4" />
          All Present
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => markAll("absent")}
          className="text-red-500 border-red-500 hover:bg-red-500/10"
        >
          <X className="mr-2 h-4 w-4" />
          All Absent
        </Button>
        <div className="ml-auto">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => updatePreferences({ soundEnabled: !soundEnabled })}
            className={cn(soundEnabled && "text-primary")}
            title={soundEnabled ? "Sound on" : "Sound off"}
          >
            {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Student list */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Students ({students.length})</CardTitle>
          <CardDescription>Tap to toggle present / absent</CardDescription>
        </CardHeader>
        <div className="max-h-[50vh] min-h-[300px] overflow-auto">
          <CardContent className="space-y-2 pt-0">
            {(() => {
              const sorted = [...students];
              switch (studentSortOption) {
                case "ascending":
                  sorted.sort((a, b) => a.roll - b.roll);
                  break;
                case "descending":
                  sorted.sort((a, b) => b.roll - a.roll);
                  break;
                case "original":
                  sorted.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
                  break;
              }
              return sorted;
            })().map((student) => {
              const status = attendance[student.id] || "present";
              const isPresent = status === "present";
              return (
                <button
                  key={student.id}
                  onClick={() => toggle(student.id)}
                  className={cn(
                    "w-full flex items-center justify-between p-3 rounded-lg transition-colors text-left",
                    "hover:bg-muted/50",
                    isPresent
                      ? "bg-green-500/10 hover:bg-green-500/20"
                      : "bg-red-500/10 hover:bg-red-500/20"
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span className="font-mono text-xs shrink-0 min-w-[5rem] max-w-[8rem] text-muted-foreground">
                      {student.roll}
                    </span>
                    <span className="font-medium truncate">{student.name}</span>
                  </div>
                  <div
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium shrink-0",
                      isPresent ? "bg-green-600 text-white" : "bg-red-500 text-white"
                    )}
                  >
                    {isPresent ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                    {isPresent ? "Present" : "Absent"}
                  </div>
                </button>
              );
            })}
          </CardContent>
        </div>
      </Card>

      {/* Undo dialog */}
      <Dialog open={undoDialogOpen} onOpenChange={setUndoDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Undo Changes</DialogTitle>
            <DialogDescription>
              Revert to the last saved state? Unsaved changes will be lost.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUndoDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUndo}>Undo Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
