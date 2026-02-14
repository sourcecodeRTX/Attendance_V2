"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { db } from "@/lib/db";
import { createSubject, updateSubject, deleteSubject, restoreSubject } from "@/lib/db/subjects";
import type { Subject } from "@/lib/types/subject";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useToast } from "@/hooks/use-toast";
import { useDebounce } from "@/hooks/use-debounce";
import { LoadingSpinner, LoadingScreen } from "@/components/shared/loading-spinner";
import { EmptyState } from "@/components/shared/empty-state";

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Dialog states
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [deletingSubject, setDeletingSubject] = useState<Subject | null>(null);

  // Form state
  const [formData, setFormData] = useState({ name: "", code: "" });
  const [formLoading, setFormLoading] = useState(false);

  const { toast } = useToast();
  const { user } = useAuthStore();

  useEffect(() => {
    if (user?.id) loadSubjects();
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadSubjects() {
    if (!user?.id) return;
    try {
      const data = await db.subjects
        .where("ownerId")
        .equals(user.id)
        .filter((s) => !s.isArchived)
        .toArray();
      // Sort by name in memory to avoid index issues
      data.sort((a, b) => a.name.localeCompare(b.name));
      setSubjects(data);
    } catch (error) {
      console.error("Failed to load subjects:", error);
      toast({
        title: "Error",
        description: "Failed to load subjects",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  const filteredSubjects = useMemo(() => {
    if (!debouncedSearch) return subjects;
    const query = debouncedSearch.toLowerCase();
    return subjects.filter(
      (s) =>
        s.name.toLowerCase().includes(query) ||
        (s.code && s.code.toLowerCase().includes(query))
    );
  }, [subjects, debouncedSearch]);

  async function handleAddSubject() {
    if (!formData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Subject name is required",
        variant: "destructive",
      });
      return;
    }

    setFormLoading(true);
    try {
      await createSubject(user?.id ?? "local", {
        name: formData.name.trim(),
        code: formData.code.trim() || undefined,
      });
      toast({ title: "Success", description: "Subject added successfully" });
      setAddDialogOpen(false);
      setFormData({ name: "", code: "" });
      loadSubjects();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add subject",
        variant: "destructive",
      });
    } finally {
      setFormLoading(false);
    }
  }

  async function handleUpdateSubject() {
    if (!editingSubject || !formData.name.trim()) {
      return;
    }

    setFormLoading(true);
    try {
      await updateSubject(editingSubject.id, {
        name: formData.name.trim(),
        code: formData.code.trim() || undefined,
      });
      toast({ title: "Success", description: "Subject updated successfully" });
      setEditingSubject(null);
      setFormData({ name: "", code: "" });
      loadSubjects();
    } catch {
      toast({
        title: "Error",
        description: "Failed to update subject",
        variant: "destructive",
      });
    } finally {
      setFormLoading(false);
    }
  }

  async function handleDeleteSubject() {
    if (!deletingSubject) return;

    const subjectToDelete = deletingSubject;

    try {
      await deleteSubject(subjectToDelete.id);
      setDeletingSubject(null);
      loadSubjects();
      
      // Show undo toast
      toast({
        title: "Subject Deleted",
        description: (
          <div className="flex items-center justify-between gap-4">
            <span>{subjectToDelete.name} has been deleted</span>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                try {
                  await restoreSubject(subjectToDelete.id);
                  loadSubjects();
                  toast({ title: "Restored", description: `${subjectToDelete.name} has been restored` });
                } catch {
                  toast({ title: "Error", description: "Failed to restore subject", variant: "destructive" });
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
        description: "Failed to delete subject",
        variant: "destructive",
      });
    }
  }

  if (loading) {
    return <LoadingScreen message="Loading subjects..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Subjects</h1>
          <p className="text-muted-foreground">
            Manage your subjects ({subjects.length} total)
          </p>
        </div>
        <Button onClick={() => setAddDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Subject
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or code..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Subjects Grid */}
      {filteredSubjects.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <EmptyState
              icon={BookOpen}
              title={searchQuery ? "No subjects found" : "No subjects yet"}
              description={
                searchQuery
                  ? "Try adjusting your search query"
                  : "Add your first subject to get started"
              }
              action={
                !searchQuery
                  ? { label: "Add Subject", onClick: () => setAddDialogOpen(true) }
                  : undefined
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredSubjects.map((subject) => (
            <Card key={subject.id} className="relative group">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{subject.name}</CardTitle>
                    {subject.code && (
                      <p className="text-sm text-muted-foreground font-mono">
                        {subject.code}
                      </p>
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => {
                          setFormData({
                            name: subject.name,
                            code: subject.code || "",
                          });
                          setEditingSubject(subject);
                        }}
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => setDeletingSubject(subject)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <BookOpen className="h-4 w-4" />
                    <span>Active</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Subject Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Subject</DialogTitle>
            <DialogDescription>
              Create a new subject for attendance tracking
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Subject Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Mathematics"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="code">Subject Code (optional)</Label>
              <Input
                id="code"
                placeholder="e.g., MATH101"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddSubject} disabled={formLoading}>
              {formLoading && <LoadingSpinner size="sm" className="mr-2" />}
              Add Subject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Subject Dialog */}
      <Dialog
        open={!!editingSubject}
        onOpenChange={(open) => !open && setEditingSubject(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Subject</DialogTitle>
            <DialogDescription>
              Update subject information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Subject Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-code">Subject Code (optional)</Label>
              <Input
                id="edit-code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingSubject(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateSubject} disabled={formLoading}>
              {formLoading && <LoadingSpinner size="sm" className="mr-2" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deletingSubject}
        onOpenChange={(open) => !open && setDeletingSubject(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Subject</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {deletingSubject?.name}? This will
              also delete all associated attendance records. This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSubject}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
