export interface Subject {
  id: string;
  ownerId: string;
  name: string;
  code?: string;
  teacherName?: string;
  createdAt: string;
  updatedAt: string;
  isArchived: boolean;
}

export interface CreateSubjectInput {
  name: string;
  code?: string;
  teacherName?: string;
}

export interface SubjectWithStats extends Subject {
  totalSessions: number;
  lastSessionDate?: string;
  averageAttendance: number;
}
