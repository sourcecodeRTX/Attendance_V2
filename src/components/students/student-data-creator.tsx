"use client";

import { useState } from "react";
import {
  Plus,
  Trash2,
  Download,
  Upload,
  Copy,
  AlertCircle,
  Edit3,
  Save,
  Sparkles,
  ClipboardPaste,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useIsMobile } from "@/hooks/use-media-query";
import { useToast } from "@/hooks/use-toast";
import type { CreateStudentInput } from "@/lib/types/student";

interface StudentRow {
  id: string;
  roll: string;
  name: string;
  section: string;
  department: string;
  isEditing: boolean;
}

interface StudentDataCreatorProps {
  onImport: (students: CreateStudentInput[]) => void;
  onOpenAI: () => void;
  onClose: () => void;
}

export function StudentDataCreator({ onImport, onOpenAI, onClose }: StudentDataCreatorProps) {
  const [students, setStudents] = useState<StudentRow[]>([
    { id: "1", roll: "", name: "", section: "", department: "", isEditing: true },
  ]);
  const [bulkText, setBulkText] = useState("");
  const [showBulkInput, setShowBulkInput] = useState(true);
  const [errors, setErrors] = useState<string[]>([]);
  const isMobile = useIsMobile();
  const { toast } = useToast();

  const addNewRow = () => {
    setStudents([
      ...students,
      {
        id: Date.now().toString(),
        roll: "",
        name: "",
        section: "",
        department: "",
        isEditing: true,
      },
    ]);
  };

  const removeRow = (id: string) => {
    if (students.length > 1) {
      setStudents(students.filter((s) => s.id !== id));
    }
  };

  const updateField = (id: string, field: keyof StudentRow, value: string) => {
    setStudents(students.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
  };

  const toggleEdit = (id: string) => {
    setStudents(students.map((s) => (s.id === id ? { ...s, isEditing: !s.isEditing } : s)));
  };

  const validateData = (): string[] => {
    const errs: string[] = [];
    const rollSet = new Set<string>();

    students.forEach((s, i) => {
      const row = i + 1;
      if (!s.roll.trim()) {
        errs.push(`Row ${row}: Roll number is required`);
      } else {
        const r = s.roll.trim();
        if (rollSet.has(r)) errs.push(`Row ${row}: Duplicate roll number "${r}"`);
        else rollSet.add(r);
        if (!/^\d+$/.test(r)) errs.push(`Row ${row}: Roll number must be numeric`);
      }
      if (!s.name.trim()) errs.push(`Row ${row}: Student name is required`);
    });

    return errs;
  };

  const processBulkText = () => {
    const lines = bulkText
      .trim()
      .split("\n")
      .filter((l) => l.trim());

    if (lines.length === 0) return;

    const newStudents: StudentRow[] = [];

    lines.forEach((line, i) => {
      const parts = line.split(/[,\t]/).map((p) => p.trim());
      if (parts.length >= 2) {
        newStudents.push({
          id: `bulk-${Date.now()}-${i}`,
          roll: parts[0] || "",
          name: parts[1] || "",
          section: parts[2] || "",
          department: parts[3] || "",
          isEditing: false,
        });
      }
    });

    if (newStudents.length > 0) {
      const hasEmptyDefault =
        students.length === 1 && !students[0].roll && !students[0].name;
      setStudents(hasEmptyDefault ? newStudents : [...students, ...newStudents]);
      setBulkText("");
      setShowBulkInput(false);
      setErrors([]);
      toast({
        title: "Students Added",
        description: `${newStudents.length} students parsed from text`,
      });
    } else {
      setErrors(["No valid data found. Use format: Roll,Name,Section,Department"]);
    }
  };

  const exportAsCSV = () => {
    const validationErrors = validateData();
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    const headers = ["Roll Number", "Student Name", "Section", "Department"];
    const csv = [
      headers.join(","),
      ...students.map((s) =>
        [s.roll, s.name, s.section, s.department].map((f) => `"${f}"`).join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `students-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportAsExcel = async () => {
    const validationErrors = validateData();
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    const XLSX = await import("xlsx");
    const ws = XLSX.utils.json_to_sheet(
      students.map((s) => ({
        "Roll Number": s.roll,
        "Student Name": s.name,
        Section: s.section,
        Department: s.department,
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Students");
    XLSX.writeFile(wb, `students-${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  const handleImport = () => {
    const validationErrors = validateData();
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    const data: CreateStudentInput[] = students.map((s) => ({
      roll: parseInt(s.roll, 10),
      name: s.name.trim(),
      section: s.section.trim() || undefined,
      department: s.department.trim() || undefined,
    }));

    onImport(data);
  };

  const clearAll = () => {
    setStudents([{ id: "1", roll: "", name: "", section: "", department: "", isEditing: true }]);
    setErrors([]);
    setBulkText("");
    setShowBulkInput(true);
  };

  const filledCount = students.filter((s) => s.roll && s.name).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Student Data Creator</h3>
          <p className="text-sm text-muted-foreground">
            Create student data manually or paste from AI output
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
            <div className="space-y-1 text-sm text-destructive">
              {errors.slice(0, 5).map((e, i) => (
                <p key={i}>{e}</p>
              ))}
              {errors.length > 5 && <p>...and {errors.length - 5} more errors</p>}
            </div>
          </div>
        </div>
      )}

      {/* Bulk Paste Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <ClipboardPaste className="h-4 w-4" />
            Paste Data
          </CardTitle>
        </CardHeader>
        <CardContent>
          {showBulkInput ? (
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label className="text-xs text-muted-foreground">
                    Format: Roll,Name,Section,Department (one per line)
                  </Label>
                  <Button
                    variant="link"
                    size="sm"
                    className="text-xs h-auto p-0"
                    onClick={onOpenAI}
                  >
                    <Sparkles className="h-3 w-3 mr-1" />
                    Get data from AI
                  </Button>
                </div>
                <textarea
                  className="w-full h-32 p-3 border rounded-lg bg-background text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder={"24100110019,B Muniharish,PHOENIX,BTECH CSE CORE\n24100110022,Bareddy.Rajareddy,PHOENIX,BTECH CSE CORE\n101,John Doe,A,Computer Science"}
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={processBulkText} disabled={!bulkText.trim()}>
                  <Upload className="h-3.5 w-3.5 mr-1.5" />
                  Parse & Add
                </Button>
                {students.filter((s) => s.roll || s.name).length > 0 && (
                  <Button size="sm" variant="outline" onClick={() => setShowBulkInput(false)}>
                    Cancel
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowBulkInput(true)}
              className="w-full"
            >
              <Copy className="h-3.5 w-3.5 mr-1.5" />
              Paste More Students
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Manual Entry / Student Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Edit3 className="h-4 w-4" />
              Students
              <span className="ml-1 text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                {filledCount} of {students.length}
              </span>
            </CardTitle>
            {students.length > 1 && (
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={clearAll}>
                Clear All
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className={students.length > 5 ? "h-[300px]" : ""}>
            <div className="space-y-2">
              {/* Header row (desktop) */}
              {!isMobile && (
                <div className="grid grid-cols-[1fr_1.5fr_0.8fr_1fr_auto] gap-2 px-1 text-xs font-medium text-muted-foreground">
                  <span>Roll *</span>
                  <span>Name *</span>
                  <span>Section</span>
                  <span>Department</span>
                  <span className="w-16" />
                </div>
              )}

              {students.map((student, index) => (
                <div
                  key={student.id}
                  className="border rounded-lg p-2"
                >
                  {isMobile ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">
                          #{index + 1}
                        </span>
                        <div className="flex gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => toggleEdit(student.id)}
                          >
                            {student.isEditing ? (
                              <Save className="h-3.5 w-3.5" />
                            ) : (
                              <Edit3 className="h-3.5 w-3.5" />
                            )}
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => removeRow(student.id)}
                            disabled={students.length === 1}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-[10px] text-muted-foreground">Roll *</Label>
                          <Input
                            className="h-8 text-sm"
                            placeholder="101"
                            value={student.roll}
                            onChange={(e) => updateField(student.id, "roll", e.target.value)}
                            disabled={!student.isEditing}
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] text-muted-foreground">Name *</Label>
                          <Input
                            className="h-8 text-sm"
                            placeholder="John Doe"
                            value={student.name}
                            onChange={(e) => updateField(student.id, "name", e.target.value)}
                            disabled={!student.isEditing}
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] text-muted-foreground">Section</Label>
                          <Input
                            className="h-8 text-sm"
                            placeholder="A"
                            value={student.section}
                            onChange={(e) => updateField(student.id, "section", e.target.value)}
                            disabled={!student.isEditing}
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] text-muted-foreground">Department</Label>
                          <Input
                            className="h-8 text-sm"
                            placeholder="CSE"
                            value={student.department}
                            onChange={(e) => updateField(student.id, "department", e.target.value)}
                            disabled={!student.isEditing}
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-[1fr_1.5fr_0.8fr_1fr_auto] gap-2 items-center">
                      <Input
                        className="h-8 text-sm"
                        placeholder="101"
                        value={student.roll}
                        onChange={(e) => updateField(student.id, "roll", e.target.value)}
                        disabled={!student.isEditing}
                      />
                      <Input
                        className="h-8 text-sm"
                        placeholder="John Doe"
                        value={student.name}
                        onChange={(e) => updateField(student.id, "name", e.target.value)}
                        disabled={!student.isEditing}
                      />
                      <Input
                        className="h-8 text-sm"
                        placeholder="A"
                        value={student.section}
                        onChange={(e) => updateField(student.id, "section", e.target.value)}
                        disabled={!student.isEditing}
                      />
                      <Input
                        className="h-8 text-sm"
                        placeholder="CSE"
                        value={student.department}
                        onChange={(e) => updateField(student.id, "department", e.target.value)}
                        disabled={!student.isEditing}
                      />
                      <div className="flex gap-1 w-16 justify-end">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => toggleEdit(student.id)}
                        >
                          {student.isEditing ? (
                            <Save className="h-3.5 w-3.5" />
                          ) : (
                            <Edit3 className="h-3.5 w-3.5" />
                          )}
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => removeRow(student.id)}
                          disabled={students.length === 1}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>

          <Button
            variant="outline"
            size="sm"
            className="w-full mt-3"
            onClick={addNewRow}
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Add Row
          </Button>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-2">
        <Button variant="outline" size="sm" onClick={exportAsCSV} className="flex-1">
          <Download className="h-3.5 w-3.5 mr-1.5" />
          Export CSV
        </Button>
        <Button variant="outline" size="sm" onClick={exportAsExcel} className="flex-1">
          <Download className="h-3.5 w-3.5 mr-1.5" />
          Export Excel
        </Button>
        <Button size="sm" onClick={handleImport} disabled={filledCount === 0} className="flex-1">
          <Upload className="h-3.5 w-3.5 mr-1.5" />
          Import {filledCount} Students
        </Button>
      </div>
    </div>
  );
}
