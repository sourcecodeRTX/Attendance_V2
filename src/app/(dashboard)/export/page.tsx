"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Download,
  FileSpreadsheet,
  FileText,
  FileDown,
  Filter,
  MessageCircle,
  ChevronDown,
  Users,
  CheckCircle2,
  XCircle,
  BookOpen,
  CalendarDays,
  ClipboardList,
  UserCheck,
  UserX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { db } from "@/lib/db";
import type { LocalAttendance } from "@/lib/db/index";
import type { Subject } from "@/lib/types/subject";
import type { Student } from "@/lib/types/student";
import { useToast } from "@/hooks/use-toast";
import { LoadingScreen } from "@/components/shared/loading-spinner";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { cn } from "@/lib/utils/cn";
import { formatDate } from "@/lib/utils/date";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useUIStore } from "@/lib/stores/ui-store";

type ExportFormat = "csv" | "excel" | "pdf";

export default function ExportPage() {
  const [allRecords, setAllRecords] = useState<LocalAttendance[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSubjectId, setFilterSubjectId] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [whatsappRecord, setWhatsappRecord] = useState<LocalAttendance | null>(null);

  const { toast } = useToast();
  const { user } = useAuthStore();
  const { studentSortOption } = useUIStore();

  useEffect(() => {
    if (!user?.id) return;
    const ownerId = user.id;

    async function loadData() {
      try {
        const [attendanceData, subjectsData, studentsData] = await Promise.all([
          db.attendance.where("ownerId").equals(ownerId).toArray(),
          db.subjects.where("ownerId").equals(ownerId).filter((s) => !s.isArchived).toArray(),
          db.students.where("ownerId").equals(ownerId).filter((s) => !s.isDeleted).toArray(),
        ]);
        subjectsData.sort((a, b) => a.name.localeCompare(b.name));
        setAllRecords(attendanceData);
        setSubjects(subjectsData);
        setStudents(studentsData);
      } catch {
        toast({
          title: "Error",
          description: "Failed to load data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const subjectMap = useMemo(
    () => new Map(subjects.map((s) => [s.id, s])),
    [subjects]
  );

  const studentMap = useMemo(
    () => new Map(students.map((s) => [s.id, s])),
    [students]
  );

  const filteredRecords = useMemo(() => {
    let records = allRecords;
    if (filterSubjectId !== "all") {
      records = records.filter((r) => r.subjectId === filterSubjectId);
    }
    return records.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateB - dateA;
    });
  }, [allRecords, filterSubjectId]);

  const groupedByDate = useMemo(() => {
    const groups = new Map<string, LocalAttendance[]>();
    for (const record of filteredRecords) {
      const dateKey = record.date;
      const existing = groups.get(dateKey) || [];
      existing.push(record);
      groups.set(dateKey, existing);
    }
    return Array.from(groups.entries());
  }, [filteredRecords]);

  const sortRecordEntries = useCallback(
    (entries: LocalAttendance["records"]) => {
      const sorted = [...entries];
      switch (studentSortOption) {
        case "ascending":
          sorted.sort((a, b) => a.roll - b.roll);
          break;
        case "descending":
          sorted.sort((a, b) => b.roll - a.roll);
          break;
        case "original":
          sorted.sort((a, b) => {
            const studentA = studentMap.get(a.studentId);
            const studentB = studentMap.get(b.studentId);
            return (studentA?.sortOrder ?? 0) - (studentB?.sortOrder ?? 0);
          });
          break;
      }
      return sorted;
    },
    [studentSortOption, studentMap]
  );

  /** Derive section & class from subject first, fall back to students */
  const getRecordMeta = useCallback(
    (record: LocalAttendance) => {
      const subject = subjectMap.get(record.subjectId);

      // Prefer subject-level section/class, fall back to student-level
      let sectionStr = subject?.section || "";
      let classStr = subject?.className || "";

      if (!sectionStr || !classStr) {
        const sections = new Set<string>();
        const classes = new Set<string>();
        for (const entry of record.records) {
          const student = studentMap.get(entry.studentId);
          if (student?.section) sections.add(student.section);
          if (student?.department) classes.add(student.department);
        }
        if (!sectionStr && sections.size > 0) sectionStr = Array.from(sections).join(", ");
        if (!classStr && classes.size > 0) classStr = Array.from(classes).join(", ");
      }

      return {
        subjectName: subject?.name || "Unknown",
        subjectCode: subject?.code || "",
        section: sectionStr || "—",
        className: classStr || "—",
        date: formatDate(record.date, "EEEE, MMM d, yyyy"),
        time: record.updatedAt
          ? formatDate(record.updatedAt, "h:mm a")
          : record.createdAt
            ? formatDate(record.createdAt, "h:mm a")
            : "—",
      };
    },
    [subjectMap, studentMap]
  );

  const buildExportRows = useCallback(
    (record: LocalAttendance) => {
      const subject = subjectMap.get(record.subjectId);
      const rows: string[][] = [];
      const sortedEntries = sortRecordEntries(record.records);
      for (const entry of sortedEntries) {
        const student = studentMap.get(entry.studentId);
        if (!student) continue;
        rows.push([
          String(student.roll),
          student.name,
          subject?.name || "Unknown",
          formatDate(record.date),
          entry.status.charAt(0).toUpperCase() + entry.status.slice(1),
        ]);
      }
      return rows;
    },
    [subjectMap, studentMap, sortRecordEntries]
  );

  function downloadFile(content: string, filename: string, mimeType: string) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function handleExport(record: LocalAttendance, format: ExportFormat) {
    (async () => {
    try {
      const meta = getRecordMeta(record);
      const dateStr = formatDate(record.date, "yyyy-MM-dd");
      const safeSubject = meta.subjectName.replace(/[^a-zA-Z0-9]/g, "-");
      const baseName = `attendance-${safeSubject}-${dateStr}`;
      const header = ["Roll", "Name", "Subject", "Date", "Status"];
      const rows = buildExportRows(record);

      if (rows.length === 0) {
        toast({
          title: "No Data",
          description: "This report has no student records",
          variant: "destructive",
        });
        return;
      }

      const { present, absent, total, percentage } = record.summary;

      // Common info header rows for CSV / Excel
      const infoRows: string[][] = [
        ["Subject", meta.subjectName],
        ...(meta.subjectCode ? [["Code", meta.subjectCode]] : []),
        ["Section", meta.section],
        ["Class", meta.className],
        ["Date", meta.date],
        ["Time", meta.time],
        [],
      ];

      if (format === "csv") {
        const escapeCSV = (value: string) => {
          if (
            value.includes(",") ||
            value.includes('"') ||
            value.includes("\n")
          ) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        };
        const allRows = [...infoRows, header, ...rows];
        allRows.push([]);
        allRows.push(["Summary"]);
        allRows.push(["Total Students", String(total)]);
        allRows.push(["Present", String(present)]);
        allRows.push(["Absent", String(absent)]);
        allRows.push(["Attendance %", `${percentage}%`]);
        const csv = allRows.map((row) => row.map(escapeCSV).join(",")).join("\n");
        downloadFile(csv, `${baseName}.csv`, "text/csv");
      } else if (format === "excel") {
        const XLSX = await import("xlsx");

        // Attendance sheet with info header
        const sheetData = [
          ...infoRows,
          header,
          ...rows,
        ];
        const ws = XLSX.utils.aoa_to_sheet(sheetData);
        ws["!cols"] = [
          { wch: 14 },
          { wch: 25 },
          { wch: 20 },
          { wch: 18 },
          { wch: 10 },
        ];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Attendance");

        const statsData = [
          ["Attendance Summary"],
          [""],
          ["Subject", meta.subjectName],
          ...(meta.subjectCode ? [["Code", meta.subjectCode]] : []),
          ["Section", meta.section],
          ["Class", meta.className],
          ["Date", meta.date],
          ["Time", meta.time],
          [""],
          ["Total Students", String(total)],
          ["Present", String(present)],
          ["Absent", String(absent)],
          ["Attendance %", `${percentage}%`],
          [""],
          ["Generated", new Date().toLocaleString()],
        ];
        const statsWs = XLSX.utils.aoa_to_sheet(statsData);
        statsWs["!cols"] = [{ wch: 20 }, { wch: 25 }];
        XLSX.utils.book_append_sheet(wb, statsWs, "Summary");

        XLSX.writeFile(wb, `${baseName}.xlsx`);
      } else if (format === "pdf") {
        const { jsPDF } = await import("jspdf");
        const { default: autoTable } = await import("jspdf-autotable");
        const doc = new jsPDF();

        doc.setFontSize(18);
        doc.text("Attendance Report", 14, 20);

        doc.setFontSize(10);
        doc.setTextColor(100);
        let infoY = 30;
        doc.text(`Subject: ${meta.subjectName}${meta.subjectCode ? ` (${meta.subjectCode})` : ""}`, 14, infoY);
        infoY += 6;
        doc.text(`Section: ${meta.section}`, 14, infoY);
        infoY += 6;
        doc.text(`Class: ${meta.className}`, 14, infoY);
        infoY += 6;
        doc.text(`Date: ${meta.date}  |  Time: ${meta.time}`, 14, infoY);
        infoY += 6;
        doc.text(`Generated: ${new Date().toLocaleString()}`, 14, infoY);
        infoY += 6;

        autoTable(doc, {
          head: [header],
          body: rows,
          startY: infoY + 4,
          styles: { fontSize: 9 },
          headStyles: { fillColor: [23, 23, 23] },
          alternateRowStyles: { fillColor: [245, 245, 245] },
        });

        const finalY =
          (doc as unknown as { lastAutoTable?: { finalY: number } })
            .lastAutoTable?.finalY || 100;

        doc.setFontSize(12);
        doc.setTextColor(0);
        doc.text("Summary", 14, finalY + 15);
        doc.setFontSize(10);
        doc.text(`Total Students: ${total}`, 14, finalY + 24);
        doc.text(`Present: ${present}`, 14, finalY + 31);
        doc.text(`Absent: ${absent}`, 14, finalY + 38);
        doc.text(`Attendance: ${percentage}%`, 14, finalY + 45);

        doc.save(`${baseName}.pdf`);
      }

      toast({
        title: "Exported",
        description: `Report saved as ${format.toUpperCase()}`,
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to export report",
        variant: "destructive",
      });
    }
    })();
  }

  function openWhatsAppDialog(record: LocalAttendance) {
    setWhatsappRecord(record);
  }

  function handleWhatsAppShare(type: "present" | "absent") {
    if (!whatsappRecord) return;
    try {
      const record = whatsappRecord;
      const meta = getRecordMeta(record);
      const { present, absent, total, percentage } = record.summary;

      const sorted = sortRecordEntries(record.records);

      let message = `*ATTENDANCE REPORT*\n`;
      message += `Subject: *${meta.subjectName}*\n`;
      if (meta.subjectCode) message += `Code: ${meta.subjectCode}\n`;
      message += `Section: ${meta.section}\n`;
      message += `Class: ${meta.className}\n`;
      message += `Date: ${meta.date}\n`;
      message += `Time: ${meta.time}\n`;
      message += `---\n\n`;

      if (type === "absent") {
        const absentStudents = sorted.filter((r) => r.status === "absent");
        if (absentStudents.length > 0) {
          message += `*ABSENT STUDENTS (${absentStudents.length}):*\n`;
          absentStudents.forEach((s, i) => {
            message += `${i + 1}. ${s.name} (Roll: ${s.roll})\n`;
          });
        } else {
          message += `_No absent students_\n`;
        }
      } else {
        const presentStudents = sorted.filter((r) => r.status === "present");
        if (presentStudents.length > 0) {
          message += `*PRESENT STUDENTS (${presentStudents.length}):*\n`;
          presentStudents.forEach((s, i) => {
            message += `${i + 1}. ${s.name} (Roll: ${s.roll})\n`;
          });
        } else {
          message += `_No present students_\n`;
        }
      }

      message += `\n*Summary:*\n`;
      message += `Total Students: ${total}\n`;
      message += `Present: ${present} | Absent: ${absent}\n`;
      message += `Attendance: ${percentage}%`;

      const encodedMessage = encodeURIComponent(message);
      setWhatsappRecord(null);
      window.open(`https://wa.me/?text=${encodedMessage}`, "_blank");
    } catch {
      toast({
        title: "Error",
        description: "Failed to generate WhatsApp message",
        variant: "destructive",
      });
      setWhatsappRecord(null);
    }
  }

  function handleExportAll(format: ExportFormat) {
    (async () => {
    try {
      if (filteredRecords.length === 0) {
        toast({
          title: "No Data",
          description: "No attendance records to export",
          variant: "destructive",
        });
        return;
      }

      const header = ["Roll", "Name", "Subject", "Date", "Status"];

      const totalPresent = filteredRecords.reduce(
        (s, r) => s + r.summary.present,
        0
      );
      const totalAbsent = filteredRecords.reduce(
        (s, r) => s + r.summary.absent,
        0
      );
      const totalStudents = totalPresent + totalAbsent;

      const filterLabel =
        filterSubjectId === "all"
          ? "all-subjects"
          : (subjectMap.get(filterSubjectId)?.name || "unknown").replace(
              /[^a-zA-Z0-9]/g,
              "-"
            );
      const baseName = `attendance-${filterLabel}-all`;

      if (format === "csv") {
        const escapeCSV = (v: string) =>
          v.includes(",") || v.includes('"') || v.includes("\n")
            ? `"${v.replace(/"/g, '""')}"`
            : v;
        const csvRows: string[][] = [];
        for (const record of filteredRecords) {
          const meta = getRecordMeta(record);
          csvRows.push(["Subject", meta.subjectName]);
          if (meta.subjectCode) csvRows.push(["Code", meta.subjectCode]);
          csvRows.push(["Section", meta.section]);
          csvRows.push(["Class", meta.className]);
          csvRows.push(["Date", meta.date]);
          csvRows.push(["Time", meta.time]);
          csvRows.push([]);
          csvRows.push(header);
          csvRows.push(...buildExportRows(record));
          csvRows.push([]);
          csvRows.push(["Summary"]);
          csvRows.push(["Total Students", String(record.summary.total)]);
          csvRows.push(["Present", String(record.summary.present)]);
          csvRows.push(["Absent", String(record.summary.absent)]);
          csvRows.push(["Attendance %", `${record.summary.percentage}%`]);
          csvRows.push([]);
          csvRows.push([]);
        }
        csvRows.push(["Overall Summary"]);
        csvRows.push(["Total Records", String(totalStudents)]);
        csvRows.push(["Present", String(totalPresent)]);
        csvRows.push(["Absent", String(totalAbsent)]);
        csvRows.push(["Overall %", `${totalStudents > 0 ? ((totalPresent / totalStudents) * 100).toFixed(1) : 0}%`]);
        const csv = csvRows.map((r) => r.map(escapeCSV).join(",")).join("\n");
        downloadFile(csv, `${baseName}.csv`, "text/csv");
      } else if (format === "excel") {
        const XLSX = await import("xlsx");
        const wb = XLSX.utils.book_new();
        const usedNames = new Set<string>();

        for (const record of filteredRecords) {
          const subject = subjectMap.get(record.subjectId);
          const subName = subject?.name || "Unknown";
          const dateLabel = formatDate(record.date, "MM-dd");
          let sheetName = `${subName}-${dateLabel}`.slice(0, 31);
          let counter = 2;
          while (usedNames.has(sheetName)) {
            sheetName = `${subName}-${dateLabel}-${counter}`.slice(0, 31);
            counter++;
          }
          usedNames.add(sheetName);

          const meta = getRecordMeta(record);
          const rows = buildExportRows(record);
          const sheetData: string[][] = [
            ["Subject", meta.subjectName],
            ...(meta.subjectCode ? [["Code", meta.subjectCode]] : []),
            ["Section", meta.section],
            ["Class", meta.className],
            ["Date", meta.date],
            ["Time", meta.time],
            [],
            header,
            ...rows,
            [],
            ["Summary"],
            ["Total Students", String(record.summary.total)],
            ["Present", String(record.summary.present)],
            ["Absent", String(record.summary.absent)],
            ["Attendance %", `${record.summary.percentage}%`],
          ];
          const ws = XLSX.utils.aoa_to_sheet(sheetData);
          ws["!cols"] = [{ wch: 14 }, { wch: 25 }, { wch: 20 }, { wch: 18 }, { wch: 10 }];
          XLSX.utils.book_append_sheet(wb, ws, sheetName);
        }

        const statsWs = XLSX.utils.aoa_to_sheet([
          ["Overall Summary"],
          [""],
          ["Total Reports", String(filteredRecords.length)],
          ["Total Records", String(totalStudents)],
          ["Present", String(totalPresent)],
          ["Absent", String(totalAbsent)],
          [
            "Overall %",
            `${totalStudents > 0 ? ((totalPresent / totalStudents) * 100).toFixed(1) : 0}%`,
          ],
          [""],
          ["Generated", new Date().toLocaleString()],
        ]);
        statsWs["!cols"] = [{ wch: 20 }, { wch: 25 }];
        XLSX.utils.book_append_sheet(wb, statsWs, "Summary");

        XLSX.writeFile(wb, `${baseName}.xlsx`);
      } else if (format === "pdf") {
        const { jsPDF } = await import("jspdf");
        const { default: autoTable } = await import("jspdf-autotable");
        const doc = new jsPDF();
        let isFirstPage = true;

        for (const record of filteredRecords) {
          if (!isFirstPage) doc.addPage();
          isFirstPage = false;

          const meta = getRecordMeta(record);
          const rows = buildExportRows(record);
          const { present, absent, total, percentage } = record.summary;

          doc.setFontSize(16);
          doc.setTextColor(0);
          doc.text("Attendance Report", 14, 20);

          doc.setFontSize(10);
          doc.setTextColor(100);
          let iy = 30;
          doc.text(`Subject: ${meta.subjectName}${meta.subjectCode ? ` (${meta.subjectCode})` : ""}`, 14, iy);
          iy += 6;
          doc.text(`Section: ${meta.section}`, 14, iy);
          iy += 6;
          doc.text(`Class: ${meta.className}`, 14, iy);
          iy += 6;
          doc.text(`Date: ${meta.date}  |  Time: ${meta.time}`, 14, iy);
          iy += 6;
          doc.text(`Generated: ${new Date().toLocaleString()}`, 14, iy);
          iy += 6;

          autoTable(doc, {
            head: [header],
            body: rows,
            startY: iy + 4,
            styles: { fontSize: 9 },
            headStyles: { fillColor: [23, 23, 23] },
            alternateRowStyles: { fillColor: [245, 245, 245] },
          });

          const finalY =
            (doc as unknown as { lastAutoTable?: { finalY: number } })
              .lastAutoTable?.finalY || 100;

          doc.setFontSize(11);
          doc.setTextColor(0);
          doc.text("Summary", 14, finalY + 12);
          doc.setFontSize(10);
          doc.text(`Total: ${total}  |  Present: ${present}  |  Absent: ${absent}  |  ${percentage}%`, 14, finalY + 20);
        }

        doc.save(`${baseName}.pdf`);
      }

      toast({
        title: "Exported",
        description: `${filteredRecords.length} reports saved as ${format.toUpperCase()}`,
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to export data",
        variant: "destructive",
      });
    }
    })();
  }

  if (loading) {
    return <LoadingScreen message="Loading attendance reports..." />;
  }

  const activeSubjects = subjects.filter((s) => !s.isArchived);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports & Export"
        description="View, share, and export all attendance reports"
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" disabled={filteredRecords.length === 0}>
              <Download className="mr-2 h-4 w-4" />
              Export All
              <ChevronDown className="ml-2 h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Export Format</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleExportAll("csv")}>
              <FileText className="mr-2 h-4 w-4" />
              CSV (.csv)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExportAll("excel")}>
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Excel (.xlsx)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExportAll("pdf")}>
              <FileDown className="mr-2 h-4 w-4" />
              PDF (.pdf)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </PageHeader>

      {/* Subject Filter */}
      <div className="flex items-center gap-3 overflow-x-auto pb-1 scrollbar-none">
        <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
        <button
          onClick={() => setFilterSubjectId("all")}
          className={cn(
            "shrink-0 px-3.5 py-1.5 rounded-full text-sm font-medium border transition-colors",
            filterSubjectId === "all"
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-background text-foreground border-border hover:bg-muted"
          )}
        >
          All Subjects
        </button>
        {activeSubjects.map((subject) => (
          <button
            key={subject.id}
            onClick={() => setFilterSubjectId(subject.id)}
            className={cn(
              "shrink-0 px-3.5 py-1.5 rounded-full text-sm font-medium border transition-colors",
              filterSubjectId === subject.id
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background text-foreground border-border hover:bg-muted"
            )}
          >
            {subject.name}
          </button>
        ))}
      </div>

      {/* Reports */}
      {groupedByDate.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No reports found"
          description={
            filterSubjectId === "all"
              ? "You haven't taken any attendance yet. Start by marking attendance for a subject."
              : "No attendance records found for this subject."
          }
        />
      ) : (
        <div className="space-y-8">
          {groupedByDate.map(([dateKey, records]) => (
            <div key={dateKey} className="space-y-3">
              {/* Date Header */}
              <div className="flex items-center gap-2 sticky top-0 z-10 bg-background py-2">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  {formatDate(dateKey, "EEEE, MMM d, yyyy")}
                </h2>
                <span className="text-xs text-muted-foreground">
                  ({records.length} {records.length === 1 ? "report" : "reports"})
                </span>
              </div>

              {/* Report Cards for this date */}
              <div className="grid gap-3">
                {records.map((record) => {
                  const subject = subjectMap.get(record.subjectId);
                  const { present, absent, total, percentage } = record.summary;
                  const isExpanded = expandedId === record.id;

                  return (
                    <Card
                      key={record.id}
                      className={cn(
                        "transition-shadow",
                        isExpanded && "ring-1 ring-border"
                      )}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-3">
                          {/* Left: Subject info */}
                          <button
                            className="flex items-start gap-3 text-left min-w-0 flex-1"
                            onClick={() =>
                              setExpandedId(isExpanded ? null : record.id)
                            }
                          >
                            <div className="rounded-lg bg-muted p-2 shrink-0">
                              <BookOpen className="h-4 w-4 text-foreground" />
                            </div>
                            <div className="min-w-0">
                              <CardTitle className="text-base truncate">
                                {subject?.name || "Unknown Subject"}
                              </CardTitle>
                              <div className="flex items-center gap-3 mt-1 flex-wrap">
                                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                  <Users className="h-3 w-3" />
                                  {total}
                                </span>
                                <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                                  <CheckCircle2 className="h-3 w-3" />
                                  {present}
                                </span>
                                <span className="inline-flex items-center gap-1 text-xs text-red-500">
                                  <XCircle className="h-3 w-3" />
                                  {absent}
                                </span>
                                <span
                                  className={cn(
                                    "text-xs font-semibold px-1.5 py-0.5 rounded",
                                    percentage >= 75
                                      ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"
                                      : percentage >= 50
                                        ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400"
                                        : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
                                  )}
                                >
                                  {percentage}%
                                </span>
                              </div>
                            </div>
                          </button>

                          {/* Right: Action buttons */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/30"
                              onClick={() => openWhatsAppDialog(record)}
                              title="Share via WhatsApp"
                            >
                              <MessageCircle className="h-4 w-4" />
                            </Button>

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  title="Export report"
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>
                                  Export as
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleExport(record, "csv")}
                                >
                                  <FileText className="mr-2 h-4 w-4" />
                                  CSV
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleExport(record, "excel")}
                                >
                                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                                  Excel
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleExport(record, "pdf")}
                                >
                                  <FileDown className="mr-2 h-4 w-4" />
                                  PDF
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </CardHeader>

                      {/* Expanded student list */}
                      {isExpanded && (
                        <CardContent className="pt-0">
                          <div className="border-t pt-3">
                            <div className="grid grid-cols-[auto_1fr_auto] gap-x-4 gap-y-1.5 text-sm">
                              <span className="text-xs font-medium text-muted-foreground uppercase">
                                Roll
                              </span>
                              <span className="text-xs font-medium text-muted-foreground uppercase">
                                Name
                              </span>
                              <span className="text-xs font-medium text-muted-foreground uppercase">
                                Status
                              </span>

                              {sortRecordEntries(record.records)
                                .map((entry) => (
                                  <div
                                    key={entry.studentId}
                                    className="contents"
                                  >
                                    <span className="text-muted-foreground tabular-nums py-1">
                                      {entry.roll}
                                    </span>
                                    <span className="py-1 truncate">
                                      {entry.name}
                                    </span>
                                    <span className="py-1">
                                      {entry.status === "present" ? (
                                        <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400">
                                          <CheckCircle2 className="h-3 w-3" />
                                          P
                                        </span>
                                      ) : entry.status === "absent" ? (
                                        <span className="inline-flex items-center gap-1 text-xs font-medium text-red-500">
                                          <XCircle className="h-3 w-3" />
                                          A
                                        </span>
                                      ) : (
                                        <span className="text-xs text-muted-foreground">
                                          —
                                        </span>
                                      )}
                                    </span>
                                  </div>
                                ))}
                            </div>
                          </div>
                        </CardContent>
                      )}
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
      {/* WhatsApp Share Dialog */}
      <Dialog open={!!whatsappRecord} onOpenChange={(open) => { if (!open) setWhatsappRecord(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-green-600" />
              Share via WhatsApp
            </DialogTitle>
            <DialogDescription>
              Choose which students to include in the WhatsApp message.
              {whatsappRecord && (() => {
                const subj = subjectMap.get(whatsappRecord.subjectId);
                const { present, absent, total, percentage } = whatsappRecord.summary;
                return (
                  <span className="block mt-2 text-xs text-muted-foreground">
                    {subj?.name || "Unknown"} — {formatDate(whatsappRecord.date)} — {total} students ({present}P / {absent}A — {percentage}%)
                  </span>
                );
              })()}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={() => handleWhatsAppShare("present")}
              className="flex flex-col items-center gap-2 rounded-lg border-2 border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 p-4 transition-colors hover:bg-green-100 dark:hover:bg-green-900/40 hover:border-green-400 dark:hover:border-green-600"
            >
              <UserCheck className="h-8 w-8 text-green-600 dark:text-green-400" />
              <span className="text-sm font-semibold text-green-700 dark:text-green-300">Present Students</span>
              {whatsappRecord && (
                <span className="text-xs text-green-600 dark:text-green-400">{whatsappRecord.summary.present} students</span>
              )}
            </button>
            <button
              onClick={() => handleWhatsAppShare("absent")}
              className="flex flex-col items-center gap-2 rounded-lg border-2 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4 transition-colors hover:bg-red-100 dark:hover:bg-red-900/40 hover:border-red-400 dark:hover:border-red-600"
            >
              <UserX className="h-8 w-8 text-red-500 dark:text-red-400" />
              <span className="text-sm font-semibold text-red-700 dark:text-red-300">Absent Students</span>
              {whatsappRecord && (
                <span className="text-xs text-red-500 dark:text-red-400">{whatsappRecord.summary.absent} students</span>
              )}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
