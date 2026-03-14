'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  useStudents,
  useTasks,
  useMessages,
  useSubmittedDocuments
} from '@/hooks/useFirestore';
import { useTranslation } from '@/hooks/useTranslation';
import TeacherSidebar from '@/components/teacher/TeacherSidebar';
import TeacherTopBar from '@/components/teacher/TeacherTopBar';
import { Student, Task, type MessageCategory } from '@/lib/types';
import { getTeacherCredentialConfig, updateTeacherCredentials } from '@/lib/teacher-credentials';
import '@/styles/teacher.css';
import '@/styles/daily-overview.css';
type DashboardView = 'daily' | 'onetime' | 'spreadsheet';
type TaskFilter = 'all' | 'daily' | 'onetime';
type DocumentsView = 'grouped' | 'table';

type SubmittedDocumentLike = {
  id: string;
  studentId: string;
  studentName?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  uploadedAt?: string;
  fileUrl?: string;
  downloadURL?: string;
  forReview?: boolean;
  markedForReview?: boolean;
  category?: MessageCategory;
};

type StudentFormState = {
  name: string;
  studentId: string;
  pin: string;
  dateOfBirth: string;
  phone: string;
  email: string;
  parentName: string;
  parentPhone: string;
  parentEmail: string;
  enrollmentDate: string;
};

const DEFAULT_STUDENT_FORM: StudentFormState = {
  name: '',
  studentId: '',
  pin: '1234',
  dateOfBirth: '',
  phone: '',
  email: '',
  parentName: '',
  parentPhone: '',
  parentEmail: '',
  enrollmentDate: ''
};

function normalizeTaskType(type: string): 'daily' | 'onetime' {
  return type === 'one-time' ? 'onetime' : (type as 'daily' | 'onetime');
}

function formatFileSize(bytes?: number) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatShortDate(iso?: string) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

function nextStudentId(students: Student[]) {
  const maxNumber = students.reduce((max, student) => {
    const match = (student.studentId || '').match(/(\d+)$/);
    const value = match ? parseInt(match[1], 10) : 0;
    return Math.max(max, value);
  }, 0);

  return `waqf-${String(maxNumber + 1).padStart(3, '0')}`;
}

function groupByStudent(docs: SubmittedDocumentLike[]) {
  return docs.reduce<Record<string, SubmittedDocumentLike[]>>((acc, doc) => {
    const key = String(doc.studentId || 'unknown');
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(doc);
    return acc;
  }, {});
}

/** Study year (1, 2, 3...) from enrollment date. Matches old app data-manager.getStudentYear. */
function getStudentYear(enrollmentDate?: string): number {
  if (!enrollmentDate) return 1;
  const adm = new Date(enrollmentDate);
  const now = new Date();
  const yearIndex = now.getFullYear() - adm.getFullYear() + 1;
  return Math.max(1, yearIndex);
}

/** Translated year label for display (e.g. "First Year"). Matches old app getStudentYearLabel. */
function getStudentYearLabel(student: Student, t: (key: string) => string): string {
  if (!student) return 'N/A';
  const n = getStudentYear(student.enrollmentDate);
  const keys: Record<number, string> = {
    1: 'first_year',
    2: 'second_year',
    3: 'third_year',
    4: 'fourth_year',
    5: 'fifth_year',
    6: 'sixth_year',
    7: 'seventh_year',
    8: 'eighth_year',
    9: 'ninth_year',
    10: 'tenth_year'
  };
  const key = keys[n];
  return key ? t(key) : `Year ${n}`;
}

function TeacherDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isLoggedIn, role, isLoading: authLoading } = useAuth();
  const { t, lang, changeLang } = useTranslation();

  const {
    data: studentsData,
    loading: studentsLoading,
    addItem: addStudent,
    deleteItem: deleteStudent
  } = useStudents();

  const {
    data: tasksData,
    loading: tasksLoading,
    addItem: addTask,
    updateItem: updateTask,
    deleteItem: deleteTask
  } = useTasks();

  const { data: messagesData, loading: messagesLoading } = useMessages();

  const {
    data: submittedDocumentsData,
    loading: documentsLoading,
    updateItem: updateSubmittedDocument
  } = useSubmittedDocuments();

  const students = (studentsData as Student[]) || [];
  const tasks = ((tasksData as Task[]) || []).map((task) => ({
    ...task,
    type: normalizeTaskType(task.type as string)
  }));
  const messages = messagesData || [];
  const submittedDocuments = (submittedDocumentsData as SubmittedDocumentLike[]) || [];

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('dashboard');
  const [dashboardView, setDashboardView] = useState<DashboardView>('daily');

  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskType, setTaskType] = useState<'daily' | 'onetime'>('daily');
  const [taskDeadline, setTaskDeadline] = useState('');
  const [taskAssignedTo, setTaskAssignedTo] = useState<string[]>([]);
  const [taskFilter, setTaskFilter] = useState<TaskFilter>('all');
  const [manageTasksTab, setManageTasksTab] = useState<'create' | 'view'>('create');

  const [showStudentForm, setShowStudentForm] = useState(false);
  const [studentForm, setStudentForm] = useState<StudentFormState>(DEFAULT_STUDENT_FORM);

  const [documentsView, setDocumentsView] = useState<DocumentsView>('grouped');
  const [documentCategoryFilter, setDocumentCategoryFilter] = useState<MessageCategory | 'all'>('all');
  const [expandedDocGroups, setExpandedDocGroups] = useState<Record<string, boolean>>({});
  const [overviewDate, setOverviewDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [teacherLoginId, setTeacherLoginId] = useState('teacher');
  const [teacherCurrentPin, setTeacherCurrentPin] = useState('');
  const [teacherNewPin, setTeacherNewPin] = useState('');
  const [teacherConfirmPin, setTeacherConfirmPin] = useState('');
  const [teacherPinSubmitting, setTeacherPinSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && (!isLoggedIn || role !== 'teacher')) {
      router.push('/');
    }
  }, [authLoading, isLoggedIn, role, router]);

  // Open same section when returning from student detail (e.g. ?section=students); support createFor=studentId to open create task form
  useEffect(() => {
    const section = searchParams.get('section');
    const createFor = searchParams.get('createFor');
    const valid = ['dashboard', 'manage-tasks', 'students', 'daily-overview', 'documents-for-review', 'analytics', 'profile'];
    if (section && valid.includes(section)) {
      setActiveSection(section);
    }
    if (createFor && section === 'manage-tasks') {
      setShowTaskForm(true);
      setManageTasksTab('create');
      setEditingTaskId(null);
      setTaskTitle('');
      setTaskDescription('');
      setTaskType('daily');
      setTaskDeadline('');
      setTaskAssignedTo([createFor]);
    }
  }, [searchParams]);

  useEffect(() => {
    const saved = localStorage.getItem('documentsReviewView');
    if (saved === 'grouped' || saved === 'table') {
      setDocumentsView(saved);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('documentsReviewView', documentsView);
  }, [documentsView]);

  useEffect(() => {
    void getTeacherCredentialConfig().then((config) => {
      setTeacherLoginId(config.id || 'teacher');
    });
  }, []);

  const today = new Date().toISOString().split('T')[0];
  const yesterdayStr = (() => { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().split('T')[0]; })();
  const dailyTasks = tasks.filter((task) => task.type === 'daily');
  const oneTimeTasks = tasks.filter((task) => task.type === 'onetime');

  const totalStudents = students.length;
  const totalTasks = tasks.length;
  const unreadMessages = messages.filter((m: any) => m.sender === 'student' && !m.read).length;

  const completedToday = dailyTasks.reduce((sum, task) => {
    const assignedStudents = task.assignedTo || [];
    const completed = assignedStudents.filter(
      (studentId) => task.completedBy?.[studentId]?.date === today
    ).length;
    return sum + completed;
  }, 0);

  const totalDailyAssignments = dailyTasks.reduce(
    (sum, task) => sum + (task.assignedTo?.length || 0),
    0
  );

  /** Pending = daily tasks that are not yet completed by every assigned student today (0 to dailyTasks.length) */
  const pendingDailyTasksCount = dailyTasks.filter((task) => {
    const assigned = task.assignedTo || [];
    const completedCount = assigned.filter(
      (studentId) => task.completedBy?.[studentId]?.date === today
    ).length;
    return assigned.length > 0 && completedCount < assigned.length;
  }).length;

  const progressTasks =
    dashboardView === 'daily'
      ? dailyTasks
      : dashboardView === 'onetime'
        ? oneTimeTasks
        : tasks;

  const filteredTasks = useMemo(() => {
    if (taskFilter === 'all') return tasks;
    return tasks.filter((task) => task.type === taskFilter);
  }, [taskFilter, tasks]);

  const reviewDocuments = useMemo(() => {
    return submittedDocuments
      .filter((doc) => Boolean(doc.forReview || doc.markedForReview))
      .sort((a, b) => {
        const aTime = new Date(a.uploadedAt || 0).getTime();
        const bTime = new Date(b.uploadedAt || 0).getTime();
        return bTime - aTime;
      });
  }, [submittedDocuments]);

  const filteredReviewDocuments = useMemo(() => {
    if (documentCategoryFilter === 'all') return reviewDocuments;
    return reviewDocuments.filter((doc) => (doc.category ?? 'general') === documentCategoryFilter);
  }, [reviewDocuments, documentCategoryFilter]);

  const documentsByStudent = useMemo(() => groupByStudent(filteredReviewDocuments), [filteredReviewDocuments]);

  const sectionTitle: Record<string, string> = {
    dashboard: t('nav_dashboard'),
    'manage-tasks': t('nav_manage_tasks'),
    students: t('nav_students'),
    'daily-overview': t('nav_daily_overview'),
    'documents-for-review': t('documents_for_review'),
    analytics: t('nav_analytics'),
    profile: t('profile')
  };

  const toggleSidebar = () => setSidebarOpen((prev) => !prev);

  const handleSectionChange = (section: string) => {
    setActiveSection(section);
    setSidebarOpen(false);
  };

  const resetTaskForm = () => {
    setEditingTaskId(null);
    setTaskTitle('');
    setTaskDescription('');
    setTaskType('daily');
    setTaskDeadline('');
    setTaskAssignedTo([]);
  };

  const openCreateTaskForm = (preselectedStudentId?: string) => {
    resetTaskForm();
    if (preselectedStudentId) {
      setTaskAssignedTo([preselectedStudentId]);
    }
    setShowTaskForm(true);
  };

  const openEditTaskForm = (task: Task) => {
    setEditingTaskId(task.id);
    setTaskTitle(task.title || '');
    setTaskDescription(task.description || '');
    setTaskType(normalizeTaskType(task.type as string));
    setTaskDeadline(task.deadline || '');
    setTaskAssignedTo(task.assignedTo || []);
    setShowTaskForm(true);
  };

  const handleTaskAssignmentToggle = (studentId: string) => {
    setTaskAssignedTo((prev) => {
      if (prev.includes(studentId)) {
        return prev.filter((id) => id !== studentId);
      }
      return [...prev, studentId];
    });
  };

  const handleTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!taskTitle.trim()) {
      alert(t('placeholder_task_title'));
      return;
    }

    if (taskAssignedTo.length === 0) {
      alert(t('alert_select_one_student_task'));
      return;
    }

    const payload = {
      title: taskTitle.trim(),
      description: taskDescription.trim(),
      type: taskType,
      assignedTo: taskAssignedTo,
      deadline: taskType === 'onetime' ? taskDeadline || '' : ''
    };

    if (editingTaskId) {
      await updateTask(editingTaskId, {
        ...payload,
        updatedAt: new Date().toISOString()
      });
      alert(t('alert_task_updated'));
    } else {
      await addTask({
        ...payload,
        createdAt: new Date().toISOString(),
        completedBy: {}
      });
      alert(t('alert_task_created'));
    }

    resetTaskForm();
    setShowTaskForm(false);
  };

  const handleDeleteTask = async (task: Task) => {
    const message = t('confirm_delete_task')
      .replace('{{title}}', task.title || '')
      .replace('{{count}}', String(task.assignedTo?.length || 0));

    if (!confirm(message)) {
      return;
    }

    await deleteTask(task.id);
    alert(t('alert_task_deleted'));
  };

  const openStudentForm = () => {
    setStudentForm((prev) => ({
      ...DEFAULT_STUDENT_FORM,
      studentId: prev.studentId || nextStudentId(students),
      enrollmentDate: new Date().toISOString().split('T')[0]
    }));
    setShowStudentForm(true);
  };

  const handleStudentFormChange = (key: keyof StudentFormState, value: string) => {
    setStudentForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!studentForm.name.trim()) {
      alert(t('alert_student_name_required'));
      return;
    }

    if (!studentForm.studentId.trim()) {
      alert(t('alert_student_id_required'));
      return;
    }

    if (studentForm.pin.trim().length < 4 || studentForm.pin.trim().length > 8) {
      alert(t('alert_pin_required'));
      return;
    }

    if (!studentForm.dateOfBirth) {
      alert(t('alert_dob_required'));
      return;
    }

    if (!studentForm.parentName.trim()) {
      alert(t('alert_parent_name_required'));
      return;
    }

    if (!studentForm.parentPhone.trim()) {
      alert(t('alert_parent_phone_required'));
      return;
    }

    if (!studentForm.enrollmentDate) {
      alert(t('alert_enrollment_date_required'));
      return;
    }

    await addStudent({
      ...studentForm,
      name: studentForm.name.trim(),
      studentId: studentForm.studentId.trim(),
      pin: studentForm.pin.trim(),
      createdAt: new Date().toISOString()
    });

    alert(t('alert_student_added'));
    setStudentForm(DEFAULT_STUDENT_FORM);
    setShowStudentForm(false);
  };

  const handleDeleteStudent = async (studentId: string) => {
    if (!confirm(t('confirm_remove_student'))) {
      return;
    }

    await deleteStudent(studentId);
  };

  const markDocumentReviewed = async (doc: SubmittedDocumentLike) => {
    await updateSubmittedDocument(doc.id, {
      forReview: false,
      markedForReview: false,
      reviewedAt: new Date().toISOString()
    });
  };

  const toggleGroup = (studentId: string) => {
    setExpandedDocGroups((prev) => ({
      ...prev,
      [studentId]: !(prev[studentId] ?? true)
    }));
  };

  const getStudent = (studentId: string) => {
    return students.find((student) => String(student.id) === String(studentId));
  };

  const getDocumentUrl = (doc: SubmittedDocumentLike) => doc.fileUrl || doc.downloadURL || '';

  const handleTeacherPinChange = async (e: React.FormEvent) => {
    e.preventDefault();
    const currentPin = teacherCurrentPin.trim();
    const newPin = teacherNewPin.trim();
    const confirmPin = teacherConfirmPin.trim();

    if (!currentPin || newPin.length < 4 || newPin.length > 8) {
      alert(t('alert_pin_required'));
      return;
    }
    if (newPin !== confirmPin) {
      alert(t('alert_pin_mismatch'));
      return;
    }

    setTeacherPinSubmitting(true);
    try {
      const result = await updateTeacherCredentials(currentPin, newPin);
      if (!result.ok) {
        alert(t('alert_wrong_current_pin'));
        return;
      }
      setTeacherCurrentPin('');
      setTeacherNewPin('');
      setTeacherConfirmPin('');
      alert(t('alert_pin_updated'));
    } catch {
      alert(t('login_error'));
    } finally {
      setTeacherPinSubmitting(false);
    }
  };

  const loading = studentsLoading || tasksLoading || messagesLoading;

  if (authLoading) {
    return <div className="loading-state"><i className="fas fa-circle-notch fa-spin"></i></div>;
  }

  if (!isLoggedIn || role !== 'teacher') {
    return null;
  }

  return (
    <div className="app-container">
      <div className={`sidebar-backdrop ${sidebarOpen ? 'active' : ''}`} onClick={() => setSidebarOpen(false)} aria-hidden="true"></div>

      <TeacherSidebar
        activeSection={activeSection}
        onSectionChange={handleSectionChange}
        unreadMessages={unreadMessages}
        t={t}
        lang={lang}
        onLangChange={changeLang}
        isOpen={sidebarOpen}
      />

      <main className="main-content">
        <TeacherTopBar
          title={sectionTitle[activeSection] || t('nav_dashboard')}
          onMenuToggle={toggleSidebar}
          t={t}
          lang={lang}
          onLangChange={changeLang}
        />

        <div className="content-area">
          {activeSection === 'dashboard' && (
            <section id="dashboard-section" className="content-section active">
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-icon" style={{ background: '#e3f2fd' }}>
                    <i className="fas fa-users" style={{ color: '#2196F3' }}></i>
                  </div>
                  <div className="stat-info">
                    <h3>{loading ? '...' : totalStudents}</h3>
                    <p>
                      <span className="stat-label-desktop">{t('stat_total_students')}</span>
                      <span className="stat-label-mobile">{t('stat_students')}</span>
                    </p>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon" style={{ background: '#f3e5f5' }}>
                    <i className="fas fa-tasks" style={{ color: '#9C27B0' }}></i>
                  </div>
                  <div className="stat-info">
                    <h3>{loading ? '...' : totalTasks}</h3>
                    <p>
                      <span className="stat-label-desktop">{t('stat_total_tasks')}</span>
                      <span className="stat-label-mobile">{t('stat_tasks')}</span>
                    </p>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon" style={{ background: '#e8f5e9' }}>
                    <i className="fas fa-check-circle" style={{ color: '#4CAF50' }}></i>
                  </div>
                  <div className="stat-info">
                    <h3>{loading ? '...' : completedToday}</h3>
                    <p>
                      <span className="stat-label-desktop">{t('stat_completed_tasks')}</span>
                      <span className="stat-label-mobile">{t('stat_done')}</span>
                    </p>
                  </div>
                </div>

                <div
                  className="stat-card"
                  onClick={() => {
                    handleSectionChange('daily-overview');
                    setDashboardView('daily');
                  }}
                  style={{ cursor: 'pointer' }}
                  title={t('stat_pending_tasks')}
                >
                  <div className="stat-icon" style={{ background: '#fff3e0' }}>
                    <i className="fas fa-clock" style={{ color: '#FF9800' }}></i>
                  </div>
                  <div className="stat-info">
                    <h3>{loading ? '...' : pendingDailyTasksCount}</h3>
                    <p>
                      <span className="stat-label-desktop">{t('stat_pending_tasks')}</span>
                      <span className="stat-label-mobile">{t('stat_pending')}</span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="dashboard-content">
                <div className="students-progress">
                  <div className="progress-section-header">
                    <h2 className="section-title">{t('section_students_progress')}</h2>
                    <div className="progress-tabs">
                      <button
                        type="button"
                        className={`progress-tab daily ${dashboardView === 'daily' ? 'active' : ''}`}
                        onClick={() => setDashboardView('daily')}
                      >
                        <i className="fas fa-redo-alt"></i> <span>{t('tab_daily')}</span>
                      </button>
                      <button
                        type="button"
                        className={`progress-tab onetime ${dashboardView === 'onetime' ? 'active' : ''}`}
                        onClick={() => setDashboardView('onetime')}
                      >
                        <i className="fas fa-clipboard-list"></i> <span>{t('tab_onetime')}</span>
                      </button>
                      <button
                        type="button"
                        className={`progress-tab spreadsheet ${dashboardView === 'spreadsheet' ? 'active' : ''}`}
                        onClick={() => setDashboardView('spreadsheet')}
                      >
                        <i className="fas fa-table"></i> <span>{t('tab_spreadsheet')}</span>
                      </button>
                    </div>
                  </div>

                  {loading ? (
                    <div className="loading-spinner">
                      <i className="fas fa-circle-notch fa-spin"></i>
                      <span>{t('loading')}</span>
                    </div>
                  ) : students.length === 0 ? (
                    <div className="no-tasks-message">
                      <i className="fas fa-inbox"></i>
                      <h3>{t('no_students')}</h3>
                    </div>
                  ) : dashboardView === 'spreadsheet' ? (
                    <div id="view-spreadsheet" className="progress-view active">
                      <div id="spreadsheetTaskFilter" className="spreadsheet-task-filter" style={{ display: 'none' }}>
                        <span className="spreadsheet-filter-label">{t('show_tasks')}</span>
                        <button type="button" className="spreadsheet-filter-btn active">{t('spreadsheet_filter_all')}</button>
                        <button type="button" className="spreadsheet-filter-btn">{t('tab_daily')}</button>
                        <button type="button" className="spreadsheet-filter-btn">{t('tab_onetime')}</button>
                      </div>
                      <div id="studentsProgressSpreadsheet" className="spreadsheet-wrap overview-table-container">
                      <table className="overview-table">
                        <thead>
                          <tr>
                            <th>{t('student')}</th>
                            {progressTasks.map((task) => (
                              <th key={task.id}>{task.title}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {students.map((student) => (
                            <tr key={student.id}>
                              <td>
                                <div className="student-name">{student.name}</div>
                                <div className="student-id-display">{student.studentId}</div>
                                <div className="student-year-meta">{getStudentYearLabel(student, t)}</div>
                              </td>
                              {progressTasks.map((task) => {
                                const isAssigned = task.assignedTo?.includes(student.id);
                                const isCompleted = task.type === 'daily'
                                  ? task.completedBy?.[student.id]?.date === today
                                  : Boolean(task.completedBy?.[student.id]);

                                return (
                                  <td key={`${student.id}-${task.id}`} className="status-cell">
                                    {!isAssigned ? (
                                      <span className="text-muted">-</span>
                                    ) : isCompleted ? (
                                      <i className="fas fa-check-circle text-success"></i>
                                    ) : (
                                      <i className="fas fa-clock text-warning"></i>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      </div>
                    </div>
                  ) : (
                    <div id={dashboardView === 'daily' ? 'view-daily' : 'view-onetime'} className="progress-view active">
                      <div className="progress-list progress-summary-list">
                      {students.map((student) => {
                        const assignedTasks = progressTasks.filter((task) => task.assignedTo?.includes(student.id));
                        const completedCount = assignedTasks.filter((task) => {
                          if (task.type === 'daily') {
                            return task.completedBy?.[student.id]?.date === today;
                          }
                          return Boolean(task.completedBy?.[student.id]);
                        }).length;

                        const totalCount = assignedTasks.length;
                        const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

                        const badgeBg = percentage >= 80 ? '#e8f5e9' : percentage >= 50 ? '#fff3e0' : '#ffebee';
                        const badgeColor = percentage >= 80 ? '#2e7d32' : percentage >= 50 ? '#e65100' : '#c62828';
                        const barBg =
                          percentage >= 80
                            ? 'linear-gradient(90deg, #88B68D, #9DC9A3)'
                            : 'linear-gradient(90deg, #FF9800, #FFB74D)';

                        return (
                          <div
                            key={student.id}
                            className="student-summary-row"
                            onClick={() => router.push(`/teacher/student?id=${student.id}&returnSection=dashboard`)}
                            style={{ cursor: 'pointer' }}
                          >
                            <div className="student-info">
                              <div className="student-name-row">
                                <span className="student-name">{student.name}</span>
                                <span className="student-id-display">{student.studentId}</span>
                              </div>
                              <div className="student-grade">{getStudentYearLabel(student, t)} • {completedCount}/{totalCount} {t('tasks')}</div>
                            </div>
                            <span className="completion-badge" style={{ background: badgeBg, color: badgeColor }}>
                              {percentage}%
                            </span>
                            <div className="progress-bar-container">
                              <div className="progress-bar" style={{ width: `${percentage}%`, background: barBg }}></div>
                            </div>
                          </div>
                        );
                      })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

          {activeSection === 'profile' && (
            <section id="profile-section" className="content-section active">
              <div className="dashboard-content">
                <div className="analytics-card teacher-security-card">
                  <h3>{t('teacher_security_title')}</h3>
                  <p>{t('teacher_security_hint')}</p>
                  <div className="teacher-security-meta">
                    <span>{t('teacher_login_id_label')}</span>
                    <strong>{teacherLoginId}</strong>
                  </div>
                  <form className="teacher-security-form" onSubmit={handleTeacherPinChange}>
                    <div className="teacher-security-grid">
                      <div className="teacher-security-field">
                        <label htmlFor="teacherCurrentPin">{t('old_pin')}</label>
                        <input
                          id="teacherCurrentPin"
                          type="password"
                          value={teacherCurrentPin}
                          onChange={(e) => setTeacherCurrentPin(e.target.value)}
                          autoComplete="current-password"
                          maxLength={8}
                        />
                      </div>
                      <div className="teacher-security-field">
                        <label htmlFor="teacherNewPin">{t('new_pin')}</label>
                        <input
                          id="teacherNewPin"
                          type="password"
                          value={teacherNewPin}
                          onChange={(e) => setTeacherNewPin(e.target.value)}
                          autoComplete="new-password"
                          maxLength={8}
                        />
                      </div>
                      <div className="teacher-security-field">
                        <label htmlFor="teacherConfirmPin">{t('confirm_pin')}</label>
                        <input
                          id="teacherConfirmPin"
                          type="password"
                          value={teacherConfirmPin}
                          onChange={(e) => setTeacherConfirmPin(e.target.value)}
                          autoComplete="new-password"
                          maxLength={8}
                        />
                      </div>
                    </div>
                    <button type="submit" className="btn-primary teacher-security-submit" disabled={teacherPinSubmitting}>
                      <i className="fas fa-shield-alt"></i> {teacherPinSubmitting ? t('login_loading') : t('change_pin')}
                    </button>
                  </form>
                </div>
              </div>
            </section>
          )}

          {activeSection === 'manage-tasks' && (
            <section id="manage-tasks-section" className="content-section active">
              <div className="manage-tasks-tabs">
                <button
                  className={`manage-tab-btn ${manageTasksTab === 'create' ? 'active' : ''}`}
                  type="button"
                  onClick={() => {
                    setManageTasksTab('create');
                    setShowTaskForm(true);
                  }}
                >
                  <i className="fas fa-plus-circle"></i> <span>{t('tab_create_task')}</span>
                </button>
                <button
                  className={`manage-tab-btn ${manageTasksTab === 'view' ? 'active' : ''}`}
                  type="button"
                  onClick={() => {
                    setManageTasksTab('view');
                    setShowTaskForm(false);
                    resetTaskForm();
                  }}
                >
                  <i className="fas fa-list"></i> <span>{t('tab_view_tasks')}</span>
                </button>
              </div>

              {manageTasksTab === 'create' && (
                <div id="createTaskTab" className="manage-tab-content active">
                  <div className="form-container">
                    <h2>
                      <i className="fas fa-plus-circle"></i> <span>{editingTaskId ? t('edit_task') : t('create_new_task')}</span>
                    </h2>
                    <form onSubmit={handleTaskSubmit}>
                      <div className="form-row">
                        <div className="form-group">
                          <label>{t('task_title')}</label>
                          <input
                            type="text"
                            value={taskTitle}
                            onChange={(e) => setTaskTitle(e.target.value)}
                            placeholder={t('placeholder_task_title')}
                          />
                        </div>
                        <div className="form-group">
                          <label>{t('task_type')}</label>
                          <select
                            value={taskType}
                            onChange={(e) => setTaskType(e.target.value as 'daily' | 'onetime')}
                          >
                            <option value="daily">{t('task_type_daily')}</option>
                            <option value="onetime">{t('task_type_onetime')}</option>
                          </select>
                        </div>
                      </div>

                      <div className="form-group">
                        <label>{t('task_description')}</label>
                        <textarea
                          rows={2}
                          value={taskDescription}
                          onChange={(e) => setTaskDescription(e.target.value)}
                          placeholder={t('placeholder_task_description')}
                        />
                      </div>

                      {taskType === 'onetime' && (
                        <div className="form-group">
                          <label>{t('deadline')}</label>
                          <input
                            type="date"
                            value={taskDeadline}
                            onChange={(e) => setTaskDeadline(e.target.value)}
                          />
                        </div>
                      )}

                      <div className="form-group">
                        <label>{t('assign_to')}</label>
                        <div style={{ marginBottom: '1rem' }}>
                          <label className="checkbox-item" style={{ background: '#e3f2fd', padding: '0.75rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={students.length > 0 && taskAssignedTo.length === students.length}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setTaskAssignedTo(students.map((s) => s.id));
                                } else {
                                  setTaskAssignedTo([]);
                                }
                              }}
                            />
                            <span style={{ fontWeight: 600, color: '#1976D2' }}>{t('assign_to_all')}</span>
                          </label>
                        </div>
                        <div
                          className="checkbox-group"
                          style={{
                            maxHeight: '220px',
                            overflowY: 'auto',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            padding: '0.75rem'
                          }}
                        >
                          {students.length === 0 ? (
                            <p className="empty-state">{t('no_students')}</p>
                          ) : (
                            students.map((student) => (
                              <label
                                key={student.id}
                                className="checkbox-item"
                                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}
                              >
                                <input
                                  type="checkbox"
                                  checked={taskAssignedTo.includes(student.id)}
                                  onChange={() => handleTaskAssignmentToggle(student.id)}
                                />
                                <span>{student.name} ({student.studentId})</span>
                              </label>
                            ))
                          )}
                        </div>
                      </div>

                      <div className="form-actions">
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => {
                            setShowTaskForm(false);
                            resetTaskForm();
                          }}
                        >
                          <i className="fas fa-times"></i> {t('btn_cancel')}
                        </button>
                        <button type="submit" className="btn-primary">
                          {editingTaskId ? <i className="fas fa-save"></i> : <i className="fas fa-plus"></i>} {editingTaskId ? t('btn_update_task') : t('btn_create_task')}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {manageTasksTab === 'view' && (
                <div id="viewTasksTab" className="manage-tab-content active">
                  <div className="tasks-list-container">
                    <div className="section-header">
                      <h2>
                        <i className="fas fa-list"></i> <span>{t('all_tasks')}</span>{' '}
                        <span className="task-count-badge">{filteredTasks.length}</span>
                      </h2>
                      <div className="task-filters">
                        <button
                          className={`filter-btn ${taskFilter === 'all' ? 'active' : ''}`}
                          onClick={() => setTaskFilter('all')}
                          type="button"
                        >
                          {t('filter_all')}
                        </button>
                        <button
                          className={`filter-btn ${taskFilter === 'onetime' ? 'active' : ''}`}
                          onClick={() => setTaskFilter('onetime')}
                          type="button"
                        >
                          {t('filter_onetime')}
                        </button>
                        <button
                          className={`filter-btn ${taskFilter === 'daily' ? 'active' : ''}`}
                          onClick={() => setTaskFilter('daily')}
                          type="button"
                        >
                          {t('filter_daily')}
                        </button>
                      </div>
                    </div>

                    {loading ? (
                      <p className="empty-state">{t('loading')}</p>
                    ) : filteredTasks.length === 0 ? (
                      <div className="no-tasks-message">
                        <i className="fas fa-inbox"></i>
                        <h3>{t('no_tasks_yet')}</h3>
                        <p>{t('no_tasks_hint')}</p>
                      </div>
                    ) : (
                      <>
                        <div className="task-category" style={{ display: taskFilter === 'daily' ? 'none' : 'block' }}>
                          <h3 className="category-title">
                            <i className="fas fa-clipboard-list"></i> <span>{t('category_onetime')}</span>{' '}
                            <span className="category-count">{filteredTasks.filter((task) => task.type === 'onetime').length}</span>
                          </h3>
                          <div className="tasks-list-compact">
                            {filteredTasks
                              .filter((task) => task.type === 'onetime')
                              .map((task) => {
                                const completedCount = (task.assignedTo || []).filter((studentId) =>
                                  Boolean(task.completedBy?.[studentId])
                                ).length;
                                const totalCount = task.assignedTo?.length || 0;

                                return (
                                  <div key={task.id} className="task-item-compact">
                                    <div className="task-item-main">
                                      <div className="task-item-header">
                                        <h3 className="task-item-title">{task.title}</h3>
                                        <span className="task-type-badge-small one-time">{t('one_time')}</span>
                                      </div>
                                      <p className="task-item-description">{task.description || '-'}</p>
                                    </div>
                                    <div className="task-item-meta">
                                      <span className="meta-students">
                                        <i className="fas fa-users"></i>
                                        {totalCount}
                                      </span>
                                      <span className="task-deadline">
                                        <i className="fas fa-calendar-alt"></i> {task.deadline || '-'}
                                      </span>
                                      <span className="meta-completion">{completedCount}/{totalCount}</span>
                                    </div>
                                    <div className="task-item-actions">
                                      <button type="button" className="btn-action-edit" onClick={() => openEditTaskForm(task)} title={t('edit')}>
                                        <i className="fas fa-edit"></i>
                                      </button>
                                      <button type="button" className="btn-action-delete" onClick={() => handleDeleteTask(task)} title={t('delete')}>
                                        <i className="fas fa-trash"></i>
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        </div>

                        <div className="task-category" style={{ display: taskFilter === 'onetime' ? 'none' : 'block' }}>
                          <h3 className="category-title">
                            <i className="fas fa-redo-alt"></i> <span>{t('category_daily')}</span>{' '}
                            <span className="category-count">{filteredTasks.filter((task) => task.type === 'daily').length}</span>
                          </h3>
                          <div className="tasks-list-compact">
                            {filteredTasks
                              .filter((task) => task.type === 'daily')
                              .map((task) => {
                                const completedCount = (task.assignedTo || []).filter(
                                  (studentId) => task.completedBy?.[studentId]?.date === today
                                ).length;
                                const totalCount = task.assignedTo?.length || 0;

                                return (
                                  <div key={task.id} className="task-item-compact">
                                    <div className="task-item-main">
                                      <div className="task-item-header">
                                        <h3 className="task-item-title">{task.title}</h3>
                                        <span className="task-type-badge-small daily">{t('daily')}</span>
                                      </div>
                                      <p className="task-item-description">{task.description || '-'}</p>
                                    </div>
                                    <div className="task-item-meta">
                                      <span className="meta-students">
                                        <i className="fas fa-users"></i>
                                        {totalCount}
                                      </span>
                                      <span className="meta-completion">{completedCount}/{totalCount}</span>
                                    </div>
                                    <div className="task-item-actions">
                                      <button type="button" className="btn-action-edit" onClick={() => openEditTaskForm(task)} title={t('edit')}>
                                        <i className="fas fa-edit"></i>
                                      </button>
                                      <button type="button" className="btn-action-delete" onClick={() => handleDeleteTask(task)} title={t('delete')}>
                                        <i className="fas fa-trash"></i>
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </section>
          )}
          {activeSection === 'students' && (
            <section id="students-section" className="content-section active">
              <div className="section-header">
                <h2>
                  <i className="fas fa-users"></i> {t('manage_students')}
                  <span className="student-count-badge">{students.length}</span>
                </h2>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button
                    className="btn-primary"
                    onClick={() => {
                      if (showStudentForm) {
                        setShowStudentForm(false);
                        setStudentForm(DEFAULT_STUDENT_FORM);
                      } else {
                        openStudentForm();
                      }
                    }}
                  >
                    <i className="fas fa-user-plus"></i> {t('add_student')}
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {}}
                    title={t('import_students')}
                    aria-label={t('import_students')}
                  >
                    <i className="fas fa-file-upload"></i> {t('import_students')}
                  </button>
                </div>
              </div>

              {showStudentForm && (
                <form className="form-container" onSubmit={handleAddStudent}>
                  <h2>{t('add_new_student')}</h2>

                  <div className="form-row">
                    <div className="form-group">
                      <label>{t('student_name')}</label>
                      <input
                        type="text"
                        value={studentForm.name}
                        onChange={(e) => handleStudentFormChange('name', e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label>{t('student_id')}</label>
                      <input
                        type="text"
                        value={studentForm.studentId}
                        onChange={(e) => handleStudentFormChange('studentId', e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label>{t('pin')}</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={8}
                        value={studentForm.pin}
                        onChange={(e) => handleStudentFormChange('pin', e.target.value.replace(/\D/g, ''))}
                        placeholder={t('default_pin') || '1234'}
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>{t('date_of_birth')}</label>
                      <input
                        type="date"
                        value={studentForm.dateOfBirth}
                        onChange={(e) => handleStudentFormChange('dateOfBirth', e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label>{t('enrollment_date')}</label>
                      <input
                        type="date"
                        value={studentForm.enrollmentDate}
                        onChange={(e) => handleStudentFormChange('enrollmentDate', e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label>{t('phone')}</label>
                      <input
                        type="text"
                        value={studentForm.phone}
                        onChange={(e) => handleStudentFormChange('phone', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>{t('email')}</label>
                      <input
                        type="email"
                        value={studentForm.email}
                        onChange={(e) => handleStudentFormChange('email', e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label>{t('parent_name')}</label>
                      <input
                        type="text"
                        value={studentForm.parentName}
                        onChange={(e) => handleStudentFormChange('parentName', e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label>{t('parent_phone')}</label>
                      <input
                        type="text"
                        value={studentForm.parentPhone}
                        onChange={(e) => handleStudentFormChange('parentPhone', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>{t('parent_email')}</label>
                    <input
                      type="email"
                      value={studentForm.parentEmail}
                      onChange={(e) => handleStudentFormChange('parentEmail', e.target.value)}
                    />
                  </div>

                  <div className="form-actions">
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => {
                        setShowStudentForm(false);
                        setStudentForm(DEFAULT_STUDENT_FORM);
                      }}
                    >
                      <i className="fas fa-times"></i> {t('btn_cancel')}
                    </button>
                    <button type="submit" className="btn-primary">
                      <i className="fas fa-save"></i> {t('btn_add_student')}
                    </button>
                  </div>
                </form>
              )}

              <div className="students-grid">
                {loading ? (
                  <p className="empty-state">{t('loading')}</p>
                ) : students.length === 0 ? (
                  <p className="empty-state">{t('no_students')}</p>
                ) : (
                  students.map((student) => {
                    const assignedDaily = dailyTasks.filter((t) => t.assignedTo?.includes(student.id));
                    const dailyCompletedToday = assignedDaily.filter((t) => t.completedBy?.[student.id]?.date === today).length;
                    const dailyTotal = assignedDaily.length;
                    const dailyPercent = dailyTotal > 0 ? Math.round((dailyCompletedToday / dailyTotal) * 100) : 0;
                    const assignedOnetime = oneTimeTasks.filter((t) => t.assignedTo?.includes(student.id));
                    const onetimeCompleted = assignedOnetime.filter((t) => Boolean(t.completedBy?.[student.id])).length;
                    const onetimeTotal = assignedOnetime.length;
                    const onetimePercent = onetimeTotal > 0 ? Math.round((onetimeCompleted / onetimeTotal) * 100) : 0;
                    const yearLabel = getStudentYearLabel(student, t);
                    return (
                      <div key={student.id} className="student-card">
                        <div className="student-card-header" onClick={() => router.push(`/teacher/student?id=${student.id}&returnSection=students`)} style={{ cursor: 'pointer' }}>
                          <div>
                            <h3 className="student-name">
                              {student.name}
                              <span className="student-id-display">{student.studentId}</span>
                            </h3>
                            <p className="student-meta">{yearLabel}{student.phone ? ` • ${student.phone}` : ''}</p>
                          </div>
                        </div>

                        <div className="compact-badges">
                          <span className="mini-badge">{yearLabel}</span>
                          {student.phone ? <span className="mini-badge"><i className="fas fa-phone"></i> {student.phone}</span> : null}
                        </div>

                        <div className="progress-details-dual">
                          <div className="mini-progress-row">
                            <span className="mini-label"><i className="fas fa-calendar-day"></i> {t('tab_daily')}</span>
                            <div className="mini-progress-bar">
                              <div className="mini-progress-fill daily-mini" style={{ width: `${dailyPercent}%` }}></div>
                            </div>
                            <span className="mini-percent">{dailyPercent}%</span>
                          </div>
                          <div className="mini-progress-row">
                            <span className="mini-label"><i className="fas fa-clipboard-list"></i> {t('stat_tasks')}</span>
                            <div className="mini-progress-bar">
                              <div className="mini-progress-fill onetime-mini" style={{ width: `${onetimePercent}%` }}></div>
                            </div>
                            <span className="mini-percent">{onetimePercent}%</span>
                          </div>
                        </div>

                        <button className="btn-secondary btn-full" onClick={() => router.push(`/teacher/student?id=${student.id}&returnSection=students`)}>
                          <i className="fas fa-eye"></i> {t('view_details')}
                        </button>

                        <div className="student-card-actions-inline">
                          <button
                            className="icon-btn"
                            title={t('add_task')}
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveSection('manage-tasks');
                              openCreateTaskForm(student.id);
                            }}
                          >
                            <i className="fas fa-plus-circle"></i>
                          </button>
                          <button className="icon-btn" title={t('send_message')} onClick={(e) => { e.stopPropagation(); router.push('/teacher/messages'); }}>
                            <i className="fas fa-comments"></i>
                          </button>
                          <button className="icon-btn danger" title={t('delete')} onClick={(e) => { e.stopPropagation(); handleDeleteStudent(student.id); }}>
                            <i className="fas fa-trash"></i>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>
          )}

          {activeSection === 'daily-overview' && (
            <section id="daily-overview-section" className="content-section active">
              <div className="section-header">
                <h2><i className="fas fa-table"></i> {t('nav_daily_overview')}</h2>
              </div>

              <div className="overview-container-inline">
                <div className="date-selector-section">
                  <div className="date-selector-header">
                    <h3><i className="fas fa-calendar-alt"></i> <span>{t('select_date')}</span></h3>
                  </div>
                  <div className="date-selector-controls">
                    <button
                      type="button"
                      className={`date-btn ${overviewDate === today ? 'active' : ''}`}
                      onClick={() => setOverviewDate(today)}
                    >
                      <i className="fas fa-calendar-day"></i> <span>{t('today')}</span>
                    </button>
                    <button
                      type="button"
                      className={`date-btn ${overviewDate === yesterdayStr ? 'active' : ''}`}
                      onClick={() => setOverviewDate(yesterdayStr)}
                    >
                      <i className="fas fa-history"></i> <span>{t('yesterday')}</span>
                    </button>
                    <input
                      type="date"
                      className="date-picker"
                      value={overviewDate}
                      onChange={(e) => setOverviewDate(e.target.value)}
                    />
                    <span className="selected-date-display">
                      {overviewDate === today ? t('today') : overviewDate}
                    </span>
                  </div>
                </div>

                <div className="best-students-section">
                  <div className="best-students-header">
                    <h3><i className="fas fa-trophy"></i> <span>{t('best_performing_students')}</span></h3>
                  </div>
                  <div className="best-students-grid">
                    {loading ? (
                      <div className="loading-spinner" style={{ gridColumn: '1 / -1' }}><i className="fas fa-circle-notch fa-spin"></i><span>{t('loading')}</span></div>
                    ) : students.length === 0 || dailyTasks.length === 0 ? (
                      <p className="empty-state">{t('no_data_available')}</p>
                    ) : (
                      (() => {
                        const withPercent = students.map((student) => {
                          const assigned = dailyTasks.filter((task) => task.assignedTo?.includes(student.id));
                          const completed = assigned.filter((task) => task.completedBy?.[student.id]?.date === overviewDate).length;
                          const pct = assigned.length > 0 ? Math.round((completed / assigned.length) * 100) : 0;
                          return { student, pct, completed: completed, total: assigned.length };
                        }).filter((x) => x.total > 0).sort((a, b) => b.pct - a.pct).slice(0, 6);
                        return (
                          withPercent.length === 0 ? (
                            <p className="empty-state">{t('no_data_available')}</p>
                          ) : (
                            withPercent.map(({ student, pct }) => (
                              <div key={student.id} className="best-student-card">
                                <div className="best-student-info">
                                  <h4>{student.name}</h4>
                                </div>
                                <span className="best-student-percentage">{pct}%</span>
                              </div>
                            ))
                          )
                        );
                      })() )}
                  </div>
                </div>

                <div className="overview-table-section">
                  <div className="table-header">
                    <h3><i className="fas fa-clipboard-check"></i> <span>{t('completion_status')}</span></h3>
                  </div>
                  <div className="overview-table-container">
                    {loading ? (
                      <p className="empty-state">{t('loading')}</p>
                    ) : students.length === 0 || dailyTasks.length === 0 ? (
                      <p className="empty-state">{t('no_data_available')}</p>
                    ) : (
                      <table className="overview-table">
                        <thead>
                          <tr>
                            <th>{t('student')}</th>
                            {dailyTasks.map((task) => (
                              <th key={task.id}>{task.title}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {students.map((student) => (
                            <tr key={student.id}>
                              <td>{student.name}</td>
                              {dailyTasks.map((task) => {
                                const isAssigned = task.assignedTo?.includes(student.id);
                                const isCompleted = task.completedBy?.[student.id]?.date === overviewDate;
                                return (
                                  <td key={`${student.id}-${task.id}`} className="status-cell">
                                    {isAssigned ? (
                                      isCompleted ? (
                                        <i className="fas fa-check-circle text-success"></i>
                                      ) : (
                                        <i className="fas fa-clock text-warning"></i>
                                      )
                                    ) : (
                                      <span className="text-muted">-</span>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </div>
            </section>
          )}

          {activeSection === 'documents-for-review' && (
            <section id="documents-for-review-section" className="content-section active">
              <div className="documents-review-container">
                <div className="documents-review-header">
                  <h2><i className="fas fa-file-upload"></i> {t('documents_for_review')}</h2>
                  <p className="documents-review-hint">{t('documents_for_review_hint')}</p>
                  <div className="documents-review-controls">
                    <div className="message-category-filter document-category-filter" data-testid="teacher-documents-category-filter">
                      <label htmlFor="doc-review-category-filter" className="message-category-filter-label">{t('filter_by_category')}</label>
                      <select
                        id="doc-review-category-filter"
                        value={documentCategoryFilter}
                        onChange={(e) => setDocumentCategoryFilter(e.target.value as MessageCategory | 'all')}
                        className="message-category-select"
                        data-testid="teacher-documents-filter-by-category"
                      >
                        <option value="all">{t('all_categories')}</option>
                        <option value="general">{t('msg_category_general')}</option>
                        <option value="question">{t('msg_category_question')}</option>
                        <option value="fortnight_report">{t('msg_category_fortnight_report')}</option>
                      </select>
                    </div>
                    <div className="documents-view-toggle">
                      <button
                        type="button"
                        className={`view-toggle-btn ${documentsView === 'grouped' ? 'active' : ''}`}
                        onClick={() => setDocumentsView('grouped')}
                      >
                        <i className="fas fa-users"></i> {t('view_grouped')}
                      </button>
                      <button
                        type="button"
                        className={`view-toggle-btn ${documentsView === 'table' ? 'active' : ''}`}
                        onClick={() => setDocumentsView('table')}
                      >
                        <i className="fas fa-table"></i> {t('view_table')}
                      </button>
                    </div>
                  </div>
                </div>

                {documentsLoading ? (
                  <div className="loading-spinner">
                    <i className="fas fa-circle-notch fa-spin"></i>
                    <span>{t('loading')}</span>
                  </div>
                ) : filteredReviewDocuments.length === 0 ? (
                  <div className="documents-review-empty">
                    <i className="fas fa-folder-open"></i>
                    <h3>{t('no_documents_for_review')}</h3>
                    <p>{t('no_documents_for_review_hint')}</p>
                  </div>
                ) : documentsView === 'table' ? (
                  <div className="documents-table-wrap">
                    <table className="documents-table">
                      <thead>
                        <tr>
                          <th>{t('student')}</th>
                          <th>{t('document_column')}</th>
                          <th>{t('date')}</th>
                          <th>{t('size')}</th>
                          <th>{t('actions')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredReviewDocuments.map((doc) => {
                          const student = getStudent(doc.studentId);
                          const studentLabel = doc.studentName || student?.name || 'Unknown';
                          const studentIdLabel = student?.studentId || doc.studentId;
                          const url = getDocumentUrl(doc);

                          return (
                            <tr key={doc.id}>
                              <td>
                                <span className="doc-cell-student">{studentLabel}</span>
                                <span className="doc-cell-id">{studentIdLabel}</span>
                              </td>
                              <td>
                                {url ? (
                                  <a href={url} target="_blank" rel="noreferrer" className="document-review-name-link">
                                    {doc.fileName || 'document'}
                                  </a>
                                ) : (
                                  <span>{doc.fileName || 'document'}</span>
                                )}
                                {doc.category && (
                                  <span className="document-category-badge doc-cell-category">{t('msg_category_' + doc.category)}</span>
                                )}
                              </td>
                              <td>{formatShortDate(doc.uploadedAt)}</td>
                              <td>{formatFileSize(doc.fileSize)}</td>
                              <td>
                                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                  {url ? (
                                    <a href={url} target="_blank" rel="noreferrer" className="btn-download-doc btn-sm">
                                      <i className="fas fa-download"></i> {t('download')}
                                    </a>
                                  ) : (
                                    <span className="doc-no-url">{t('no_file_url')}</span>
                                  )}
                                  <button
                                    type="button"
                                    className="btn-secondary"
                                    onClick={() => markDocumentReviewed(doc)}
                                  >
                                    <i className="fas fa-check"></i> Mark Reviewed
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="documents-review-list">
                    {Object.entries(documentsByStudent)
                      .sort((a, b) => {
                        const studentA = getStudent(a[0]);
                        const studentB = getStudent(b[0]);
                        return (studentA?.name || '').localeCompare(studentB?.name || '');
                      })
                      .map(([studentId, docs]) => {
                        const student = getStudent(studentId);
                        const studentLabel = student?.name || docs[0]?.studentName || 'Unknown';
                        const studentIdLabel = student?.studentId || studentId;
                        const expanded = expandedDocGroups[studentId] ?? true;

                        return (
                          <div className="documents-group" key={studentId}>
                            <button
                              type="button"
                              className="documents-group-header"
                              aria-expanded={expanded}
                              onClick={() => toggleGroup(studentId)}
                            >
                              <i className="fas fa-chevron-down documents-group-chevron" style={{ transform: expanded ? 'none' : 'rotate(-90deg)' }}></i>
                              <span className="documents-group-name">{studentLabel}</span>
                              <span className="documents-group-id">{studentIdLabel}</span>
                              <span className="documents-group-count">
                                {docs.length} {docs.length === 1 ? t('document') : t('documents')}
                              </span>
                            </button>

                            {expanded && (
                              <div className="documents-group-body">
                                {docs.map((doc) => {
                                  const url = getDocumentUrl(doc);
                                  return (
                                    <div key={doc.id} className="document-review-item">
                                      <div className="document-review-icon">
                                        <i className="fas fa-file"></i>
                                      </div>
                                      <div className="document-review-info">
                                        {url ? (
                                          <a href={url} target="_blank" rel="noreferrer" className="document-review-name-link">
                                            {doc.fileName || 'document'}
                                          </a>
                                        ) : (
                                          <span className="document-review-name">{doc.fileName || 'document'}</span>
                                        )}
                                        {doc.category && (
                                          <span className="document-category-badge">{t('msg_category_' + doc.category)}</span>
                                        )}
                                        <span className="document-review-student">
                                          {studentLabel}
                                          <span className="document-review-id">{studentIdLabel}</span>
                                        </span>
                                        <span className="document-review-meta">
                                          {formatShortDate(doc.uploadedAt)}
                                          {doc.fileSize ? ` - ${formatFileSize(doc.fileSize)}` : ''}
                                        </span>
                                      </div>
                                      <div className="document-review-actions" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                        {url ? (
                                          <a href={url} target="_blank" rel="noreferrer" className="btn-download-doc">
                                            <i className="fas fa-download"></i> {t('download')}
                                          </a>
                                        ) : (
                                          <span className="doc-no-url">{t('no_file_url')}</span>
                                        )}
                                        <button
                                          type="button"
                                          className="btn-secondary"
                                          onClick={() => markDocumentReviewed(doc)}
                                        >
                                          <i className="fas fa-check"></i> Mark Reviewed
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            </section>
          )}

          {activeSection === 'analytics' && (
            <section id="analytics-section" className="content-section active">
              <div className="section-header">
                <h2><i className="fas fa-chart-bar"></i> {t('nav_analytics')}</h2>
              </div>
              <p className="empty-state">{t('analytics_coming_soon')}</p>
            </section>
          )}
        </div>
      </main>

      <div className="bottom-nav-wrapper">
        <div className="bottom-nav-fade bottom-nav-fade-left" id="bottomNavFadeLeft" aria-hidden="true"><i className="fas fa-chevron-left"></i></div>
        <nav className="bottom-nav" id="bottomNav" aria-label="Main navigation">
          <a
            href="#"
            className={`bottom-nav-item ${activeSection === 'dashboard' ? 'active' : ''}`}
            onClick={(e) => { e.preventDefault(); handleSectionChange('dashboard'); }}
            title="Dashboard"
          >
            <i className="fas fa-home"></i>
            <span>{t('nav_dashboard')}</span>
          </a>
          <a
            href="#"
            className={`bottom-nav-item ${activeSection === 'manage-tasks' ? 'active' : ''}`}
            onClick={(e) => { e.preventDefault(); handleSectionChange('manage-tasks'); }}
            title="Tasks"
          >
            <i className="fas fa-tasks"></i>
            <span>{t('stat_tasks')}</span>
          </a>
          <a
            href="#"
            className={`bottom-nav-item ${activeSection === 'students' ? 'active' : ''}`}
            onClick={(e) => { e.preventDefault(); handleSectionChange('students'); }}
            title="Students"
          >
            <i className="fas fa-users"></i>
            <span>{t('nav_students')}</span>
          </a>
          <a
            href="#"
            className="bottom-nav-item bottom-nav-item-msg"
            onClick={(e) => { e.preventDefault(); router.push('/teacher/messages'); }}
            title="Messages"
          >
            <i className="fas fa-comments"></i>
            <span>{t('nav_messages')}</span>
            {unreadMessages > 0 && <span id="messagesUnreadBadgeNav" className="bottom-nav-badge">{unreadMessages}</span>}
          </a>
          <a
            href="#"
            className={`bottom-nav-item ${activeSection === 'documents-for-review' ? 'active' : ''}`}
            onClick={(e) => { e.preventDefault(); handleSectionChange('documents-for-review'); }}
            title="Documents"
          >
            <i className="fas fa-file-upload"></i>
            <span>{t('nav_documents')}</span>
          </a>
          <a
            href="#"
            className={`bottom-nav-item ${activeSection === 'daily-overview' ? 'active' : ''}`}
            onClick={(e) => { e.preventDefault(); handleSectionChange('daily-overview'); }}
            title="Overview"
          >
            <i className="fas fa-table"></i>
            <span>{t('nav_overview')}</span>
          </a>
          <a
            href="#"
            className="bottom-nav-item"
            onClick={(e) => { e.preventDefault(); router.push('/teacher/exams'); }}
            title="Exams"
          >
            <i className="fas fa-graduation-cap"></i>
            <span>{t('nav_exams')}</span>
          </a>
          <a
            href="#"
            className="bottom-nav-item bottom-nav-menu"
            id="bottomNavMenu"
            onClick={(e) => { e.preventDefault(); setSidebarOpen(true); }}
            title="Menu"
          >
            <i className="fas fa-ellipsis-v"></i>
            <span>{t('nav_menu')}</span>
          </a>
        </nav>
        <div className="bottom-nav-fade bottom-nav-fade-right" id="bottomNavFadeRight" aria-hidden="true"><i className="fas fa-chevron-right"></i></div>
      </div>
    </div>
  );
}

export default function TeacherDashboard() {
  return (
    <Suspense fallback={<div className="loading-state"><i className="fas fa-circle-notch fa-spin"></i></div>}>
      <TeacherDashboardContent />
    </Suspense>
  );
}








