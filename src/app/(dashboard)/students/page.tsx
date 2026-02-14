"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
  Plus,
  Search,
  Upload,
  MoreHorizontal,
  Edit,
  Trash2,
  Users,
  FileSpreadsheet,
  CheckCircle,
  ArrowUpDown,
  Check,
  ArrowUpAZ,
  ArrowDownAZ,
  ListOrdered,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { db } from "@/lib/db";
import { createStudent, updateStudent, deleteStudent, importStudents, restoreStudent } from "@/lib/db/students";
import type { Student, CreateStudentInput, ImportResult } from "@/lib/types/student";
import type { StudentSortOption } from "@/lib/types/student";
import { useStudentsStore } from "@/lib/stores/students-store";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useUIStore } from "@/lib/stores/ui-store";
import { useToast } from "@/hooks/use-toast";
import { useDebounce } from "@/hooks/use-debounce";
import { LoadingSpinner, LoadingScreen } from "@/components/shared/loading-spinner";
import { EmptyState } from "@/components/shared/empty-state";
import { cn } from "@/lib/utils/cn";
import Papa from "papaparse";
import { useDropzone } from "react-dropzone";
import { AIFormatDialog } from "@/components/students/ai-format-dialog";
import { StudentDataCreator } from "@/components/students/student-data-creator";

const ROLL_PATTERNS = ['roll', 'rollno', 'roll no', 'roll_no', 'roll number', 'id', 'student id', 'reg', 'registration', 'admission', 'sr', 'serial', 's.no', 'sno'];
const NAME_PATTERNS = ['name', 'student name', 'student_name', 'full name', 'fullname', 'student'];
const SECTION_PATTERNS = ['section', 'class', 'division', 'sec', 'batch'];
const DEPT_PATTERNS = ['department', 'dept', 'branch', 'stream', 'course'];

function findColumn(headers: string[], patterns: string[]): number {
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i].toLowerCase().trim();
    if (patterns.some(p => h === p || h.includes(p))) {
      return i;
    }
  }
  return -1;
}

