'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useStudents, useTasks, useMessages } from '@/hooks/useFirestore';
import { useTranslation } from '@/hooks/useTranslation';
import TeacherSidebar from '@/components/teacher/TeacherSidebar';
import TeacherTopBar from '@/components/teacher/TeacherTopBar';

export default function TeacherDashboard() {
  const router = useRouter();
  const { isLoggedIn, role, isLoading: authLoading } = useAuth();
  const { t, lang, changeLang } = useTranslation();
  
  const { data: students, loading: studentsLoading } = useStudents();
  const { data: tasks, loading: tasksLoading } = useTasks();
  const { data: messages, loading: messagesLoading } = useMessages();
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('dashboard');

  // Redirect if not logged in as teacher
  useEffect(() => {
    if (!authLoading && (!isLoggedIn || role !== 'teacher')) {
      router.push('/');
    }
  }, [isLoggedIn, role, router, authLoading]);

  // Calculate stats
  const totalStudents = students.length;
  const totalTasks = tasks.length;
  const unreadMessages = messages.filter((m: any) => m.sender === 'student' && !m.read).length;

  // Calculate today's task completion
  const today = new Date().toISOString().split('T')[0];
  const dailyTasks = tasks.filter((t: any) => t.type === 'daily');
  
  let completedToday = 0;
  let totalDailyAssignments = 0;
  
  dailyTasks.forEach((task: any) => {
    const assignedStudents = task.assignedTo || [];
    totalDailyAssignments += assignedStudents.length;
    
    assignedStudents.forEach((studentId: string) => {
      if (task.completedBy?.[studentId]?.date === today) {
        completedToday++;
      }
    });
  });

  const completionRate = totalDailyAssignments > 0 
    ? Math.round((completedToday / totalDailyAssignments) * 100) 
    : 0;

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  const handleSectionChange = (section: string) => {
    setActiveSection(section);
    setSidebarOpen(false);
  };

  if (authLoading) {
    return <div className="loading-state"><i className="fas fa-spinner fa-spin"></i></div>;
  }

  if (!isLoggedIn || role !== 'teacher') {
    return null;
  }

  const loading = studentsLoading || tasksLoading || messagesLoading;

  return (
    <div className="app-container">
      {sidebarOpen && <div className="sidebar-backdrop active" onClick={() => setSidebarOpen(false)}></div>}
      
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
          title={t('nav_dashboard')}
          onMenuToggle={toggleSidebar}
          t={t}
          lang={lang}
          onLangChange={changeLang}
        />

        <div className="content-area">
          {/* Dashboard Section */}
          {activeSection === 'dashboard' && (
            <section className="dashboard-section">
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-icon" style={{ background: '#e3f2fd' }}>
                    <i className="fas fa-users" style={{ color: '#2196F3' }}></i>
                  </div>
                  <div className="stat-info">
                    <h3>{loading ? '...' : totalStudents}</h3>
                    <p><span className="stat-label-desktop">{t('stat_total_students')}</span><span className="stat-label-mobile">{t('stat_students')}</span></p>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon" style={{ background: '#f3e5f5' }}>
                    <i className="fas fa-tasks" style={{ color: '#9C27B0' }}></i>
                  </div>
                  <div className="stat-info">
                    <h3>{loading ? '...' : totalTasks}</h3>
                    <p><span className="stat-label-desktop">{t('stat_total_tasks')}</span><span className="stat-label-mobile">{t('stat_tasks')}</span></p>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon" style={{ background: '#e8f5e9' }}>
                    <i className="fas fa-check-circle" style={{ color: '#4CAF50' }}></i>
                  </div>
                  <div className="stat-info">
                    <h3>{loading ? '...' : completedToday}</h3>
                    <p><span className="stat-label-desktop">{t('stat_completed_tasks')}</span><span className="stat-label-mobile">{t('stat_done')}</span></p>
                  </div>
                </div>

                <div className="stat-card" onClick={() => router.push('/teacher/messages')} style={{ cursor: 'pointer' }}>
                  <div className="stat-icon" style={{ background: '#fff3e0' }}>
                    <i className="fas fa-clock" style={{ color: '#FF9800' }}></i>
                  </div>
                  <div className="stat-info">
                    <h3>{loading ? '...' : (totalDailyAssignments - completedToday)}</h3>
                    <p><span className="stat-label-desktop">{t('stat_pending_tasks')}</span><span className="stat-label-mobile">{t('stat_pending')}</span></p>
                  </div>
                </div>
              </div>

              <div className="dashboard-content">
                <div className="students-progress">
                  <div className="progress-section-header">
                    <h2 className="section-title">{t('section_students_progress')}</h2>
                    <div className="progress-tabs">
                      <button type="button" className="progress-tab daily active">
                        <i className="fas fa-redo-alt"></i> <span>{t('tab_daily')}</span>
                      </button>
                      <button type="button" className="progress-tab onetime">
                        <i className="fas fa-clipboard-list"></i> <span>{t('tab_onetime')}</span>
                      </button>
                      <button type="button" className="progress-tab spreadsheet">
                        <i className="fas fa-table"></i> <span>{t('tab_spreadsheet')}</span>
                      </button>
                    </div>
                  </div>
                  <div className="progress-view active">
                    <div className="progress-list progress-summary-list">
                      {loading ? (
                        <div className="loading-spinner">
                          <i className="fas fa-circle-notch fa-spin"></i>
                          <span>{t('loading')}</span>
                        </div>
                      ) : students.length === 0 ? (
                        <div className="no-tasks-message">
                          <i className="fas fa-inbox"></i>
                          <h3>{t('no_tasks_yet')}</h3>
                          <p>{t('no_tasks_hint')}</p>
                        </div>
                      ) : (
                        students.map((student: any) => {
                          const studentDailyTasks = dailyTasks.filter((t: any) => 
                            t.assignedTo?.includes(student.id)
                          );
                          const completedCount = studentDailyTasks.filter((t: any) => 
                            t.completedBy?.[student.id]?.date === today
                          ).length;
                          const totalCount = studentDailyTasks.length;
                          const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
                          
                          // Calculate year label based on enrollment date
                          const getYearLabel = () => {
                            if (!student.enrollmentDate) return t('first_year');
                            const enrollDate = new Date(student.enrollmentDate);
                            const now = new Date();
                            const years = Math.floor((now.getTime() - enrollDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)) + 1;
                            const yearKeys = ['', 'first_year', 'second_year', 'third_year', 'fourth_year', 'fifth_year'];
                            return t(yearKeys[Math.min(years, 5)] || 'first_year');
                          };
                          
                          // Badge colors based on percentage
                          const badgeBg = percentage >= 80 ? '#e8f5e9' : percentage >= 50 ? '#fff3e0' : '#ffebee';
                          const badgeColor = percentage >= 80 ? '#2e7d32' : percentage >= 50 ? '#e65100' : '#c62828';
                          const barBg = percentage >= 80 
                            ? 'linear-gradient(90deg, #88B68D, #9DC9A3)' 
                            : 'linear-gradient(90deg, #FF9800, #FFB74D)';
                          
                          return (
                            <div key={student.id} className="student-summary-row" onClick={() => router.push(`/teacher/students/${student.id}`)} style={{ cursor: 'pointer' }}>
                              <div className="student-info">
                                <div className="student-name-row">
                                  <span className="student-name">{student.name}</span>
                                  <span className="student-id-display">{student.studentId}</span>
                                </div>
                                <div className="student-grade">{getYearLabel()} • {completedCount}/{totalCount} tasks</div>
                              </div>
                              <span className="completion-badge" style={{ background: badgeBg, color: badgeColor }}>
                                {percentage}%
                              </span>
                              <div className="progress-bar-container">
                                <div className="progress-bar" style={{ width: `${percentage}%`, background: barBg }}></div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Manage Tasks Section */}
          {activeSection === 'manage-tasks' && (
            <section className="manage-tasks-section">
              <div className="section-header">
                <h2><i className="fas fa-tasks"></i> {t('nav_manage_tasks')}</h2>
                <button className="btn-primary">
                  <i className="fas fa-plus"></i> {t('add_task')}
                </button>
              </div>
              <div className="tasks-list">
                {loading ? (
                  <p className="empty-state">{t('loading')}</p>
                ) : tasks.length === 0 ? (
                  <p className="empty-state">{t('no_tasks')}</p>
                ) : (
                  tasks.map((task: any) => (
                    <div key={task.id} className="task-item">
                      <div className="task-info">
                        <h3>{task.title}</h3>
                        <p>{task.description}</p>
                        <span className={`task-type ${task.type}`}>
                          {task.type === 'daily' ? t('daily') : t('one_time')}
                        </span>
                      </div>
                      <div className="task-actions">
                        <button className="btn-icon" title={t('edit')}>
                          <i className="fas fa-edit"></i>
                        </button>
                        <button className="btn-icon danger" title={t('delete')}>
                          <i className="fas fa-trash"></i>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          )}

          {/* Students Section */}
          {activeSection === 'students' && (
            <section className="students-section">
              <div className="section-header">
                <h2><i className="fas fa-users"></i> {t('nav_students')}</h2>
                <button className="btn-primary">
                  <i className="fas fa-user-plus"></i> {t('add_student')}
                </button>
              </div>
              <div className="students-list">
                {loading ? (
                  <p className="empty-state">{t('loading')}</p>
                ) : students.length === 0 ? (
                  <p className="empty-state">{t('no_students')}</p>
                ) : (
                  students.map((student: any) => (
                    <div key={student.id} className="student-card" onClick={() => router.push(`/teacher/students/${student.id}`)} style={{ cursor: 'pointer' }}>
                      <div className="student-avatar">
                        <i className="fas fa-user-graduate"></i>
                      </div>
                      <div className="student-info">
                        <h3>{student.name}</h3>
                        <p>{student.studentId}</p>
                      </div>
                      <div className="student-actions">
                        <button className="btn-icon" title={t('view_details')} onClick={(e) => { e.stopPropagation(); router.push(`/teacher/students/${student.id}`); }}>
                          <i className="fas fa-eye"></i>
                        </button>
                        <button className="btn-icon" title={t('send_message')} onClick={(e) => { e.stopPropagation(); router.push('/teacher/messages'); }}>
                          <i className="fas fa-comment"></i>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          )}

          {/* Daily Overview Section */}
          {activeSection === 'daily-overview' && (
            <section className="daily-overview-section">
              <div className="section-header">
                <h2><i className="fas fa-table"></i> {t('nav_daily_overview')}</h2>
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
                        {dailyTasks.map((task: any) => (
                          <th key={task.id}>{task.title}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((student: any) => (
                        <tr key={student.id}>
                          <td>{student.name}</td>
                          {dailyTasks.map((task: any) => {
                            const isAssigned = task.assignedTo?.includes(student.id);
                            const isCompleted = task.completedBy?.[student.id]?.date === today;
                            return (
                              <td key={task.id} className="status-cell">
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
            </section>
          )}

          {/* Documents for Review Section */}
          {activeSection === 'documents-for-review' && (
            <section className="documents-section">
              <div className="section-header">
                <h2><i className="fas fa-file-upload"></i> {t('documents_for_review')}</h2>
              </div>
              <p className="empty-state">{t('no_documents')}</p>
            </section>
          )}

          {/* Analytics Section */}
          {activeSection === 'analytics' && (
            <section className="analytics-section">
              <div className="section-header">
                <h2><i className="fas fa-chart-bar"></i> {t('nav_analytics')}</h2>
              </div>
              <p className="empty-state">{t('analytics_coming_soon')}</p>
            </section>
          )}
        </div>
      </main>

      {/* Bottom Navigation for Mobile */}
      <div className="bottom-nav-wrapper">
        <nav className="bottom-nav" aria-label="Main navigation">
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
            {unreadMessages > 0 && (
              <span className="bottom-nav-badge">{unreadMessages}</span>
            )}
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
        </nav>
      </div>
    </div>
  );
}
