'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useStudents, useTasks, useMessages, useQuizResults, useQuizzes } from '@/hooks/useFirestore';
import { useTranslation } from '@/hooks/useTranslation';
import '@/styles/teacher-student-detail.css';

interface TeacherNote {
  id: string;
  text: string;
  category?: string;
  createdAt: string;
}

export default function StudentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const studentId = params.id as string;
  
  const { isLoggedIn, role, logout, isLoading: authLoading } = useAuth();
  const { t, lang, changeLang } = useTranslation();
  
  const { data: students, updateItem: updateStudent } = useStudents();
  const { data: tasks } = useTasks();
  const { data: messages } = useMessages();
  const { data: quizResults } = useQuizResults();
  const { data: quizzes } = useQuizzes();
  
  const [activeTab, setActiveTab] = useState<'profile' | 'tasks' | 'exams' | 'notes' | 'messages'>('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [newNote, setNewNote] = useState('');
  const [noteCategory, setNoteCategory] = useState('general');

  // Get the student
  const student = students.find((s: any) => s.id === studentId);

  // Redirect if not logged in as teacher
  useEffect(() => {
    if (!authLoading && (!isLoggedIn || role !== 'teacher')) {
      router.push('/');
    }
  }, [isLoggedIn, role, router, authLoading]);

  // Set edit form when student loads
  useEffect(() => {
    if (student) {
      setEditForm(student);
    }
  }, [student]);

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  // Get tasks assigned to this student
  const studentTasks = tasks.filter((task: any) => 
    task.assignedTo?.includes(studentId)
  );

  const dailyTasks = studentTasks.filter((t: any) => t.type === 'daily');
  const oneTimeTasks = studentTasks.filter((t: any) => t.type === 'onetime');

  // Today's completion
  const today = new Date().toISOString().split('T')[0];
  const completedToday = dailyTasks.filter((task: any) => 
    task.completedBy?.[studentId]?.date === today
  ).length;

  // Student messages
  const studentMessages = messages
    .filter((m: any) => m.studentId === studentId)
    .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // Quiz results
  const studentQuizResults = quizResults.filter((r: any) => r.studentId === studentId);
  const avgScore = studentQuizResults.length > 0
    ? Math.round(studentQuizResults.reduce((sum: number, r: any) => sum + (r.percentage || 0), 0) / studentQuizResults.length)
    : 0;

  // Get quiz name
  const getQuizName = (quizId: string) => {
    const quiz = quizzes.find((q: any) => q.id === quizId);
    return quiz?.title || t('unknown_quiz');
  };

  // Save profile changes
  const handleSaveProfile = async () => {
    if (!student) return;
    
    try {
      await updateStudent(studentId, editForm);
      setIsEditing(false);
      alert(t('alert_profile_updated'));
    } catch (error) {
      alert(t('alert_profile_update_failed'));
    }
  };

  // Add note
  const handleAddNote = async () => {
    if (!newNote.trim() || !student) return;
    
    const notes = student.notes || [];
    const newNoteObj: TeacherNote = {
      id: `note_${Date.now()}`,
      text: newNote.trim(),
      category: noteCategory,
      createdAt: new Date().toISOString()
    };
    
    await updateStudent(studentId, { notes: [...notes, newNoteObj] });
    setNewNote('');
  };

  // Delete note
  const handleDeleteNote = async (noteId: string) => {
    if (!student || !confirm(t('confirm_delete_note'))) return;
    
    const notes = (student.notes || []).filter((n: TeacherNote) => n.id !== noteId);
    await updateStudent(studentId, { notes });
  };

  if (authLoading) {
    return <div className="loading-state"><i className="fas fa-spinner fa-spin"></i></div>;
  }

  if (!isLoggedIn || role !== 'teacher') {
    return null;
  }

  if (!student) {
    return (
      <div className="detail-container">
        <div className="student-detail-header">
          <div className="student-profile-card">
            <div className="profile-avatar-large">?</div>
            <div className="profile-info">
              <h1>{t('student_not_found')}</h1>
            </div>
          </div>
          <div className="action-buttons">
            <button className="btn-secondary" onClick={() => router.push('/teacher/dashboard')}>
              <i className="fas fa-arrow-left"></i> <span>{t('back')}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const studentInitial = student.name ? student.name.charAt(0).toUpperCase() : '?';

  return (
    <div className="detail-container">
      {/* Student Profile Header */}
      <div className="student-detail-header">
        <div className="student-profile-card">
          <div className="profile-avatar-large">{studentInitial}</div>
          <div className="profile-info">
            <h1 id="studentName">{student.name}</h1>
            <p id="studentEmail">{student.email || student.studentId}</p>
          </div>
        </div>
        <div className="action-buttons">
          <button className="btn-secondary" onClick={() => router.push('/teacher/dashboard')}>
            <i className="fas fa-arrow-left"></i> <span>{t('back')}</span>
          </button>
          <button className="btn-primary" onClick={() => setIsEditing(true)}>
            <i className="fas fa-edit"></i> <span>{t('edit_profile')}</span>
          </button>
        </div>
      </div>

      {/* Tabbed Interface */}
      <div className="tab-wrap-student-detail">
        {/* Tab Labels */}
        <div className="tab-labels-student-detail">
          <label 
            className={activeTab === 'profile' ? 'active' : ''}
            onClick={() => setActiveTab('profile')}
          >
            <i className="fas fa-user"></i>
            <span>{t('profile')}</span>
          </label>
          <label 
            className={activeTab === 'tasks' ? 'active' : ''}
            onClick={() => setActiveTab('tasks')}
          >
            <i className="fas fa-tasks"></i>
            <span>{t('tasks')}</span>
          </label>
          <label 
            className={activeTab === 'exams' ? 'active' : ''}
            onClick={() => setActiveTab('exams')}
          >
            <i className="fas fa-file-alt"></i>
            <span>{t('nav_exams')}</span>
          </label>
          <label 
            className={activeTab === 'notes' ? 'active' : ''}
            onClick={() => setActiveTab('notes')}
          >
            <i className="fas fa-clipboard"></i>
            <span>{t('notes')}</span>
          </label>
          <label 
            className={activeTab === 'messages' ? 'active' : ''}
            onClick={() => setActiveTab('messages')}
          >
            <i className="fas fa-comments"></i>
            <span>{t('messages')}</span>
          </label>
        </div>

        {/* Tab Panels */}
        <div className="panels-student-detail">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="panel-student-detail panel-profile" style={{ display: 'block' }}>
              <div className="student-profile-info-section">
                <h3 className="profile-section-title">
                  <i className="fas fa-user-circle"></i> <span>{t('student_information')}</span>
                </h3>
                
                {isEditing && (
                  <div className="edit-actions" style={{ marginBottom: '1rem' }}>
                    <button className="btn-secondary" onClick={() => setIsEditing(false)}>
                      {t('btn_cancel')}
                    </button>
                    <button className="btn-primary" onClick={handleSaveProfile}>
                      <i className="fas fa-save"></i> {t('btn_save')}
                    </button>
                  </div>
                )}

                {isEditing ? (
                  <div className="edit-form">
                    <div className="form-row">
                      <div className="form-group">
                        <label>{t('student_name')}</label>
                        <input
                          type="text"
                          value={editForm.name || ''}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label>{t('student_id')}</label>
                        <input
                          type="text"
                          value={editForm.studentId || ''}
                          onChange={(e) => setEditForm({ ...editForm, studentId: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>{t('grade')}</label>
                        <input
                          type="text"
                          value={editForm.grade || ''}
                          onChange={(e) => setEditForm({ ...editForm, grade: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label>{t('section')}</label>
                        <input
                          type="text"
                          value={editForm.section || ''}
                          onChange={(e) => setEditForm({ ...editForm, section: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>{t('phone')}</label>
                        <input
                          type="text"
                          value={editForm.phone || ''}
                          onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label>{t('email')}</label>
                        <input
                          type="email"
                          value={editForm.email || ''}
                          onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>{t('parent_name')}</label>
                        <input
                          type="text"
                          value={editForm.parentName || ''}
                          onChange={(e) => setEditForm({ ...editForm, parentName: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label>{t('parent_phone')}</label>
                        <input
                          type="text"
                          value={editForm.parentPhone || ''}
                          onChange={(e) => setEditForm({ ...editForm, parentPhone: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label>{t('address')}</label>
                      <textarea
                        value={editForm.address || ''}
                        onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                        rows={2}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="profile-info-grid">
                    {/* Basic Information */}
                    <div className="info-card">
                      <h4><i className="fas fa-id-card"></i> <span>{t('basic_details')}</span></h4>
                      <div className="info-row">
                        <span className="info-label">{t('name')}:</span>
                        <span className="info-value">{student.name}</span>
                      </div>
                      <div className="info-row">
                        <span className="info-label">{t('student_id')}:</span>
                        <span className="info-value">{student.studentId}</span>
                      </div>
                      {student.grade && (
                        <div className="info-row">
                          <span className="info-label">{t('grade')}:</span>
                          <span className="info-value">{student.grade}</span>
                        </div>
                      )}
                      {student.section && (
                        <div className="info-row">
                          <span className="info-label">{t('section')}:</span>
                          <span className="info-value">{student.section}</span>
                        </div>
                      )}
                      {student.enrollmentDate && (
                        <div className="info-row">
                          <span className="info-label">{t('enrolled')}:</span>
                          <span className="info-value">{new Date(student.enrollmentDate).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>

                    {/* Contact Information */}
                    <div className="info-card">
                      <h4><i className="fas fa-address-book"></i> <span>{t('contact_details')}</span></h4>
                      <div className="info-row">
                        <span className="info-label">{t('phone')}:</span>
                        <span className="info-value">{student.phone || '-'}</span>
                      </div>
                      <div className="info-row">
                        <span className="info-label">{t('email')}:</span>
                        <span className="info-value">{student.email || '-'}</span>
                      </div>
                    </div>

                    {/* Parent Information */}
                    <div className="info-card">
                      <h4><i className="fas fa-users"></i> <span>{t('parent_guardian_info')}</span></h4>
                      <div className="info-row">
                        <span className="info-label">{t('name')}:</span>
                        <span className="info-value">{student.parentName || '-'}</span>
                      </div>
                      <div className="info-row">
                        <span className="info-label">{t('phone')}:</span>
                        <span className="info-value">{student.parentPhone || '-'}</span>
                      </div>
                    </div>

                    {/* Address */}
                    <div className="info-card">
                      <h4><i className="fas fa-map-marker-alt"></i> <span>{t('address')}</span></h4>
                      <div className="info-row">
                        <span className="info-label">{t('detail_address')}:</span>
                        <span className="info-value">{student.address || '-'}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Compact Progress Section */}
              <div className="compact-progress-section">
                <div className="compact-progress-card daily-card">
                  <div className="compact-progress-header">
                    <i className="fas fa-calendar-day"></i>
                    <span>{t('tab_daily')}</span>
                  </div>
                  <div className="compact-progress-value">{completedToday}/{dailyTasks.length}</div>
                  <div className="compact-progress-label">{t('completed_today')}</div>
                </div>
                <div className="compact-progress-card exam-card">
                  <div className="compact-progress-header">
                    <i className="fas fa-trophy"></i>
                    <span>{t('average_score')}</span>
                  </div>
                  <div className="compact-progress-value">{avgScore}%</div>
                  <div className="compact-progress-label">{studentQuizResults.length} {t('exams_taken')}</div>
                </div>
              </div>
            </div>
          )}

          {/* Tasks Tab */}
          {activeTab === 'tasks' && (
            <div className="panel-student-detail panel-tasks" style={{ display: 'block' }}>
              <div className="tasks-group">
                <h3><i className="fas fa-calendar-day"></i> {t('todays_daily_tasks')}</h3>
                {dailyTasks.length === 0 ? (
                  <p className="empty-state">{t('no_daily_tasks')}</p>
                ) : (
                  <div className="tasks-list">
                    {dailyTasks.map((task: any) => {
                      const isCompleted = task.completedBy?.[studentId]?.date === today;
                      return (
                        <div key={task.id} className={`task-item ${isCompleted ? 'completed' : ''}`}>
                          <div className="task-status">
                            {isCompleted ? (
                              <i className="fas fa-check-circle text-success"></i>
                            ) : (
                              <i className="fas fa-clock text-warning"></i>
                            )}
                          </div>
                          <div className="task-info">
                            <h4>{task.title}</h4>
                            {task.description && <p>{task.description}</p>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="tasks-group">
                <h3><i className="fas fa-clipboard-list"></i> {t('all_onetime_tasks')}</h3>
                {oneTimeTasks.length === 0 ? (
                  <p className="empty-state">{t('no_tasks')}</p>
                ) : (
                  <div className="tasks-list">
                    {oneTimeTasks.map((task: any) => {
                      const isCompleted = !!task.completedBy?.[studentId];
                      return (
                        <div key={task.id} className={`task-item ${isCompleted ? 'completed' : ''}`}>
                          <div className="task-status">
                            {isCompleted ? (
                              <i className="fas fa-check-circle text-success"></i>
                            ) : (
                              <i className="fas fa-circle text-muted"></i>
                            )}
                          </div>
                          <div className="task-info">
                            <h4>{task.title}</h4>
                            {task.description && <p>{task.description}</p>}
                            {task.deadline && (
                              <span className="deadline">
                                <i className="fas fa-calendar"></i> {task.deadline}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Exams Tab */}
          {activeTab === 'exams' && (
            <div className="panel-student-detail panel-exams" style={{ display: 'block' }}>
              <h3>{t('exam_results_student')}</h3>
              {studentQuizResults.length === 0 ? (
                <p className="empty-state">{t('no_exam_records')}</p>
              ) : (
                <div className="results-list">
                  {studentQuizResults.map((result: any) => (
                    <div key={result.id} className={`result-card ${result.passed ? 'passed' : 'failed'}`}>
                      <div className="result-info">
                        <h4>{getQuizName(result.quizId)}</h4>
                        <span className="result-date">
                          {new Date(result.submittedAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="result-score">
                        <span className="percentage">{result.percentage}%</span>
                        <span className="raw">{result.score}/{result.totalMarks}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Notes Tab */}
          {activeTab === 'notes' && (
            <div className="panel-student-detail panel-notes" style={{ display: 'block' }}>
              <div className="add-note-form">
                <h3>{t('add_new_note')}</h3>
                <div className="form-row">
                  <select 
                    value={noteCategory}
                    onChange={(e) => setNoteCategory(e.target.value)}
                  >
                    <option value="general">General</option>
                    <option value="academic">Academic</option>
                    <option value="behavior">Behavior</option>
                    <option value="health">Health</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder={t('placeholder_note_text')}
                  rows={3}
                />
                <button 
                  className="btn-primary"
                  onClick={handleAddNote}
                  disabled={!newNote.trim()}
                >
                  <i className="fas fa-plus"></i> {t('add_note')}
                </button>
              </div>

              <div className="notes-list">
                <h3>{t('teacher_notes_analysis')}</h3>
                {(!student.notes || student.notes.length === 0) ? (
                  <p className="empty-state">{t('no_data_yet')}</p>
                ) : (
                  student.notes.map((note: TeacherNote) => (
                    <div key={note.id} className="note-card">
                      <div className="note-header">
                        <span className={`category-badge ${note.category}`}>
                          {note.category || 'general'}
                        </span>
                        <span className="note-date">
                          {new Date(note.createdAt).toLocaleDateString()}
                        </span>
                        <button 
                          className="btn-icon danger"
                          onClick={() => handleDeleteNote(note.id)}
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      </div>
                      <p className="note-text">{note.text}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Messages Tab */}
          {activeTab === 'messages' && (
            <div className="panel-student-detail panel-message" style={{ display: 'block' }}>
              <div className="section-header">
                <h3>{t('messages')}</h3>
                <button 
                  className="btn-primary"
                  onClick={() => router.push('/teacher/messages')}
                >
                  <i className="fas fa-comment"></i> {t('chat')}
                </button>
              </div>
              
              {studentMessages.length === 0 ? (
                <p className="empty-state">{t('no_messages_yet')}</p>
              ) : (
                <div className="messages-preview">
                  {studentMessages.slice(0, 10).map((msg: any) => (
                    <div key={msg.id} className={`message-item ${msg.sender}`}>
                      <span className="sender">
                        {msg.sender === 'teacher' ? t('you_prefix') : student.name + ': '}
                      </span>
                      <span className="text">{msg.text}</span>
                      <span className="time">
                        {new Date(msg.timestamp).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