export default function StudentsPage() {
  const searchParams = useSearchParams();
  const isOnboarding = searchParams.get("onboarding") === "true";
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Dialog states
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [deletingStudent, setDeletingStudent] = useState<Student | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(isOnboarding);
  const [importResultDialogOpen, setImportResultDialogOpen] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [parsedStudents, setParsedStudents] = useState<CreateStudentInput[]>([]);
  const [importStep, setImportStep] = useState<"upload" | "preview" | "importing">("upload");
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [dataCreatorOpen, setDataCreatorOpen] = useState(false);

  // Form state
  const [formData, setFormData] = useState({ name: "", roll: "" });
  const [formLoading, setFormLoading] = useState(false);

  const { selectedIds, toggleSelection, clearSelection } = useStudentsStore();
  const { user } = useAuthStore();
  const { studentSortOption, setStudentSortOption } = useUIStore();
  const selectedStudents = Array.from(selectedIds);
  const { toast } = useToast();

  useEffect(() => {
    if (user?.id) loadStudents();
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadStudents() {
    if (!user?.id) return;
    try {
      const data = await db.students
        .where("ownerId")
        .equals(user.id)
        .filter((s) => !s.isDeleted)
        .toArray();
      // Don't sort here - sorting is handled by the sort preference
      setStudents(data);
    } catch (error) {
      console.error("Failed to load students:", error);
      toast({
        title: "Error",
        description: "Failed to load students",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  const filteredStudents = useMemo(() => {
    let result = students;
    if (debouncedSearch) {
      const query = debouncedSearch.toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(query) ||
          String(s.roll).includes(query)
      );
    }
    // Apply sort based on user preference
    switch (studentSortOption) {
      case "ascending":
        return [...result].sort((a, b) => a.roll - b.roll);
      case "descending":
        return [...result].sort((a, b) => b.roll - a.roll);
      case "original":
        return [...result].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
      default:
        return result;
    }
  }, [students, debouncedSearch, studentSortOption]);

  async function handleAddStudent() {
    if (!formData.name.trim() || !formData.roll.trim()) {
      toast({
        title: "Validation Error",
        description: "Name and roll number are required",
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in",
        variant: "destructive",
      });
      return;
    }

    setFormLoading(true);
    try {
      await createStudent(user.id, {
        name: formData.name.trim(),
        roll: Number(formData.roll),
      });
      toast({ title: "Success", description: "Student added successfully" });
      setAddDialogOpen(false);
      setFormData({ name: "", roll: "" });
      loadStudents();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add student",
        variant: "destructive",
      });
    } finally {
      setFormLoading(false);
    }
  }

  function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    processFile(file);
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  const processFile = useCallback(function processFile(file: File) {
    const fileExtension = file.name.split(".").pop()?.toLowerCase();
    
    if (fileExtension === "csv") {
      Papa.parse(file, {
        header: false,
        skipEmptyLines: true,
        complete: (results) => {
          const data = results.data as string[][];
          if (data.length < 2) {
            toast({ title: "Error", description: "File appears to be empty", variant: "destructive" });
            return;
          }
          
          // Smart header detection - find the row with header-like values
          let headerIndex = 0;
          let headers: string[] = [];
          
          for (let i = 0; i < Math.min(5, data.length); i++) {
            const row = data[i].map(cell => String(cell || '').toLowerCase());
            const hasRoll = ROLL_PATTERNS.some(p => row.some(cell => cell.includes(p)));
            const hasName = NAME_PATTERNS.some(p => row.some(cell => cell.includes(p)));
            
            if (hasRoll || hasName) {
              headerIndex = i;
              headers = data[i].map(cell => String(cell || '').trim());
              break;
            }
          }
          
          if (headers.length === 0) {
            headers = data[0].map(cell => String(cell || '').trim());
          }
          
          // Find column indices
          const rollIdx = findColumn(headers, ROLL_PATTERNS);
          const nameIdx = findColumn(headers, NAME_PATTERNS);
          const sectionIdx = findColumn(headers, SECTION_PATTERNS);
          const deptIdx = findColumn(headers, DEPT_PATTERNS);
          
          if (rollIdx === -1 || nameIdx === -1) {
            toast({ 
              title: "Column Detection Failed", 
              description: "Could not find Roll Number and Name columns. Please ensure your file has headers like 'Roll', 'Name'", 
              variant: "destructive" 
            });
            return;
          }
          
          // Parse student data
          const students: CreateStudentInput[] = [];
          for (let i = headerIndex + 1; i < data.length; i++) {
            const row = data[i];
            const rollValue = row[rollIdx];
            const nameValue = row[nameIdx];
            
            if (!rollValue || !nameValue) continue;
            
            const roll = parseInt(String(rollValue).replace(/[^\d]/g, ''), 10);
            if (isNaN(roll) || roll <= 0) continue;
            
            const student: CreateStudentInput = {
              roll,
              name: String(nameValue).trim(),
            };
            
            if (sectionIdx !== -1 && row[sectionIdx]) {
              student.section = String(row[sectionIdx]).trim();
            }
            if (deptIdx !== -1 && row[deptIdx]) {
              student.department = String(row[deptIdx]).trim();
            }
            
            students.push(student);
          }
          
          if (students.length === 0) {
            toast({ title: "No valid data", description: "No valid student data found in the file", variant: "destructive" });
            return;
          }
          
          setParsedStudents(students);
          setImportStep("preview");
        },
        error: (error) => {
          toast({ title: "Parse Error", description: error.message, variant: "destructive" });
        },
      });
    } else if (fileExtension === "xlsx" || fileExtension === "xls") {
      // Excel file parsing
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const XLSX = await import("xlsx");
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          
          const firstSheetName = workbook.SheetNames[0];
          if (!firstSheetName) {
            toast({ title: "Error", description: "No worksheets found in file", variant: "destructive" });
            return;
          }
          
          const worksheet = workbook.Sheets[firstSheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as string[][];
          
          if (jsonData.length < 2) {
            toast({ title: "Error", description: "File appears to be empty", variant: "destructive" });
            return;
          }
          
          // Smart header detection
          let headerIndex = 0;
          let headers: string[] = [];
          
          for (let i = 0; i < Math.min(5, jsonData.length); i++) {
            const row = (jsonData[i] || []).map(cell => String(cell || '').toLowerCase());
            const hasRoll = ROLL_PATTERNS.some(p => row.some(cell => cell.includes(p)));
            const hasName = NAME_PATTERNS.some(p => row.some(cell => cell.includes(p)));
            
            if (hasRoll || hasName) {
              headerIndex = i;
              headers = (jsonData[i] || []).map(cell => String(cell || '').trim());
              break;
            }
          }
          
          if (headers.length === 0) {
            headers = (jsonData[0] || []).map(cell => String(cell || '').trim());
          }
          
          // Find column indices
          const rollIdx = findColumn(headers, ROLL_PATTERNS);
          const nameIdx = findColumn(headers, NAME_PATTERNS);
          const sectionIdx = findColumn(headers, SECTION_PATTERNS);
          const deptIdx = findColumn(headers, DEPT_PATTERNS);
          
          if (rollIdx === -1 || nameIdx === -1) {
            toast({ 
              title: "Column Detection Failed", 
              description: "Could not find Roll Number and Name columns. Please ensure your file has headers like 'Roll', 'Name'", 
              variant: "destructive" 
            });
            return;
          }
          
          // Parse student data
          const students: CreateStudentInput[] = [];
          for (let i = headerIndex + 1; i < jsonData.length; i++) {
            const row = jsonData[i] || [];
            const rollValue = row[rollIdx];
            const nameValue = row[nameIdx];
            
            if (!rollValue || !nameValue) continue;
            
            const roll = typeof rollValue === 'number' ? rollValue : parseInt(String(rollValue).replace(/[^\d]/g, ''), 10);
            if (isNaN(roll) || roll <= 0) continue;
            
            const student: CreateStudentInput = {
              roll,
              name: String(nameValue).trim(),
            };
            
            if (sectionIdx !== -1 && row[sectionIdx]) {
              student.section = String(row[sectionIdx]).trim();
            }
            if (deptIdx !== -1 && row[deptIdx]) {
              student.department = String(row[deptIdx]).trim();
            }
            
            students.push(student);
          }
          
          if (students.length === 0) {
            toast({ title: "No valid data", description: "No valid student data found in the file", variant: "destructive" });
            return;
          }
          
          setParsedStudents(students);
          setImportStep("preview");
        } catch {
          toast({ title: "Parse Error", description: "Failed to parse Excel file. Please ensure the file is not corrupted.", variant: "destructive" });
        }
      };
      reader.onerror = () => {
        toast({ title: "Read Error", description: "Failed to read file", variant: "destructive" });
      };
      reader.readAsArrayBuffer(file);
    } else {
      toast({
        title: "Unsupported file",
        description: "Please upload a CSV or Excel (.xlsx, .xls) file",
        variant: "destructive",
      });
    }
  }, [toast]);

  // Drag and drop handler
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      processFile(acceptedFiles[0]);
    }
  }, [processFile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    maxFiles: 1,
    noClick: true,
  });

  async function handleImportStudents() {
    if (!user || parsedStudents.length === 0) return;
    
    setImportStep("importing");
    try {
      const result = await importStudents(user.id, parsedStudents, "skip");
      setImportResult(result);
      setImportDialogOpen(false);
      setImportResultDialogOpen(true);
      setImportStep("upload");
      setParsedStudents([]);
      loadStudents();
    } catch (error) {
      toast({
        title: "Import Error",
        description: error instanceof Error ? error.message : "Failed to import students",
        variant: "destructive",
      });
      setImportStep("preview");
    }
  }

  async function handleDataCreatorImport(students: CreateStudentInput[]) {
    if (!user || students.length === 0) return;

    try {
      const result = await importStudents(user.id, students, "skip");
      setImportResult(result);
      setDataCreatorOpen(false);
      setImportDialogOpen(false);
      setImportResultDialogOpen(true);
      loadStudents();
    } catch (error) {
      toast({
        title: "Import Error",
        description: error instanceof Error ? error.message : "Failed to import students",
        variant: "destructive",
      });
    }
  }

  async function handleUpdateStudent() {
    if (!editingStudent || !formData.name.trim() || !formData.roll.trim()) {
      return;
    }

    setFormLoading(true);
    try {
      await updateStudent(editingStudent.id, {
        name: formData.name.trim(),
        roll: Number(formData.roll),
      });
      toast({ title: "Success", description: "Student updated successfully" });
      setEditingStudent(null);
      setFormData({ name: "", roll: "" });
      loadStudents();
    } catch {
      toast({
        title: "Error",
        description: "Failed to update student",
        variant: "destructive",
      });
    } finally {
      setFormLoading(false);
    }
  }

  async function handleDeleteStudent() {
    if (!deletingStudent) return;

    const studentToDelete = deletingStudent;
    
    try {
      await deleteStudent(studentToDelete.id);
      setDeletingStudent(null);
      loadStudents();
      
      // Show undo toast
      toast({
        title: "Student Deleted",
        description: (
          <div className="flex items-center justify-between gap-4">
            <span>{studentToDelete.name} has been deleted</span>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                try {
                  await restoreStudent(studentToDelete.id);
                  loadStudents();
                  toast({ title: "Restored", description: `${studentToDelete.name} has been restored` });
                } catch {
                  toast({ title: "Error", description: "Failed to restore student", variant: "destructive" });
                }
              }}
            >
              Undo
            </Button>
          </div>
        ) as unknown as string,
        duration: 8000,
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to delete student",
        variant: "destructive",
      });
    }
  }

  async function handleDeleteSelected() {
    if (selectedStudents.length === 0) return;

    const deletedIds = [...selectedStudents];
    const count = deletedIds.length;

    try {
      await Promise.all(deletedIds.map((id: string) => deleteStudent(id)));
      clearSelection();
      loadStudents();
      
      // Show undo toast
      toast({
        title: "Students Deleted",
        description: (
          <div className="flex items-center justify-between gap-4">
            <span>{count} students deleted</span>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                try {
                  await Promise.all(deletedIds.map((id: string) => restoreStudent(id)));
                  loadStudents();
                  toast({ title: "Restored", description: `${count} students restored` });
                } catch {
                  toast({ title: "Error", description: "Failed to restore students", variant: "destructive" });
                }
              }}
            >
              Undo
            </Button>
          </div>
        ) as unknown as string,
        duration: 8000,
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to delete some students",
        variant: "destructive",
      });
    }
  }

  const allSelected =
    filteredStudents.length > 0 &&
    filteredStudents.every((s) => selectedStudents.includes(s.id));

  if (loading) {
    return <LoadingScreen message="Loading students..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Students</h1>
          <p className="text-muted-foreground">
            Manage your student roster ({students.length} total)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Import
          </Button>
          <Button onClick={() => setAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Student
          </Button>
        </div>
      </div>

      {/* Search and Bulk Actions */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or roll number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        {/* Sort Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="default" className="gap-2 shrink-0">
              <ArrowUpDown className="h-4 w-4" />
              <span className="hidden sm:inline">
                {studentSortOption === "ascending" ? "Ascending" : studentSortOption === "descending" ? "Descending" : "Original Order"}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setStudentSortOption("ascending")}>
              <ArrowUpAZ className="mr-2 h-4 w-4" />
              Ascending (Roll)
              {studentSortOption === "ascending" && <Check className="ml-auto h-4 w-4" />}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStudentSortOption("descending")}>
              <ArrowDownAZ className="mr-2 h-4 w-4" />
              Descending (Roll)
              {studentSortOption === "descending" && <Check className="ml-auto h-4 w-4" />}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setStudentSortOption("original")}>
              <ListOrdered className="mr-2 h-4 w-4" />
              Original File Order
              {studentSortOption === "original" && <Check className="ml-auto h-4 w-4" />}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        {selectedStudents.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {selectedStudents.length} selected
            </span>
            <Button variant="outline" size="sm" onClick={clearSelection}>
              Clear
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteSelected}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </div>
        )}
      </div>

      {/* Students List */}
      {filteredStudents.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <EmptyState
              icon={Users}
              title={searchQuery ? "No students found" : "No students yet"}
              description={
                searchQuery
                  ? "Try adjusting your search query"
                  : "Add your first student to get started"
              }
              action={
                !searchQuery
                  ? { label: "Add Student", onClick: () => setAddDialogOpen(true) }
                  : undefined
              }
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <Checkbox
                checked={allSelected}
                onCheckedChange={(checked) => {
                  if (checked) {
                    filteredStudents.forEach((s) => {
                      if (!selectedIds.has(s.id)) toggleSelection(s.id);
                    });
                  } else {
                    clearSelection();
                  }
                }}
              />
              <div className="flex items-center gap-3 flex-1 text-sm font-medium text-muted-foreground">
                <span className="min-w-[5rem] max-w-[8rem] shrink-0">Roll</span>
                <span className="flex-1">Name</span>
                <span className="shrink-0 text-right">Actions</span>
              </div>
            </div>
          </CardHeader>
          <div className="max-h-[65vh] min-h-[300px] overflow-auto">
            <CardContent className="space-y-2 pt-0">
              {filteredStudents.map((student) => (
                <div
                  key={student.id}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg transition-colors",
                    "hover:bg-muted/50",
                    selectedStudents.includes(student.id) && "bg-muted"
                  )}
                >
                  <Checkbox
                    checked={selectedStudents.includes(student.id)}
                    onCheckedChange={() => toggleSelection(student.id)}
                  />
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="font-mono text-xs shrink-0 min-w-[5rem] max-w-[8rem]">
                      {student.roll}
                    </span>
                    <span className="flex-1 truncate">{student.name}</span>
                    <div className="shrink-0">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="z-[60]">
                          <DropdownMenuItem
                            onClick={() => {
                              setFormData({ name: student.name, roll: String(student.roll) });
                              setEditingStudent(student);
                            }}
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setDeletingStudent(student)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </div>
        </Card>
      )}

      {/* Add Student Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Student</DialogTitle>
            <DialogDescription>
              Add a new student to your roster
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="roll">Roll Number</Label>
              <Input
                id="roll"
                placeholder="e.g., 001"
                value={formData.roll}
                onChange={(e) => setFormData({ ...formData, roll: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                placeholder="e.g., John Doe"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddStudent} disabled={formLoading}>
              {formLoading && <LoadingSpinner size="sm" className="mr-2" />}
              Add Student
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Student Dialog */}
      <Dialog
        open={!!editingStudent}
        onOpenChange={(open) => !open && setEditingStudent(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Student</DialogTitle>
            <DialogDescription>
              Update student information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-roll">Roll Number</Label>
              <Input
                id="edit-roll"
                value={formData.roll}
                onChange={(e) => setFormData({ ...formData, roll: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-name">Full Name</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingStudent(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateStudent} disabled={formLoading}>
              {formLoading && <LoadingSpinner size="sm" className="mr-2" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deletingStudent}
        onOpenChange={(open) => !open && setDeletingStudent(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Student</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {deletingStudent?.name}? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteStudent}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Import Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={(open) => {
        setImportDialogOpen(open);
        if (!open) {
          setImportStep("upload");
          setParsedStudents([]);
        }
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {isOnboarding ? "Welcome! Import Your Students" : "Import Students"}
            </DialogTitle>
            <DialogDescription>
              {isOnboarding 
                ? "Get started by importing your student list from a CSV or Excel file"
                : "Upload a CSV or Excel file with student data"
              }
            </DialogDescription>
          </DialogHeader>
          
          {importStep === "upload" && (
            <>
              <div 
                {...getRootProps()}
                className={cn(
                  "py-8 border-2 border-dashed rounded-lg flex flex-col items-center gap-4 cursor-pointer transition-colors",
                  isDragActive 
                    ? "border-primary bg-primary/5" 
                    : "border-muted hover:border-primary/50"
                )}
                onClick={() => fileInputRef.current?.click()}
              >
                <input {...getInputProps()} />
                <FileSpreadsheet className={cn(
                  "h-10 w-10 transition-colors",
                  isDragActive ? "text-primary" : "text-muted-foreground"
                )} />
                <div className="text-center">
                  {isDragActive ? (
                    <p className="text-sm font-medium text-primary">Drop your file here!</p>
                  ) : (
                    <>
                      <p className="text-sm font-medium">Drop your file here or click to browse</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        CSV and Excel files (.xlsx, .xls) supported
                      </p>
                    </>
                  )}
                </div>
                <Button variant="outline" size="sm" type="button">
                  Browse Files
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </div>
              <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg space-y-2">
                <p className="font-medium">Smart Column Detection:</p>
                <ul className="list-disc pl-4 space-y-1">
                  <li><strong>Roll Number:</strong> roll, roll no, id, registration, serial, s.no</li>
                  <li><strong>Name:</strong> name, student name, full name</li>
                  <li><strong>Section (optional):</strong> section, class, division</li>
                  <li><strong>Department (optional):</strong> department, dept, branch</li>
                </ul>
              </div>
              <div className="flex items-center justify-center">
                <Button 
                  variant="link" 
                  size="sm" 
                  onClick={() => setAiDialogOpen(true)}
                  className="text-xs"
                >
                  Having trouble with file format? Use AI to help convert
                </Button>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">or</span>
                </div>
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setImportDialogOpen(false);
                  setDataCreatorOpen(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Create / Paste Student Data
              </Button>
            </>
          )}
          
          {importStep === "preview" && (
            <>
              <div className="border rounded-lg">
                <div className="bg-muted/50 px-4 py-2 border-b flex justify-between items-center">
                  <p className="text-sm font-medium">{parsedStudents.length} students found</p>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                </div>
                <ScrollArea className="h-[200px]">
                  <div className="p-2 space-y-1">
                    {parsedStudents.slice(0, 50).map((s, i) => (
                      <div key={i} className="flex gap-4 px-2 py-1 text-sm">
                        <span className="font-mono text-muted-foreground shrink-0 min-w-[80px] text-xs">{s.roll}</span>
                        <span className="flex-1 truncate">{s.name}</span>
                        {s.section && <span className="text-muted-foreground text-xs">{s.section}</span>}
                      </div>
                    ))}
                    {parsedStudents.length > 50 && (
                      <p className="text-xs text-muted-foreground text-center py-2">
                        ...and {parsedStudents.length - 50} more
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => {
                  setImportStep("upload");
                  setParsedStudents([]);
                }}>
                  Back
                </Button>
                <Button onClick={handleImportStudents}>
                  Import {parsedStudents.length} Students
                </Button>
              </DialogFooter>
            </>
          )}
          
          {importStep === "importing" && (
            <div className="py-8 flex flex-col items-center gap-4">
              <LoadingSpinner size="lg" />
              <p className="text-sm text-muted-foreground">Importing students...</p>
            </div>
          )}
          
          {importStep === "upload" && (
            <DialogFooter>
              <Button variant="outline" onClick={() => setImportDialogOpen(false)}>
                {isOnboarding ? "Skip for now" : "Cancel"}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Import Result Dialog */}
      <Dialog open={importResultDialogOpen} onOpenChange={setImportResultDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Import Complete
            </DialogTitle>
          </DialogHeader>
          {importResult && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-green-500/10 rounded-lg p-3">
                  <p className="text-2xl font-bold text-green-600">{importResult.added}</p>
                  <p className="text-xs text-muted-foreground">Added</p>
                </div>
                <div className="bg-blue-500/10 rounded-lg p-3">
                  <p className="text-2xl font-bold text-blue-600">{importResult.updated}</p>
                  <p className="text-xs text-muted-foreground">Updated</p>
                </div>
                <div className="bg-yellow-500/10 rounded-lg p-3">
                  <p className="text-2xl font-bold text-yellow-600">{importResult.skipped}</p>
                  <p className="text-xs text-muted-foreground">Skipped</p>
                </div>
              </div>
              {importResult.errors.length > 0 && (
                <div className="bg-red-500/10 rounded-lg p-3">
                  <p className="text-sm font-medium text-red-600 mb-2">
                    {importResult.errors.length} errors occurred
                  </p>
                  <ScrollArea className="h-[100px]">
                    {importResult.errors.map((e, i) => (
                      <p key={i} className="text-xs text-red-600">
                        Roll {e.roll}: {e.error}
                      </p>
                    ))}
                  </ScrollArea>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setImportResultDialogOpen(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI Format Dialog */}
      <AIFormatDialog open={aiDialogOpen} onOpenChange={setAiDialogOpen} />

      {/* Student Data Creator Dialog */}
      <Dialog open={dataCreatorOpen} onOpenChange={setDataCreatorOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <StudentDataCreator
            onImport={handleDataCreatorImport}
            onOpenAI={() => {
              setAiDialogOpen(true);
            }}
            onClose={() => setDataCreatorOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
