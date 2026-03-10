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
  /**
   * Optional fields for future structured messaging.
   * Must remain optional to keep backward compatibility with existing documents.
   */
  category?: MessageCategory;
  messageType?: MessageType;
  linkedTaskId?: string;
  linkedReportId?: string;
  linkedSubmissionId?: string;
  audioUrl?: string;
  audioDurationSec?: number;
  status?: 'active' | 'archived';
  teacherTags?: string[];
}

export type MessageCategory =
  | 'general'
  | 'question'
  | 'weekly_report'
  | 'fortnight_report'
  | 'help_request'
  | 'reflection'
  | 'task_update'
  | 'behavior_note';

export type MessageType = 'text' | 'audio' | 'report_link' | 'template_feedback';

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
  /** Category for filtering/display (same as message categories). Optional for backward compatibility. */
  category?: MessageCategory;
  /**
   * Optional fields for future expanded submissions.
   * Keep optional to avoid breaking existing documents/logic.
   */
  submissionType?: SubmissionType;
  title?: string;
  textAnswer?: string;
  reviewStatus?: ReviewStatus;
  teacherFeedback?: string;
  score?: number;
  reviewedAt?: string;
  linkedTaskId?: string;
}

export type SubmissionType =
  | 'document'
  | 'written'
  | 'weekly_report'
  | 'fortnight_report'
  | 'reflection'
  | 'photo'
  | 'audio'
  | 'checklist';

export type ReviewStatus = 'pending' | 'reviewed' | 'needs_resubmission';

export interface StudentReport {
  id: string;
  studentId: string;
  reportType: 'weekly' | 'fortnight';
  periodStart?: string; // ISO
  periodEnd?: string; // ISO
  completedActivities?: string;
  learnedTopics?: string;
  difficulties?: string;
  repeatedMistakes?: string;
  helpNeeded?: string;
  nextGoals?: string;
  submittedAt: string; // ISO
  reviewStatus?: ReviewStatus;
  teacherResponse?: string;
  teacherReviewedAt?: string; // ISO
}

export interface FeedbackTemplate {
  id: string;
  title: string;
  category?: string;
  text: string;
  createdAt: string; // ISO
  updatedAt?: string; // ISO
  createdBy?: string;
  isSystemTemplate?: boolean;
}

export interface StudentFeedbackItem {
  id: string;
  studentId: string;
  type: 'praise' | 'correction' | 'advice' | 'achievement';
  title?: string;
  text: string;
  linkedTaskId?: string;
  linkedReportId?: string;
  linkedSubmissionId?: string;
  createdAt: string; // ISO
  createdByTeacher?: string;
  pinned?: boolean;
}

export interface StudentGroup {
  id: string;
  name: string;
  description?: string;
  category?: string;
  studentIds: string[];
  createdAt: string; // ISO
  updatedAt?: string; // ISO
}

export interface CommonMistake {
  id: string;
  title: string;
  category?: string;
  description?: string;
  correctForm?: string;
  example?: string;
  severity?: 'low' | 'medium' | 'high';
  linkedTaskId?: string;
  linkedQuizId?: string;
  active: boolean;
  createdAt: string; // ISO
  updatedAt?: string; // ISO
}

export interface StudentSubmission {
  id: string;
  studentId: string;
  submissionType: SubmissionType;
  title?: string;
  textAnswer?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  audioDurationSec?: number;
  linkedTaskId?: string;
  requestedByTeacher?: boolean;
  reviewStatus?: ReviewStatus;
  teacherFeedback?: string;
  score?: number;
  submittedAt: string; // ISO
  reviewedAt?: string; // ISO
}

export interface StudentScore {
  id: string;
  studentId: string;
  behaviorScore?: number;
  learningScore?: number;
  activityScore?: number;
  consistencyScore?: number;
  improvementScore?: number;
  totalScore?: number;
  rank?: number;
  periodLabel?: string; // e.g. "2026-W10"
  updatedAt: string; // ISO
}

export interface StudentScoreHistory {
  id: string;
  studentId: string;
  behaviorScore?: number;
  learningScore?: number;
  activityScore?: number;
  consistencyScore?: number;
  improvementScore?: number;
  totalScore?: number;
  rank?: number;
  periodLabel?: string;
  createdAt: string; // ISO snapshot time
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
