'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '@/lib/auth-context';
import {
  useStudents,
  useTasks,
  useMessages,
  useSubmittedDocuments,
  useQuizzes,
  useQuizResults
} from '@/hooks/useFirestore';
import { useTranslation } from '@/hooks/useTranslation';
import { storage } from '@/lib/firebase';
import StudentSidebar from '@/components/student/StudentSidebar';
import '@/styles/student.css';
type SubmittedDocumentLike = {
  id: string;
  studentId: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  uploadedAt?: string;
  fileUrl?: string;
  downloadURL?: string;
  forReview?: boolean;
  markedForReview?: boolean;
};

function normalizeTaskType(type: string) {
  return type === 'one-time' ? 'onetime' : type;
}

function formatFileSize(bytes?: number) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

import {
  formatDateDisplay,
  formatDateDisplayDayOnly,
  formatDateDisplayShort,
  getUseHijri,
  setUseHijri as setUseHijriPreference
} from '@/lib/date-format';

function formatShortDate(iso?: string, useHijri?: boolean) {
  if (!iso) return '';
  return formatDateDisplayShort(iso, useHijri) || new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function getLastDays(days: number) {
  return Array.from({ length: days }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (days - 1 - index));
    return date;
  });
}

export default function StudentDashboard() {
  const router = useRouter();
  const { isLoggedIn, role, studentId, currentStudent, logout, isLoading: authLoading } = useAuth();
  const { t, lang, changeLang } = useTranslation();

  const { data: students, updateItem: updateStudent } = useStudents();
  const { data: tasks, loading: tasksLoading, updateItem: updateTask } = useTasks();
  const { data: messages, loading: messagesLoading } = useMessages();

  const {
    data: submittedDocumentsData,
    loading: documentsLoading,
    addItem: addSubmittedDocument,
    updateItem: updateSubmittedDocument,
    deleteItem: deleteSubmittedDocument
  } = useSubmittedDocuments();

  const { data: quizzes } = useQuizzes();
  const { data: quizResults } = useQuizResults();

  const submittedDocuments = (submittedDocumentsData as SubmittedDocumentLike[]) || [];

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('today');
  const [useHijri, setUseHijri] = useState(false);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [changePinCurrent, setChangePinCurrent] = useState('');
  const [changePinNew, setChangePinNew] = useState('');
  const [changePinConfirm, setChangePinConfirm] = useState('');
  const [changePinSubmitting, setChangePinSubmitting] = useState(false);

  useEffect(() => {
    setUseHijri(getUseHijri());
  }, []);

  const toggleDateFormat = () => {
    const next = !useHijri;
    setUseHijri(next);
    setUseHijriPreference(next);
  };

  const student = currentStudent || students.find((s: any) => s.id === studentId);

  useEffect(() => {
    if (!authLoading && (!isLoggedIn || role !== 'student')) {
      router.push('/');
    }
  }, [authLoading, isLoggedIn, role, router]);

  const myTasks = tasks
    .filter((task: any) => task.assignedTo?.includes(studentId))
    .map((task: any) => ({ ...task, type: normalizeTaskType(task.type) }));

  const dailyTasks = myTasks.filter((task: any) => task.type === 'daily');
  const oneTimeTasks = myTasks.filter((task: any) => task.type === 'onetime');

  const today = new Date().toISOString().split('T')[0];

  const isTaskCompletedOnDate = (task: any, dateString: string) => {
    if (!studentId) return false;
    if (task.type === 'daily') {
      return task.completedBy?.[studentId]?.date === dateString;
    }
    return Boolean(task.completedBy?.[studentId]);
  };

  const isCompletedToday = (task: any) => isTaskCompletedOnDate(task, today);

  const unreadMessages = messages.filter(
    (m: any) => m.studentId === studentId && m.sender === 'teacher' && !m.read
  ).length;

  const myDocuments = useMemo(() => {
    return submittedDocuments
      .filter((doc) => String(doc.studentId) === String(studentId))
      .sort((a, b) => new Date(b.uploadedAt || 0).getTime() - new Date(a.uploadedAt || 0).getTime());
  }, [studentId, submittedDocuments]);

  const myQuizResults = useMemo(() => {
    return quizResults.filter((result: any) => String(result.studentId) === String(studentId));
  }, [quizResults, studentId]);

  const examAverage = myQuizResults.length
    ? Math.round(myQuizResults.reduce((sum: number, result: any) => sum + (result.percentage || 0), 0) / myQuizResults.length)
    : 0;

  const passedQuizzes = myQuizResults.filter((result: any) => result.passed).length;

  const getDailyCompletionForDate = (dateString: string) => {
    if (dailyTasks.length === 0) return 0;
    const completed = dailyTasks.filter((task: any) => task.completedBy?.[studentId!]?.date === dateString).length;
    return Math.round((completed / dailyTasks.length) * 100);
  };

  const overviewDates = getLastDays(30);
  const averageCompletion = overviewDates.length
    ? Math.round(overviewDates.reduce((sum, date) => sum + getDailyCompletionForDate(date.toISOString().split('T')[0]), 0) / overviewDates.length)
    : 0;

  const lastSevenDays = getLastDays(7).map((date) => date.toISOString().split('T')[0]);

  const handleTaskToggle = async (task: any) => {
    if (!studentId) return;

    const completedBy = { ...(task.completedBy || {}) };

    if (isCompletedToday(task)) {
      delete completedBy[studentId];
    } else {
      completedBy[studentId] = {
        date: today,
        completedAt: new Date().toISOString()
      };
    }

    await updateTask(task.id, { completedBy });
  };

  const handleDocumentUpload = async (file?: File) => {
    if (!file || !studentId) return;

    setUploadingDocument(true);

    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const path = `documents/${studentId}/${Date.now()}_${safeName}`;
      const fileRef = ref(storage, path);
      await uploadBytes(fileRef, file);
      const fileUrl = await getDownloadURL(fileRef);

      await addSubmittedDocument({
        studentId,
        studentName: student?.name || '',
        fileName: file.name,
        fileType: file.type || '',
        fileSize: file.size,
        fileUrl,
        downloadURL: fileUrl,
        forReview: false,
        markedForReview: false,
        uploadedAt: new Date().toISOString()
      });
    } catch (error) {
      alert(t('upload_failed'));
    } finally {
      setUploadingDocument(false);
    }
  };

  const handleToggleDocumentReview = async (doc: SubmittedDocumentLike, checked: boolean) => {
    await updateSubmittedDocument(doc.id, {
      forReview: checked,
      markedForReview: checked
    });
  };

  const handleRemoveDocument = async (docId: string) => {
    if (!confirm(t('confirm_remove_document'))) {
      return;
    }
    await deleteSubmittedDocument(docId);
  };

  const handleChangePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId || !student) return;
    const currentPin = changePinCurrent.trim();
    const newPin = changePinNew.trim();
    const confirmPin = changePinConfirm.trim();
    if (newPin.length < 4 || newPin.length > 8) {
      alert(t('alert_pin_required') || 'Please enter a 4–8 digit PIN.');
      return;
    }
    if (newPin !== confirmPin) {
      alert(t('alert_pin_mismatch') || 'New PIN and confirmation do not match.');
      return;
    }
    const storedPin = (student.pin ?? '').toString().trim() || '1234';
    if (currentPin !== storedPin) {
      alert(t('alert_wrong_current_pin') || 'Current PIN is incorrect.');
      return;
    }
    setChangePinSubmitting(true);
    try {
      await updateStudent(student.id, {
        pin: newPin,
        pinSetAt: new Date().toISOString(),
        pinSetBy: 'student'
      });
      setChangePinCurrent('');
      setChangePinNew('');
      setChangePinConfirm('');
      alert(t('alert_pin_updated') || 'PIN updated successfully!');
    } catch {
      alert(t('login_error') || 'Failed to update PIN.');
    } finally {
      setChangePinSubmitting(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  const handleSectionChange = (section: string) => {
    setActiveSection(section);
    setSidebarOpen(false);
  };

  if (authLoading) {
    return <div className="loading-state"><i className="fas fa-spinner fa-spin"></i></div>;
  }

  if (!isLoggedIn || role !== 'student') {
    return null;
  }

  const loading = tasksLoading || messagesLoading || documentsLoading;

  return (
    <div className="student-dashboard-container">
      {sidebarOpen && <div className="sidebar-backdrop active" onClick={() => setSidebarOpen(false)}></div>}

      <StudentSidebar
        activeSection={activeSection}
        onSectionChange={handleSectionChange}
        unreadMessages={unreadMessages}
        t={t}
        lang={lang}
        onLangChange={changeLang}
        studentName={student?.name || 'Student'}
        studentEmail={student?.email}
        isOpen={sidebarOpen}
      />

      <main className="student-main-content">
        <header className="student-header">
          <button className="mobile-menu-btn" onClick={toggleSidebar}>
            <i className="fas fa-bars"></i>
          </button>
          <h1 id="studentNameHeader">
            {activeSection === 'today' && `${t('marhaba')}, ${student?.name?.trim() || 'Student'}!`}
            {activeSection === 'tasks' && t('student_nav_tasks')}
            {activeSection === 'exams' && t('student_nav_exams')}
            {activeSection === 'messages' && t('messages')}
            {activeSection === 'documents' && t('student_nav_documents')}
            {activeSection === 'records' && t('tab_records')}
            {activeSection === 'profile' && t('student_nav_profile')}
          </h1>

          <div className="student-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div className="lang-switcher lang-switcher-compact lang-switcher-header" aria-label="Language">
              <button
                type="button"
                className={`lang-btn ${lang === 'en' ? 'active' : ''}`}
                onClick={() => changeLang('en')}
                title="English"
              >
                EN
              </button>
              <button
                type="button"
                className={`lang-btn ${lang === 'bn' ? 'active' : ''}`}
                onClick={() => changeLang('bn')}
                title={t('lang_bengali')}
              >
                {t('lang_short_bn')}
              </button>
            </div>

            <div className="date-format-toggle">
              <button
                type="button"
                className={`date-format-btn ${useHijri ? 'active' : ''}`}
                onClick={toggleDateFormat}
                title="Toggle date format: Hijri (Islamic) / Gregorian"
                aria-label="Toggle date format"
              >
                Date {useHijri ? 'Hijri' : 'Greg'}
              </button>
            </div>

            <a
              href="#"
              className="btn-secondary btn-logout-header"
              onClick={(e) => {
                e.preventDefault();
                handleLogout();
              }}
            >
              <i className="fas fa-sign-out-alt"></i>
              <span>{t('logout')}</span>
            </a>
          </div>
        </header>

        <div className="tab-wrap-student student-content">
          <input type="radio" name="student-tab" id="tab-today" checked={activeSection === 'today'} readOnly />
          <input type="radio" name="student-tab" id="tab-tasks" checked={activeSection === 'tasks'} readOnly />
          <input type="radio" name="student-tab" id="tab-exams" checked={activeSection === 'exams'} readOnly />
          <input type="radio" name="student-tab" id="tab-messages" checked={activeSection === 'messages'} readOnly />
          <input type="radio" name="student-tab" id="tab-documents" checked={activeSection === 'documents'} readOnly />
          <input type="radio" name="student-tab" id="tab-records" checked={activeSection === 'records'} readOnly />
          <input type="radio" name="student-tab" id="tab-profile" checked={activeSection === 'profile'} readOnly />

          <div className="tab-labels-student tab-labels-desktop">
            <label htmlFor="tab-today" className="student-tab-label" onClick={() => handleSectionChange('today')}>
              <i className="fas fa-calendar-day"></i>
              <span>{t('today')}</span>
            </label>
            <label htmlFor="tab-tasks" className="student-tab-label" onClick={() => handleSectionChange('tasks')}>
              <i className="fas fa-clipboard-list"></i>
              <span>{t('tasks')}</span>
            </label>
            <label htmlFor="tab-exams" className="student-tab-label" onClick={() => handleSectionChange('exams')}>
              <i className="fas fa-graduation-cap"></i>
              <span>{t('nav_exams')}</span>
            </label>
            <label htmlFor="tab-messages" className="student-tab-label" onClick={() => handleSectionChange('messages')}>
              <i className="fas fa-comments"></i>
              <span>{t('messages')}</span>
              {unreadMessages > 0 && <span id="msgUnreadDot" className="tab-unread-dot" style={{ display: 'block' }}></span>}
            </label>
            <label htmlFor="tab-documents" className="student-tab-label" onClick={() => handleSectionChange('documents')}>
              <i className="fas fa-file-upload"></i>
              <span>{t('nav_documents')}</span>
            </label>
            <label htmlFor="tab-records" className="student-tab-label" onClick={() => handleSectionChange('records')}>
              <i className="fas fa-history"></i>
              <span>{t('tab_records')}</span>
            </label>
            <label htmlFor="tab-profile" className="student-tab-label" onClick={() => handleSectionChange('profile')}>
              <i className="fas fa-user"></i>
              <span>{t('profile')}</span>
            </label>
          </div>

          <div className="panels-student">
          {activeSection === 'today' && (
            <section className="panel-student panel-today">
              <div className="stat-cards-row">
                <div className="stat-card stat-card-daily">
                  <div className="stat-card-header">
                    <i className="fas fa-calendar-day"></i>
                    <span>{t('tab_daily')}</span>
                  </div>
                  <div className="stat-card-percentage">
                    {dailyTasks.length > 0
                      ? Math.round((dailyTasks.filter((task: any) => isCompletedToday(task)).length / dailyTasks.length) * 100)
                      : 0}%
                  </div>
                  <div className="stat-card-progress">
                    <div
                      className="stat-card-progress-fill daily-fill"
                      style={{
                        width: `${dailyTasks.length > 0
                          ? Math.round((dailyTasks.filter((task: any) => isCompletedToday(task)).length / dailyTasks.length) * 100)
                          : 0}%`
                      }}
                    ></div>
                  </div>
                  <div className="stat-card-detail">
                    <i className="fas fa-check"></i>
                    <span>
                      <strong>{dailyTasks.filter((task: any) => isCompletedToday(task)).length}</strong>/{dailyTasks.length}
                    </span>
                    <span className="stat-label">{t('todays_completion')}</span>
                  </div>
                </div>

                <div className="stat-card stat-card-onetime">
                  <div className="stat-card-header">
                    <i className="fas fa-tasks"></i>
                    <span>{t('category_onetime')}</span>
                  </div>
                  <div className="stat-card-percentage">
                    {oneTimeTasks.length > 0
                      ? Math.round((oneTimeTasks.filter((task: any) => isCompletedToday(task)).length / oneTimeTasks.length) * 100)
                      : 0}%
                  </div>
                  <div className="stat-card-progress">
                    <div
                      className="stat-card-progress-fill onetime-fill"
                      style={{
                        width: `${oneTimeTasks.length > 0
                          ? Math.round((oneTimeTasks.filter((task: any) => isCompletedToday(task)).length / oneTimeTasks.length) * 100)
                          : 0}%`
                      }}
                    ></div>
                  </div>
                  <div className="stat-card-detail">
                    <i className="fas fa-check-double"></i>
                    <span>
                      <strong>{oneTimeTasks.filter((task: any) => isCompletedToday(task)).length}</strong>/{oneTimeTasks.length}
                    </span>
                    <span className="stat-label">{t('overall_completion')}</span>
                  </div>
                </div>

                <div className="stat-card stat-card-exam">
                  <div className="stat-card-header">
                    <i className="fas fa-graduation-cap"></i>
                    <span>{t('nav_exams')}</span>
                  </div>
                  <div className="stat-card-percentage">{examAverage}%</div>
                  <div className="stat-card-progress">
                    <div className="stat-card-progress-fill exam-fill" style={{ width: `${examAverage}%` }}></div>
                  </div>
                  <div className="stat-card-detail">
                    <i className="fas fa-trophy"></i>
                    <span><strong>{passedQuizzes}</strong>/{myQuizResults.length}</span>
                    <span className="stat-label">{t('passed_quizzes')}</span>
                  </div>
                </div>
              </div>

              <div className="overview-compact-card" id="overviewSection">
                <div className="overview-compact-header" id="overviewHeader" role="button" tabIndex={0} aria-label="View full calendar">
                  <i className="fas fa-chart-line"></i>
                  <span>{t('overall_overview')}</span>
                  <span className="overview-since" id="overviewSince">
                    {student?.enrollmentDate ? `${t('since')} ${formatDateDisplay(student.enrollmentDate, {}, useHijri)}` : ''}
                  </span>
                  <span className="overview-avg" id="overviewAvgPct">{averageCompletion}% {t('avg')}</span>
                </div>
                <div className="overview-compact-strip" id="overviewStrip" role="button" tabIndex={0} aria-label="View full calendar">
                  <div className="overview-strip-cells" id="overviewHistoryScroll">
                    {overviewDates.map((date) => {
                      const dateStr = date.toISOString().split('T')[0];
                      const dayNum = date.getDate();
                      const pct = getDailyCompletionForDate(dateStr);
                      const isToday = dateStr === today;
                      const colorClass = pct >= 80 ? 'ov-green' : pct >= 40 ? 'ov-yellow' : 'ov-red';

                      return (
                        <button
                          key={dateStr}
                          className={`overview-cell ${colorClass} ${isToday ? 'today' : ''}`}
                          title={formatDateDisplay(date, {}, useHijri)}
                        >
                          <span className="overview-cell-date">{formatDateDisplayDayOnly(date, useHijri)}</span>
                          <span className="overview-cell-pct">{pct}%</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="tasks-section daily-tasks-section">
                <div className="section-title">
                  <i className="fas fa-calendar-day"></i>
                  <span>{t('todays_daily_tasks')}</span>
                  <span className="today-date" id="todayDate">{formatDateDisplay(new Date(), { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }, useHijri)}</span>
                </div>
                <div className="tasks-list daily-tasks-list">
                  {loading ? (
                    <p className="empty-state">{t('loading')}</p>
                  ) : dailyTasks.length === 0 ? (
                    <p className="empty-state">{t('no_daily_tasks')}</p>
                  ) : (
                    dailyTasks.map((task: any) => (
                      <div
                        key={task.id}
                        className={`task-card ${isCompletedToday(task) ? 'completed' : ''}`}
                        onClick={() => handleTaskToggle(task)}
                      >
                        <div className="task-checkbox">
                          {isCompletedToday(task) ? (
                            <i className="fas fa-check-circle"></i>
                          ) : (
                            <i className="far fa-circle"></i>
                          )}
                        </div>
                        <div className="task-content">
                          <h3>{task.title}</h3>
                          {task.description && <p>{task.description}</p>}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </section>
          )}

          {activeSection === 'tasks' && (
            <section className="panel-student panel-tasks tasks-section">
              <div className="tasks-section" style={{ marginBottom: '2rem' }}>
                <div className="section-title">
                  <i className="fas fa-clipboard-list"></i>
                  <span>{t('pending_tasks')}</span>
                </div>
                {loading ? (
                  <p className="empty-state">{t('loading')}</p>
                ) : (() => {
                  const pending = myTasks.filter((task: any) => !(task.type === 'daily' ? isCompletedToday(task) : (studentId && task.completedBy?.[studentId])));
                  if (pending.length === 0) return <p className="empty-state">{t('no_pending_tasks')}</p>;
                  return (
                    <div className="tasks-list">
                      {pending.map((task: any) => (
                        <div
                          key={task.id}
                          className="task-card"
                          onClick={() => handleTaskToggle(task)}
                        >
                          <div className="task-checkbox">
                            <i className="far fa-circle"></i>
                          </div>
                          <div className="task-content">
                            <h3>{task.title}</h3>
                            {task.description && <p>{task.description}</p>}
                            {task.deadline && (
                              <span className="task-deadline">
                                <i className="fas fa-clock"></i> {task.deadline}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
              <div className="tasks-section">
                <div className="section-title">
                  <i className="fas fa-check-circle"></i>
                  <span>{t('completed_tasks')}</span>
                </div>
                {(() => {
                  const completed = myTasks.filter((task: any) => task.type === 'daily' ? isCompletedToday(task) : (studentId && task.completedBy?.[studentId]));
                  if (completed.length === 0) return <p className="empty-state">{t('no_completed_tasks')}</p>;
                  return (
                    <div className="tasks-list">
                      {completed.map((task: any) => (
                        <div key={task.id} className="task-card completed">
                          <div className="task-checkbox">
                            <i className="fas fa-check-circle"></i>
                          </div>
                          <div className="task-content">
                            <h3>{task.title}</h3>
                            {task.description && <p>{task.description}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </section>
          )}

          {activeSection === 'exams' && (
            <section className="panel-student panel-exams exams-section">
              <div className="tasks-section" style={{ marginBottom: '2rem' }}>
                <div className="section-title">
                  <i className="fas fa-clipboard-check"></i>
                  <span>{t('available_quizzes')}</span>
                </div>
                <div className="quizzes-list-student">
                  {(() => {
                    const completedQuizIds = new Set(myQuizResults.map((r: any) => r.quizId));
                    const available = (quizzes || []).filter((q: any) => q.assignedTo?.includes(studentId) && !completedQuizIds.has(q.id));
                    if (available.length === 0) {
                      return <p className="empty-state">{t('no_available_exams')}</p>;
                    }
                    return available.map((quiz: any) => (
                      <div key={quiz.id} className="quiz-card-student">
                        <div className="quiz-card-student-info">
                          <h4>{quiz.title}</h4>
                          {quiz.subject && <span className="quiz-subject">{quiz.subject}</span>}
                          {quiz.timeLimit && <span><i className="fas fa-clock"></i> {quiz.timeLimit} min</span>}
                        </div>
                        <button type="button" className="btn-primary btn-sm" onClick={() => router.push('/student/exams')}>
                          <i className="fas fa-play"></i> {t('take_exam')}
                        </button>
                      </div>
                    ));
                  })()}
                </div>
              </div>
              <div className="tasks-section">
                <div className="section-title">
                  <i className="fas fa-trophy"></i>
                  <span>{t('completed_quizzes')}</span>
                </div>
                <div className="quizzes-list-student">
                  {myQuizResults.length === 0 ? (
                    <p className="empty-state">{t('no_completed_exams')}</p>
                  ) : (
                    myQuizResults.map((result: any) => {
                      const quiz = (quizzes || []).find((q: any) => q.id === result.quizId);
                      return (
                        <div key={result.id} className={`quiz-card-student result ${result.passed ? 'passed' : 'failed'}`}>
                          <div className="quiz-card-student-info">
                            <h4>{quiz?.title || t('unknown_quiz')}</h4>
                            <span className="result-date">{formatDateDisplay(result.submittedAt, {}, useHijri)}</span>
                          </div>
                          <div className="quiz-score-badge">
                            <span className="percentage">{result.percentage}%</span>
                            <span className="raw">{result.score}/{result.totalMarks}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
              <button className="btn-secondary" onClick={() => router.push('/student/exams')} style={{ marginTop: '1rem' }}>
                <i className="fas fa-external-link-alt"></i> {t('view_all')} {t('exams')}
              </button>
            </section>
          )}

          {activeSection === 'messages' && (
            <section className="panel-student panel-messages">
              <div className="messages-tab-area" id="messagesTabArea">
                <div className="section-title">
                  <i className="fas fa-comments"></i>
                  <span>{t('messages')}</span>
                </div>
                <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>
                  Open full chat to read and send messages.
                </p>
                <div className="messages-tab-input">
                  <input id="messageInputTab" type="text" placeholder="Type a message..." disabled />
                  <button id="messageSendBtnTab" type="button" className="btn-primary" onClick={() => router.push('/student/chat')}>
                    <i className="fas fa-paper-plane"></i> Open Chat
                  </button>
                </div>
              </div>
            </section>
          )}

          {activeSection === 'documents' && (
            <section className="panel-student panel-documents documents-tab-section">
              <div className="section-title">
                <i className="fas fa-file-upload"></i>
                <span>{t('my_documents')}</span>
              </div>
              <p className="documents-hint">{t('documents_hint')}</p>

              <label id="documentUploadArea" className={`document-upload-area ${uploadingDocument ? 'uploading' : ''}`} htmlFor="documentFileInput">
                <input
                  type="file"
                  id="documentFileInput"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif"
                  className="document-file-input-hidden"
                  aria-label="Choose file"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      void handleDocumentUpload(file);
                    }
                    e.currentTarget.value = '';
                  }}
                />
                <span id="documentUploadContent">
                  {uploadingDocument ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i>
                      <p>{t('uploading')}...</p>
                    </>
                  ) : (
                    <>
                      <i className="fas fa-cloud-upload-alt"></i>
                      <p>{t('click_to_upload')}</p>
                      <small>{t('documents_formats')}</small>
                    </>
                  )}
                </span>
              </label>

              {myDocuments.length === 0 ? (
                <div className="documents-empty" id="documentsEmpty">
                  <i className="fas fa-folder-open"></i>
                  <p>{t('no_documents_yet')}</p>
                  <small>{t('upload_first_document')}</small>
                </div>
              ) : (
                <div className="documents-list" id="documentsList">
                  {myDocuments.map((doc) => {
                    const isPdf = (doc.fileType || '').toLowerCase().includes('pdf');
                    const submittedForReview = Boolean(doc.forReview || doc.markedForReview);
                    const fileUrl = doc.fileUrl || doc.downloadURL;

                    return (
                      <div key={doc.id} className="document-item">
                        <div className="document-item-icon">
                          <i className={`fas ${isPdf ? 'fa-file-pdf' : 'fa-file'}`}></i>
                        </div>
                        <div className="document-item-info">
                          <span className="document-item-name">
                            {fileUrl ? (
                              <a href={fileUrl} target="_blank" rel="noreferrer" className="document-review-name-link">
                                {doc.fileName || 'document'}
                              </a>
                            ) : (
                              doc.fileName || 'document'
                            )}
                          </span>
                          <span className="document-item-meta">
                            {formatFileSize(doc.fileSize)} - {formatShortDate(doc.uploadedAt, useHijri)}
                          </span>
                        </div>
                        <label className="document-item-toggle">
                          <input
                            type="checkbox"
                            checked={submittedForReview}
                            onChange={(e) => handleToggleDocumentReview(doc, e.target.checked)}
                          />
                          <span className="toggle-label">{t('submit_for_review')}</span>
                        </label>
                        <button
                          type="button"
                          className="btn-document-remove"
                          onClick={() => handleRemoveDocument(doc.id)}
                          title={t('remove')}
                        >
                          <i className="fas fa-trash-alt"></i>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}
          {activeSection === 'records' && (
            <section className="panel-student panel-records">
              <div className="records-container">
                <div className="records-section">
                  <div className="records-section-title">
                    <i className="fas fa-graduation-cap"></i>
                    <span>{t('exam_history')}</span>
                  </div>

                  {myQuizResults.length === 0 ? (
                    <div className="records-empty">
                      <i className="fas fa-history"></i>
                      <p>{t('no_exam_records')}</p>
                    </div>
                  ) : (
                    <div className="records-exam-list">
                      {myQuizResults
                        .slice()
                        .sort((a: any, b: any) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
                        .map((result: any) => {
                          const quiz = quizzes.find((item: any) => item.id === result.quizId);
                          const status = result.passed ? 'passed' : 'failed';

                          const pendingReview = (result as any).status === 'pending_review';
                          const timeTaken = (result as any).timeTaken;
                          return (
                            <div key={result.id} className="record-exam-item">
                              <div className="record-exam-main">
                                <span className="record-exam-title">{quiz?.title || t('unknown_quiz')}</span>
                                <span className="record-exam-date">{formatShortDate(result.submittedAt, useHijri)}</span>
                              </div>
                              <div className="record-exam-details">
                                {timeTaken != null && (
                                  <span className="record-time">{typeof timeTaken === 'number' ? `${Math.floor(timeTaken / 60)}m ${timeTaken % 60}s` : timeTaken}</span>
                                )}
                                <span className={`record-score ${status}`}>{result.percentage || 0}%</span>
                                <span className={`record-badge ${pendingReview ? 'pending' : status}`}>{pendingReview ? t('pending_review') : (result.passed ? t('passed') : t('failed'))}</span>
                                <span className="record-time">{result.score || 0}/{result.totalMarks || 0}</span>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>

                <div className="records-section">
                  <div className="records-section-title">
                    <i className="fas fa-calendar-day"></i>
                    <span>{t('daily_completion_history')}</span>
                  </div>

                  {dailyTasks.length === 0 ? (
                    <div className="records-empty records-empty-small">
                      <i className="fas fa-calendar-day"></i>
                      <p>{t('no_daily_records')}</p>
                    </div>
                  ) : (
                    <div className="records-daily-grid">
                      {dailyTasks.map((task: any) => (
                        <div key={task.id} className="record-daily-task">
                          <div className="record-daily-title">{task.title}</div>
                          <div className="record-daily-days">
                            {lastSevenDays.map((dateString) => {
                              const completed = task.completedBy?.[studentId!]?.date === dateString;
                              const labelDate = new Date(dateString + 'T12:00:00');
                              const dayName = labelDate.toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-US', { weekday: 'short' }).substring(0, 2);
                              const short = formatDateDisplayShort(labelDate, useHijri);

                              return (
                                <span key={`${task.id}-${dateString}`} className={`record-day ${completed ? 'completed' : ''}`} title={formatDateDisplay(labelDate, {}, useHijri)}>
                                  {dayName} {short}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

          {activeSection === 'profile' && (
            <section className="panel-student panel-profile profile-section">
              <h3 className="profile-section-title">
                <i className="fas fa-user-circle"></i> <span>{t('student_information')}</span>
              </h3>
              {student && (
                <>
                <div className="profile-info-grid profile-info-student">
                  <div className="profile-info-card">
                    <h4><i className="fas fa-id-card"></i> <span>{t('basic_details')}</span></h4>
                    <div className="profile-info-row">
                      <span className="profile-info-label">{t('student_id')}</span>
                      <span className="profile-info-value">{student.studentId}</span>
                    </div>
                    <div className="profile-info-row">
                      <span className="profile-info-label">{t('date_of_birth')}</span>
                      <span className="profile-info-value">{student.dateOfBirth ? formatDateDisplay(student.dateOfBirth, {}, useHijri) : '-'}</span>
                    </div>
                    <div className="profile-info-row">
                      <span className="profile-info-label">{t('year')}</span>
                      <span className="profile-info-value">{student.enrollmentDate ? (() => {
                        const adm = new Date(student.enrollmentDate);
                        const now = new Date();
                        return `Year ${Math.max(1, now.getFullYear() - adm.getFullYear() + 1)}`;
                      })() : '-'}</span>
                    </div>
                    <div className="profile-info-row">
                      <span className="profile-info-label">{t('admission_date')}</span>
                      <span className="profile-info-value">{student.enrollmentDate ? formatDateDisplay(student.enrollmentDate, {}, useHijri) : '-'}</span>
                    </div>
                  </div>
                  <div className="profile-info-card">
                    <h4><i className="fas fa-address-book"></i> <span>{t('contact_details')}</span></h4>
                    <div className="profile-info-row">
                      <span className="profile-info-label">{t('phone')}</span>
                      <span className="profile-info-value">{student.phone || '-'}</span>
                    </div>
                    <div className="profile-info-row">
                      <span className="profile-info-label">{t('email')}</span>
                      <span className="profile-info-value">{student.email || '-'}</span>
                    </div>
                  </div>
                  <div className="profile-info-card">
                    <h4><i className="fas fa-users"></i> <span>{t('parent_guardian_info')}</span></h4>
                    <div className="profile-info-row">
                      <span className="profile-info-label">{t('name')}</span>
                      <span className="profile-info-value">{(student as any).parentName || '-'}</span>
                    </div>
                    <div className="profile-info-row">
                      <span className="profile-info-label">{t('phone')}</span>
                      <span className="profile-info-value">{(student as any).parentPhone || '-'}</span>
                    </div>
                    <div className="profile-info-row">
                      <span className="profile-info-label">{t('email')}</span>
                      <span className="profile-info-value">{(student as any).parentEmail || '-'}</span>
                    </div>
                    <div className="profile-info-row">
                      <span className="profile-info-label">{t('father_work')}</span>
                      <span className="profile-info-value">{(student as any).fatherWork || '-'}</span>
                    </div>
                  </div>
                  <div className="profile-info-card">
                    <h4><i className="fas fa-map-marker-alt"></i> <span>{t('address')}</span></h4>
                    <div className="profile-info-row">
                      <span className="profile-info-label">{t('district')}</span>
                      <span className="profile-info-value">{(student as any).district || '-'}</span>
                    </div>
                    <div className="profile-info-row">
                      <span className="profile-info-label">{t('upazila')}</span>
                      <span className="profile-info-value">{(student as any).upazila || '-'}</span>
                    </div>
                    <div className="profile-info-row">
                      <span className="profile-info-label">{t('detail_address')}</span>
                      <span className="profile-info-value">{student.address || '-'}</span>
                    </div>
                  </div>
                </div>

                {/* Change PIN Section – match old app */}
                <div className="student-profile-section" style={{ marginTop: '1.5rem' }}>
                  <h3 className="profile-section-title">
                    <i className="fas fa-key"></i> <span>{t('change_pin')}</span>
                  </h3>
                  <form className="change-pin-form" onSubmit={handleChangePin}>
                    <div className="form-group">
                      <label htmlFor="changePinCurrent">
                        <span>{t('old_pin')}</span> <span className="required">*</span>
                      </label>
                      <input
                        type="password"
                        id="changePinCurrent"
                        minLength={4}
                        maxLength={8}
                        value={changePinCurrent}
                        onChange={(e) => setChangePinCurrent(e.target.value)}
                        placeholder={t('placeholder_pin')}
                        autoComplete="current-password"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="changePinNew">
                        <span>{t('new_pin')}</span> <span className="required">*</span>
                      </label>
                      <input
                        type="password"
                        id="changePinNew"
                        minLength={4}
                        maxLength={8}
                        value={changePinNew}
                        onChange={(e) => setChangePinNew(e.target.value)}
                        placeholder={t('placeholder_pin')}
                        autoComplete="new-password"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="changePinConfirm">
                        <span>{t('confirm_pin')}</span> <span className="required">*</span>
                      </label>
                      <input
                        type="password"
                        id="changePinConfirm"
                        minLength={4}
                        maxLength={8}
                        value={changePinConfirm}
                        onChange={(e) => setChangePinConfirm(e.target.value)}
                        placeholder={t('placeholder_pin')}
                        autoComplete="new-password"
                        required
                      />
                    </div>
                    <button type="submit" className="btn-primary" disabled={changePinSubmitting}>
                      <i className="fas fa-save"></i> <span>{t('change_pin')}</span>
                    </button>
                  </form>
                </div>
                </>
              )}
            </section>
          )}
        </div>


        </div>
        <div className="student-bottom-nav-wrapper bottom-nav-wrapper">
          <div className="bottom-nav-fade bottom-nav-fade-left" id="studentNavFadeLeft">
            <i className="fas fa-chevron-left"></i>
          </div>
          <nav id="studentBottomNav" className="bottom-nav" aria-label="Student navigation">
            <button
              className={`bottom-nav-item ${activeSection === 'today' ? 'active' : ''}`}
              onClick={() => handleSectionChange('today')}
            >
              <i className="fas fa-calendar-day"></i>
              <span>{t('today')}</span>
            </button>
            <button
              className={`bottom-nav-item ${activeSection === 'tasks' ? 'active' : ''}`}
              onClick={() => handleSectionChange('tasks')}
            >
              <i className="fas fa-clipboard-list"></i>
              <span>{t('tasks')}</span>
            </button>
            <button
              className={`bottom-nav-item ${activeSection === 'exams' ? 'active' : ''}`}
              onClick={() => router.push('/student/exams')}
            >
              <i className="fas fa-graduation-cap"></i>
              <span>{t('exams')}</span>
            </button>
            <button
              className={`bottom-nav-item ${activeSection === 'messages' ? 'active' : ''}`}
              onClick={() => handleSectionChange('messages')}
            >
              <i className="fas fa-comments"></i>
              <span>{t('messages')}</span>
              {unreadMessages > 0 && <span id="msgUnreadDotNav" className="nav-unread-dot" style={{ display: 'block' }}></span>}
            </button>
            <button
              className={`bottom-nav-item ${activeSection === 'documents' ? 'active' : ''}`}
              onClick={() => handleSectionChange('documents')}
            >
              <i className="fas fa-file-upload"></i>
              <span>{t('nav_documents')}</span>
            </button>
            <button
              className={`bottom-nav-item ${activeSection === 'records' ? 'active' : ''}`}
              onClick={() => handleSectionChange('records')}
            >
              <i className="fas fa-history"></i>
              <span>{t('tab_records')}</span>
            </button>
            <button
              className={`bottom-nav-item ${activeSection === 'profile' ? 'active' : ''}`}
              onClick={() => handleSectionChange('profile')}
            >
              <i className="fas fa-user"></i>
              <span>{t('profile')}</span>
            </button>
          </nav>
          <div className="bottom-nav-fade bottom-nav-fade-right" id="studentNavFadeRight">
            <i className="fas fa-chevron-right"></i>
          </div>
        </div>
      </main>
    </div>
  );
}











