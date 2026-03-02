// Types matching your current data structure

export interface Student {
  id: string;
  studentId: string;
  name: string;
  pin?: string;
  pinSetAt?: string;
  pinSetBy?: string;
  dateOfBirth?: string;
  grade?: string;
  section?: string;
  phone?: string;
  email?: string;
  parentName?: string;
  parentPhone?: string;
  parentEmail?: string;
  fatherWork?: string;
  district?: string;
  upazila?: string;
  address?: string;
  enrollmentDate?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  type: 'daily' | 'onetime';
  deadline?: string;
  assignedTo: string[]; // Array of student IDs
  completedBy?: Record<string, TaskCompletion>;
  createdAt?: string;
  updatedAt?: string;
}

export interface TaskCompletion {
  date: string;
  completedAt: string;
}

export interface Message {
  id: string;
  studentId: string;
  sender: 'teacher' | 'student';
  text: string;
  timestamp: string;
  read?: boolean;
}

export interface Quiz {
  id: string;
  title: string;
  subject?: string;
  description?: string;
  timeLimit?: number; // in minutes
  passPercentage?: number;
  questions: Question[];
  assignedTo: string[]; // Array of student IDs
  createdAt?: string;
}

export interface Question {
  id: string;
  type: 'multiple_choice' | 'true_false' | 'fill_blank' | 'short_answer' | 'essay' | 'file_upload';
  text: string;
  options?: string[];
  correctAnswer?: string | string[];
  marks: number;
}

export interface QuizResult {
  id: string;
  quizId: string;
  studentId: string;
  answers: Record<string, any>;
  score?: number;
  totalMarks?: number;
  percentage?: number;
  passed?: boolean;
  submittedAt: string;
  timeTaken?: number; // in seconds
  gradedAnswers?: Record<string, { score: number; feedback?: string }>;
}

export interface SubmittedDocument {
  id: string;
  studentId: string;
  fileName: string;
  fileUrl: string;
  fileSize?: number;
  mimeType?: string;
  forReview: boolean;
  uploadedAt: string;
}

export interface TeacherNote {
  id: string;
  studentId: string;
  category?: string;
  text: string;
  createdAt: string;
  updatedAt?: string;
}

// Auth types
export interface AuthState {
  role: 'teacher' | 'student' | null;
  studentId?: string;
  isLoggedIn: boolean;
}

// Teacher credentials (stored locally, not in Firebase)
export const TEACHER_CREDENTIALS = {
  id: 'teacher',
  pin: '5678'
};
