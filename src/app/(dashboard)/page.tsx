"use client";

import { useEffect, useState } from "react";
import { Users, BookOpen, CheckSquare, TrendingUp, Calendar, Clock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { db } from "@/lib/db";
import { getRelativeTime, getTodayISO } from "@/lib/utils/date";
import { LoadingScreen } from "@/components/shared/loading-spinner";
import { EmptyState } from "@/components/shared/empty-state";
import { useAuthStore } from "@/lib/stores/auth-store";

interface DashboardStats {
  totalStudents: number;
  totalSubjects: number;
  todayAttendance: number;
  averageAttendance: number;
}

interface RecentAttendance {
  id: string;
  subjectName: string;
  date: string;
  present: number;
  total: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentRecords, setRecentRecords] = useState<RecentAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();

  useEffect(() => {
    if (!user?.id) return;
    const ownerId = user.id;

    async function loadDashboardData() {
      try {
        const [allStudents, allSubjects, allAttendance] = await Promise.all([
          db.students.where("ownerId").equals(ownerId).toArray(),
          db.subjects.where("ownerId").equals(ownerId).toArray(),
          db.attendance.where("ownerId").equals(ownerId).toArray(),
        ]);

        const activeStudents = allStudents.filter((s) => !s.isDeleted).length;
        const activeSubjects = allSubjects.filter((s) => !s.isArchived).length;

        // Today's sessions: date is stored as "YYYY-MM-DD" string
        const todayStr = getTodayISO();
        const todayRecords = allAttendance.filter((a) => a.date === todayStr).length;

        // Calculate overall average attendance from ALL records
        let totalPresent = 0;
        let totalRecords = 0;

        for (const record of allAttendance) {
          totalPresent += record.summary.present;
          totalRecords += record.summary.total;
        }

        const avgAttendance =
          totalRecords > 0
            ? Math.round((totalPresent / totalRecords) * 100)
            : 0;

        setStats({
          totalStudents: activeStudents,
          totalSubjects: activeSubjects,
          todayAttendance: todayRecords,
          averageAttendance: avgAttendance,
        });

        // Build subject map for names
        const subjectMap = new Map<string, string>();
        allSubjects.forEach((s) => subjectMap.set(s.id, s.name));

        // Recent 5 attendance records, sorted by date descending
        const sorted = allAttendance
          .slice()
          .sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : 0));

        const recent: RecentAttendance[] = sorted.slice(0, 5).map((record) => ({
          id: record.id,
          subjectName: subjectMap.get(record.subjectId) || "Unknown Subject",
          date: record.date,
          present: record.summary.present,
          total: record.summary.total,
        }));

        setRecentRecords(recent);
      } catch (error) {
        console.error("Failed to load dashboard data:", error);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, [user?.id]);

  if (loading) {
    return <LoadingScreen message="Loading dashboard..." />;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back! Here&apos;s an overview of your attendance data.
          </p>
        </div>
        <Button asChild>
          <Link href="/attendance">
            <CheckSquare className="mr-2 h-4 w-4" />
            Mark Attendance
          </Link>
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalStudents || 0}</div>
            <p className="text-xs text-muted-foreground">
              Registered students
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Subjects</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalSubjects || 0}</div>
            <p className="text-xs text-muted-foreground">
              Active subjects
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today&apos;s Sessions</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.todayAttendance || 0}</div>
            <p className="text-xs text-muted-foreground">
              Attendance marked today
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Attendance</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.averageAttendance || 0}%</div>
            <p className="text-xs text-muted-foreground">
              Overall attendance rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions & Recent Activity */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks at a glance</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            <Button variant="outline" className="justify-start" asChild>
              <Link href="/students">
                <Users className="mr-2 h-4 w-4" />
                Manage Students
              </Link>
            </Button>
            <Button variant="outline" className="justify-start" asChild>
              <Link href="/subjects">
                <BookOpen className="mr-2 h-4 w-4" />
                Manage Subjects
              </Link>
            </Button>
            <Button variant="outline" className="justify-start" asChild>
              <Link href="/export">
                <TrendingUp className="mr-2 h-4 w-4" />
                Export Reports
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Recent Attendance */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Attendance</CardTitle>
            <CardDescription>Latest attendance sessions</CardDescription>
          </CardHeader>
          <CardContent>
            {recentRecords.length === 0 ? (
              <EmptyState
                icon={Clock}
                title="No attendance records"
                description="Start marking attendance to see recent activity here."
                className="py-6"
              />
            ) : (
              <div className="space-y-4">
                {recentRecords.map((record) => (
                  <div
                    key={record.id}
                    className="flex items-center justify-between"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{record.subjectName}</p>
                      <p className="text-xs text-muted-foreground">
                        {getRelativeTime(record.date)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {record.present}/{record.total}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {record.total > 0
                          ? Math.round((record.present / record.total) * 100)
                          : 0}% present
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
