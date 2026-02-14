export interface Student {
  id: string;
  ownerId: string;
  roll: number;
  name: string;
  section?: string;
  department?: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
}

export type StudentSortOption = "ascending" | "descending" | "original";

export interface CreateStudentInput {
  roll: number;
  name: string;
  section?: string;
  department?: string;
}

export interface ImportResult {
  added: number;
  updated: number;
  skipped: number;
  errors: Array<{
    roll: number;
    name: string;
    error: string;
  }>;
  skippedItems: Array<{
    roll: number;
    name: string;
    reason: string;
  }>;
}

export type ImportMode = "skip" | "replace" | "merge";
