'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useStudents, useTasks, useMessages } from '@/hooks/useFirestore';
import { useTranslation } from '@/hooks/useTranslation';
import StudentSidebar from '@/components/student/StudentSidebar';

export default function StudentDashboard() {
  const router = useRouter();
  const { isLoggedIn, role, studentId, currentStudent, logout, isLoading: authLoading } = useAuth();
  const { t, lang, changeLang } = useTranslation();
  
  const { data: students } = useStudents();
  const { data: tasks, loading: tasksLoading, updateItem: updateTask } = useTasks();
  const { data: messages, loading: messagesLoading } = useMessages();
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('today');
  const [useHijri, setUseHijri] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('useHijri');
    if (stored === 'true') {
      setUseHijri(true);
    }
  }, []);

  const toggleDateFormat = () => {
    const newValue = !useHijri;
    setUseHijri(newValue);
    localStorage.setItem('useHijri', String(newValue));
  };

  // Find current student data
  const student = currentStudent || students.find((s: any) => s.id === studentId);

  // Redirect if not logged in as student
  useEffect(() => {
    if (!authLoading && (!isLoggedIn || role !== 'student')) {
      router.push('/');
    }
  }, [isLoggedIn, role, router, authLoading]);

  // Get tasks assigned to this student
  const myTasks = tasks.filter((task: any) => 
    task.assignedTo?.includes(studentId)
  );

  const dailyTasks = myTasks.filter((t: any) => t.type === 'daily');
  const oneTimeTasks = myTasks.filter((t: any) => t.type === 'onetime');

  // Check if task is completed today
  const today = new Date().toISOString().split('T')[0];
  const isCompletedToday = (task: any) => {
    return task.completedBy?.[studentId!]?.date === today;
  };

  // Unread messages count
  const unreadMessages = messages.filter(
    (m: any) => m.studentId === studentId && m.sender === 'teacher' && !m.read
  ).length;

  // Handle task completion toggle
  const handleTaskToggle = async (task: any) => {
    if (!studentId) return;
    
    const completedBy = { ...(task.completedBy || {}) };
    
    if (isCompletedToday(task)) {
      // Uncomplete
      delete completedBy[studentId];
    } else {
      // Complete
      completedBy[studentId] = {
        date: today,
        completedAt: new Date().toISOString()
      };
    }

    await updateTask(task.id, { completedBy });
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

  const loading = tasksLoading || messagesLoading;

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
            {activeSection === 'today' && `${t('marhaba')}, ${student?.name?.split(' ')[0] || 'Student'}!`}
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
                title="বাংলা"
              >
                বাং
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
                📅 {useHijri ? 'Hijri' : 'Greg'}
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

        <div className="student-content">
          {/* Today Section */}
          {activeSection === 'today' && (
            <section className="panel-today">
              {/* Stat Cards */}
              <div className="stat-cards-row">
                <div className="stat-card stat-card-daily">
                  <div className="stat-card-header">
                    <i className="fas fa-calendar-day"></i>
                    <span>{t('daily_tasks')}</span>
                  </div>
                  <div className="stat-card-percentage">
                    {dailyTasks.length > 0 
                      ? Math.round((dailyTasks.filter(t => isCompletedToday(t)).length / dailyTasks.length) * 100)
                      : 0}%
                  </div>
                  <div className="stat-card-progress">
                    <div 
                      className="stat-card-progress-fill daily-fill" 
                      style={{ 
                        width: `${dailyTasks.length > 0 
                          ? Math.round((dailyTasks.filter(t => isCompletedToday(t)).length / dailyTasks.length) * 100)
                          : 0}%` 
                      }}
                    ></div>
                  </div>
                  <div className="stat-card-detail">
                    <i className="fas fa-check"></i>
                    <span>
                      <strong>{dailyTasks.filter(t => isCompletedToday(t)).length}</strong>/{dailyTasks.length}
                    </span>
                    <span className="stat-label">{t('todays_completion')}</span>
                  </div>
                </div>

                <div className="stat-card stat-card-onetime">
                  <div className="stat-card-header">
                    <i className="fas fa-tasks"></i>
                    <span>{t('one_time_tasks')}</span>
                  </div>
                  <div className="stat-card-percentage">
                    {oneTimeTasks.length > 0 
                      ? Math.round((oneTimeTasks.filter(t => isCompletedToday(t)).length / oneTimeTasks.length) * 100)
                      : 0}%
                  </div>
                  <div className="stat-card-progress">
                    <div 
                      className="stat-card-progress-fill onetime-fill" 
                      style={{ 
                        width: `${oneTimeTasks.length > 0 
                          ? Math.round((oneTimeTasks.filter(t => isCompletedToday(t)).length / oneTimeTasks.length) * 100)
                          : 0}%` 
                      }}
                    ></div>
                  </div>
                  <div className="stat-card-detail">
                    <i className="fas fa-check-double"></i>
                    <span>
                      <strong>{oneTimeTasks.filter(t => isCompletedToday(t)).length}</strong>/{oneTimeTasks.length}
                    </span>
                    <span className="stat-label">{t('overall_completion')}</span>
                  </div>
                </div>

                <div className="stat-card stat-card-exam">
                  <div className="stat-card-header">
                    <i className="fas fa-graduation-cap"></i>
                    <span>{t('exams')}</span>
                  </div>
                  <div className="stat-card-percentage">0%</div>
                  <div className="stat-card-progress">
                    <div className="stat-card-progress-fill exam-fill" style={{ width: '0%' }}></div>
                  </div>
                  <div className="stat-card-detail">
                    <i className="fas fa-trophy"></i>
                    <span><strong>0</strong>/0</span>
                    <span className="stat-label">{t('passed_quizzes')}</span>
                  </div>
                </div>
              </div>

              {/* Overall Overview - date progress strip */}
              <div className="overview-compact-card" id="overviewSection">
                <div className="overview-compact-header" id="overviewHeader" role="button" tabIndex={0} aria-label="View full calendar">
                  <i className="fas fa-chart-line"></i>
                  <span>{t('overall_overview')}</span>
                  <span className="overview-since" id="overviewSince">
                    {student?.enrollmentDate ? `Since ${new Date(student.enrollmentDate).toLocaleDateString()}` : ''}
                  </span>
                  <span className="overview-avg" id="overviewAvgPct">
                    {dailyTasks.length > 0 
                      ? `${Math.round((dailyTasks.filter(t => isCompletedToday(t)).length / dailyTasks.length) * 100)}% avg`
                      : '0% avg'}
                  </span>
                </div>
                <div className="overview-compact-strip" id="overviewStrip" role="button" tabIndex={0} aria-label="View full calendar">
                  <div className="overview-strip-cells" id="overviewHistoryScroll">
                    {/* Generate last 30 days */}
                    {Array.from({ length: 30 }, (_, i) => {
                      const date = new Date();
                      date.setDate(date.getDate() - (29 - i));
                      const dateStr = date.toISOString().split('T')[0];
                      const dayNum = date.getDate();
                      const isToday = dateStr === today;
                      return (
                        <button 
                          key={dateStr}
                          className={`overview-cell ov-red ${isToday ? 'today' : ''}`}
                          title={date.toLocaleDateString()}
                        >
                          <span className="overview-cell-date">{dayNum}</span>
                          <span className="overview-cell-pct">0%</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Today's Daily Tasks */}
              <div className="tasks-section daily-tasks-section">
                <div className="section-title">
                  <i className="fas fa-calendar-day"></i>
                  <span>{t('todays_daily_tasks')}</span>
                  <span className="today-date">{new Date().toLocaleDateString()}</span>
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

          {/* Tasks Section */}
          {activeSection === 'tasks' && (
            <section className="tasks-section">
              {/* Daily Tasks */}
              <div className="tasks-group">
                <h2 className="tasks-group-title">
                  <i className="fas fa-calendar-day"></i> {t('daily_tasks')}
                </h2>
                {loading ? (
                  <p className="empty-state">{t('loading')}</p>
                ) : dailyTasks.length === 0 ? (
                  <p className="empty-state">{t('no_daily_tasks')}</p>
                ) : (
                  <div className="tasks-list">
                    {dailyTasks.map((task: any) => (
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
                    ))}
                  </div>
                )}
              </div>

              {/* One-time Tasks */}
              {oneTimeTasks.length > 0 && (
                <div className="tasks-group">
                  <h2 className="tasks-group-title">
                    <i className="fas fa-clipboard-list"></i> {t('one_time_tasks')}
                  </h2>
                  <div className="tasks-list">
                    {oneTimeTasks.map((task: any) => (
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
                          {task.deadline && (
                            <span className="task-deadline">
                              <i className="fas fa-clock"></i> {task.deadline}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Exams Section */}
          {activeSection === 'exams' && (
            <section className="exams-section">
              <h2><i className="fas fa-graduation-cap"></i> {t('student_nav_exams')}</h2>
              <button 
                className="btn-primary"
                onClick={() => router.push('/student/exams')}
                style={{ marginTop: '1rem' }}
              >
                <i className="fas fa-external-link-alt"></i> {t('view_all')} {t('exams')}
              </button>
            </section>
          )}

          {/* Documents Section */}
          {activeSection === 'documents' && (
            <section className="panel-documents documents-tab-section">
              <div className="section-title">
                <i className="fas fa-file-upload"></i>
                <span>{t('my_documents')}</span>
              </div>
              <p className="documents-hint">{t('documents_hint')}</p>
              <label className="document-upload-area" htmlFor="documentFileInput">
                <input 
                  type="file" 
                  id="documentFileInput" 
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif" 
                  className="document-file-input-hidden" 
                  aria-label="Choose file"
                />
                <span>
                  <i className="fas fa-cloud-upload-alt"></i>
                  <p>{t('click_to_upload')}</p>
                  <small>{t('documents_formats')}</small>
                </span>
              </label>
              <div className="documents-empty">
                <i className="fas fa-folder-open"></i>
                <p>{t('no_documents_yet')}</p>
                <small>{t('upload_first_document')}</small>
              </div>
            </section>
          )}

          {/* Records Section */}
          {activeSection === 'records' && (
            <section className="panel-records">
              <div className="records-tab-area">
                <p className="empty-state">{t('no_records')}</p>
              </div>
            </section>
          )}

          {/* Profile Section */}
          {activeSection === 'profile' && (
            <section className="profile-section">
              <h2><i className="fas fa-user"></i> {t('student_nav_profile')}</h2>
              {student && (
                <div className="profile-card">
                  <div className="profile-avatar">
                    <i className="fas fa-user-graduate"></i>
                  </div>
                  <div className="profile-info">
                    <h3>{student.name}</h3>
                    <p><strong>{t('student_id')}:</strong> {student.studentId}</p>
                    {student.grade && <p><strong>{t('grade')}:</strong> {student.grade}</p>}
                    {student.section && <p><strong>{t('section')}:</strong> {student.section}</p>}
                    {student.phone && <p><strong>{t('phone')}:</strong> {student.phone}</p>}
                    {student.email && <p><strong>{t('email')}:</strong> {student.email}</p>}
                  </div>
                </div>
              )}
            </section>
          )}
        </div>

        {/* Bottom Navigation for Mobile */}
        <div className="student-bottom-nav-wrapper bottom-nav-wrapper">
          <nav className="bottom-nav" aria-label="Student navigation">
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
              onClick={() => router.push('/student/chat')}
            >
              <i className="fas fa-comments"></i>
              <span>{t('messages')}</span>
              {unreadMessages > 0 && <span className="nav-unread-dot" style={{ display: 'block' }}></span>}
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
        </div>
      </main>
    </div>
  );
}
