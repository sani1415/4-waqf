'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { doc, updateDoc, deleteField } from 'firebase/firestore';
import { useAuth } from '@/lib/auth-context';
import { useStudents, useTasks, useMessages, useQuizResults, useQuizzes } from '@/hooks/useFirestore';
import { useTranslation } from '@/hooks/useTranslation';
import TeacherPageShell from '@/components/teacher/TeacherPageShell';
import { formatDateDisplay, formatDateDisplayDayOnly, getUseHijri } from '@/lib/date-format';
import { db, signInAnonymouslyIfNeeded } from '@/lib/firebase';
import '@/styles/teacher.css';
import '@/styles/teacher-student-detail.css';
interface TeacherNote {
  id: string;
  text: string;
  category?: string;
  createdAt: string;
}

function StudentDetailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [studentId, setStudentId] = useState('');
  const returnSection = searchParams.get('returnSection') || 'students';
  const backUrl = `/teacher/dashboard?section=${returnSection}`;
  
  const { isLoggedIn, role, logout, isLoading: authLoading } = useAuth();
  const { t, lang, changeLang } = useTranslation();
  
  const { data: students, updateItem: updateStudent } = useStudents();
  const { data: tasks, updateItem: updateTask } = useTasks();
  const { data: messages, addItem: addMessage, updateItem: updateMessage, deleteItem: deleteMessage } = useMessages();
  const { data: quizResults, deleteItem: deleteQuizResult } = useQuizResults();
  const { data: quizzes } = useQuizzes();
  
  const [activeTab, setActiveTab] = useState<'profile' | 'tasks' | 'exams' | 'notes' | 'messages'>('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [newNote, setNewNote] = useState('');
  const [noteCategory, setNoteCategory] = useState('general');
  const [tasksTabSelectedDate, setTasksTabSelectedDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [messageInput, setMessageInput] = useState('');
  const [resettingPin, setResettingPin] = useState(false);
  const [resettingData, setResettingData] = useState(false);
  const [showResetDataModal, setShowResetDataModal] = useState(false);
  const [resetDataTasks, setResetDataTasks] = useState(true);
  const [resetDataExams, setResetDataExams] = useState(true);
  const [resetDataMessages, setResetDataMessages] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setStudentId(params.get('id') || '');
  }, []);

  // Get the student
  const student = students.find((s: any) => s.id === studentId);
  const [dateFormatKey, setDateFormatKey] = useState(0);
  useEffect(() => {
    const onFormatChange = () => setDateFormatKey((k) => k + 1);
    window.addEventListener('waqf-date-format-changed', onFormatChange);
    return () => window.removeEventListener('waqf-date-format-changed', onFormatChange);
  }, []);
  const useHijri = getUseHijri();

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
  const passedQuizzes = studentQuizResults.filter((r: any) => r.passed).length;

  // Get quiz name
  const getQuizName = (quizId: string) => {
    const quiz = quizzes.find((q: any) => q.id === quizId);
    return quiz?.title || t('unknown_quiz');
  };

  // Save profile changes
  const handleSaveProfile = async () => {
    if (!student) return;
    const pinVal = (editForm.pin ?? '').toString().trim();
    if (pinVal.length > 0 && (pinVal.length < 4 || pinVal.length > 8)) {
      alert(t('alert_pin_required') || 'Please enter a 4–8 digit PIN.');
      return;
    }
    const payload = { ...editForm };
    if (payload.pin === '' || payload.pin === undefined) payload.pin = student.pin || '1234';
    else payload.pin = pinVal;
    try {
      await updateStudent(studentId, payload);
      setIsEditing(false);
      alert(t('alert_profile_updated'));
    } catch (error) {
      alert(t('alert_profile_update_failed'));
    }
  };

  // Send message from student detail Message tab
  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!messageInput.trim() || !studentId) return;
    await addMessage({
      studentId,
      sender: 'teacher',
      text: messageInput.trim(),
      timestamp: new Date().toISOString(),
      read: false
    });
    setMessageInput('');
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

  /** Reset PIN to default (1234) */
  const handleResetPin = async () => {
    if (!student) return;
    const msg = t('confirm_reset_pin') || 'Reset this student\'s PIN to default (1234)? They will need to use 1234 to log in.';
    if (!confirm(msg)) return;
    setResettingPin(true);
    try {
      await updateStudent(student.id, { pin: '1234', pinSetAt: new Date().toISOString(), pinSetBy: 'teacher' });
      alert(t('alert_pin_reset') || 'PIN reset to 1234.');
    } catch {
      alert(t('login_error') || 'Failed to reset PIN.');
    } finally {
      setResettingPin(false);
    }
  };

  /** Reset selected student data (task completions, exam results, messages - based on checkboxes) */
  const handleResetStudentData = async (options: { tasks: boolean; exams: boolean; messages: boolean }) => {
    if (!student) return;
    const { tasks: doTasks, exams: doExams, messages: doMessages } = options;
    if (!doTasks && !doExams && !doMessages) {
      alert(t('reset_select_at_least_one') || 'Please select at least one option to reset.');
      return;
    }
    const parts: string[] = [];
    if (doTasks) parts.push(t('reset_option_tasks') || 'task completions');
    if (doExams) parts.push(t('reset_option_exams') || 'exam results');
    if (doMessages) parts.push(t('reset_option_messages') || 'messages');
    const msg = (t('confirm_reset_selected') || 'This will reset: {{list}}. Continue?').replace('{{list}}', parts.join(', '));
    if (!confirm(msg)) return;
    setResettingData(true);
    try {
      await signInAnonymouslyIfNeeded();
      if (doTasks) {
        for (const task of tasks) {
          const hasById = task.completedBy?.[student.id];
          const hasByStudentId = student.studentId && task.completedBy?.[student.studentId];
          if (hasById || hasByStudentId) {
            const taskRef = doc(db, 'tasks', task.id);
            const updates: Record<string, unknown> = {};
            if (hasById) updates[`completedBy.${student.id}`] = deleteField();
            if (hasByStudentId && student.studentId !== student.id) updates[`completedBy.${student.studentId}`] = deleteField();
            await updateDoc(taskRef, updates);
          }
        }
      }
      if (doExams) {
        const toDelete = (quizResults as any[]).filter((r: any) => r.studentId === student.id || r.studentId === student.studentId);
        for (const r of toDelete) await deleteQuizResult(r.id);
      }
      if (doMessages) {
        const messagesToDelete = (messages as any[]).filter((m: any) => m.studentId === student.id || m.studentId === student.studentId);
        for (const m of messagesToDelete) await deleteMessage(m.id);
      }
      setShowResetDataModal(false);
      alert(t('alert_student_data_reset') || 'Reset complete.');
    } catch (e) {
      console.error('Reset student data error:', e);
      alert(t('login_error') || 'Something went wrong.');
    } finally {
      setResettingData(false);
    }
  };

  if (authLoading) {
    return <div className="loading-state"><i className="fas fa-spinner fa-spin"></i></div>;
  }

  if (!isLoggedIn || role !== 'teacher') {
    return null;
  }

  const unreadMessages = messages.filter((m: any) => m.sender === 'student' && !m.read).length;

  if (!student) {
    return (
      <TeacherPageShell
        t={t}
        lang={lang}
        onLangChange={changeLang}
        unreadMessages={unreadMessages}
        activeSection="students"
        activeBottom="students"
        showTopBar
        topBarTitle={t('student_details')}
      >
      <div className="detail-container">
        <div className="student-detail-header">
          <div className="student-profile-card">
            <div className="profile-avatar-large">?</div>
            <div className="profile-info">
              <h1>{t('student_not_found')}</h1>
            </div>
          </div>
          <div className="action-buttons">
            <button className="btn-secondary" onClick={() => router.push(backUrl)}>
              <i className="fas fa-arrow-left"></i> <span>{t('back')}</span>
            </button>
          </div>
        </div>
      </div>
      </TeacherPageShell>
    );
  }

  const studentInitial = student.name ? student.name.charAt(0).toUpperCase() : '?';

  return (
      <TeacherPageShell
        t={t}
        lang={lang}
        onLangChange={changeLang}
        unreadMessages={unreadMessages}
        activeSection="students"
        activeBottom="students"
        showTopBar
        topBarTitle={t('student_details')}
      >
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
          <button className="btn-secondary" onClick={() => router.push(backUrl)}>
            <i className="fas fa-arrow-left"></i> <span>{t('back')}</span>
          </button>
          <button className="btn-primary" onClick={() => setIsEditing(true)}>
            <i className="fas fa-edit"></i> <span>{t('edit_profile')}</span>
          </button>
          <button className="btn-primary" onClick={() => router.push(`/teacher/dashboard?section=manage-tasks&createFor=${student.id}`)}>
            <i className="fas fa-plus"></i> <span>{t('assign_task')}</span>
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
                      <div className="form-group">
                        <label>{t('pin')}</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength={8}
                          value={editForm.pin ?? ''}
                          onChange={(e) => setEditForm({ ...editForm, pin: e.target.value.replace(/\D/g, '') })}
                          placeholder={t('default_pin') || '1234 (leave empty to keep current)'}
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
                      <div className="info-row">
                        <span className="info-label">{t('pin')}:</span>
                        <span className="info-value">{(student.pin ?? '').toString().trim() || (t('default_pin') || '1234')}</span>
                      </div>
                      <div className="info-row">
                        <span className="info-label">{t('date_of_birth')}:</span>
                        <span className="info-value">{student.dateOfBirth ? formatDateDisplay(student.dateOfBirth, {}, useHijri) : '-'}</span>
                      </div>
                      <div className="info-row">
                        <span className="info-label">{t('year')}:</span>
                        <span className="info-value">{student.enrollmentDate ? (() => {
                          const adm = new Date(student.enrollmentDate);
                          const now = new Date();
                          const y = Math.max(1, now.getFullYear() - adm.getFullYear() + 1);
                          return `Year ${y}`;
                        })() : '-'}</span>
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
                      <div className="info-row">
                        <span className="info-label">{t('admission_date')}:</span>
                        <span className="info-value">{student.enrollmentDate ? formatDateDisplay(student.enrollmentDate, {}, useHijri) : '-'}</span>
                      </div>
                      {student.enrollmentDate && (
                        <div className="info-row">
                          <span className="info-label">{t('enrolled')}:</span>
                          <span className="info-value">{formatDateDisplay(student.enrollmentDate, {}, useHijri)}</span>
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
                      <div className="info-row">
                        <span className="info-label">{t('email')}:</span>
                        <span className="info-value">{(student as any).parentEmail || '-'}</span>
                      </div>
                      <div className="info-row">
                        <span className="info-label">{t('father_work')}:</span>
                        <span className="info-value">{(student as any).fatherWork || '-'}</span>
                      </div>
                    </div>

                    {/* Address */}
                    <div className="info-card">
                      <h4><i className="fas fa-map-marker-alt"></i> <span>{t('address')}</span></h4>
                      <div className="info-row">
                        <span className="info-label">{t('district')}:</span>
                        <span className="info-value">{(student as any).district || '-'}</span>
                      </div>
                      <div className="info-row">
                        <span className="info-label">{t('upazila')}:</span>
                        <span className="info-value">{(student as any).upazila || '-'}</span>
                      </div>
                      <div className="info-row">
                        <span className="info-label">{t('detail_address')}:</span>
                        <span className="info-value">{student.address || '-'}</span>
                      </div>
                    </div>

                    {/* Enrollment */}
                    {student.enrollmentDate && (
                      <div className="info-card">
                        <h4><i className="fas fa-calendar-check"></i> <span>{t('enrollment_details')}</span></h4>
                        <div className="info-row">
                          <span className="info-label">{t('enrolled')}:</span>
                          <span className="info-value">{new Date(student.enrollmentDate).toLocaleDateString()}</span>
                        </div>
                        <div className="info-row">
                          <span className="info-label">{t('member_since')}:</span>
                          <span className="info-value">{new Date(student.enrollmentDate).toLocaleDateString()}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Reset options (view mode only) */}
              {!isEditing && student && (
                <div className="info-card reset-options-card" style={{ marginTop: '1.5rem' }}>
                  <h4><i className="fas fa-sync-alt"></i> <span>{t('reset_options')}</span></h4>
                  <p className="reset-options-desc">{t('reset_options_desc')}</p>
                  <div className="reset-options-actions">
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={handleResetPin}
                      disabled={resettingPin}
                      title={t('pin_reset')}
                    >
                      {resettingPin ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-key"></i>}
                      <span>{t('reset_pin_to_default')}</span>
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => setShowResetDataModal(true)}
                      disabled={resettingData}
                      title={t('reset_student_data')}
                    >
                      {resettingData ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-eraser"></i>}
                      <span>{t('reset_student_data')}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Reset data modal: choose what to reset */}
              {showResetDataModal && student && (
                <div className="reset-data-modal-overlay" onClick={() => setShowResetDataModal(false)}>
                  <div className="reset-data-modal" onClick={(e) => e.stopPropagation()}>
                    <div className="reset-data-modal-header">
                      <h3>{t('reset_student_data')}</h3>
                      <button type="button" className="reset-data-modal-close" onClick={() => setShowResetDataModal(false)} aria-label="Close">
                        <i className="fas fa-times"></i>
                      </button>
                    </div>
                    <p className="reset-data-modal-desc">{t('reset_data_choose')}</p>
                    <div className="reset-data-options">
                      <label className="reset-data-option">
                        <input
                          type="checkbox"
                          checked={resetDataTasks}
                          onChange={(e) => setResetDataTasks(e.target.checked)}
                        />
                        <span><i className="fas fa-clipboard-check"></i> {t('reset_option_tasks')}</span>
                      </label>
                      <label className="reset-data-option">
                        <input
                          type="checkbox"
                          checked={resetDataExams}
                          onChange={(e) => setResetDataExams(e.target.checked)}
                        />
                        <span><i className="fas fa-graduation-cap"></i> {t('reset_option_exams')}</span>
                      </label>
                      <label className="reset-data-option">
                        <input
                          type="checkbox"
                          checked={resetDataMessages}
                          onChange={(e) => setResetDataMessages(e.target.checked)}
                        />
                        <span><i className="fas fa-comments"></i> {t('reset_option_messages')}</span>
                      </label>
                    </div>
                    <div className="reset-data-modal-actions">
                      <button type="button" className="btn-secondary" onClick={() => setShowResetDataModal(false)}>
                        {t('cancel')}
                      </button>
                      <button
                        type="button"
                        className="btn-primary"
                        disabled={resettingData || (!resetDataTasks && !resetDataExams && !resetDataMessages)}
                        onClick={() => handleResetStudentData({ tasks: resetDataTasks, exams: resetDataExams, messages: resetDataMessages })}
                      >
                        {resettingData ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-eraser"></i>}
                        <span>{t('reset_selected')}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Compact Progress Section – 3 cards with progress bars (match old app) */}
              <div className="compact-progress-section">
                <div className="compact-progress-card daily-card">
                  <div className="compact-progress-header">
                    <i className="fas fa-calendar-day"></i>
                    <span>{t('tab_daily')}</span>
                    <span className="compact-percentage" id="dailyPercentageCompact">
                      {dailyTasks.length > 0 ? Math.round((completedToday / dailyTasks.length) * 100) : 0}%
                    </span>
                  </div>
                  <div className="compact-progress-bar">
                    <div className="compact-progress-fill daily-fill" style={{ width: `${dailyTasks.length > 0 ? Math.round((completedToday / dailyTasks.length) * 100) : 0}%` }}></div>
                  </div>
                  <div className="compact-stats-row">
                    <span><i className="fas fa-check"></i> <strong id="dailyCompletedCompact">{completedToday}</strong>/<span id="dailyTotalCompact">{dailyTasks.length}</span></span>
                    <span className="stat-label">{t('todays_completion')}</span>
                  </div>
                </div>
                <div className="compact-progress-card onetime-card">
                  <div className="compact-progress-header">
                    <i className="fas fa-tasks"></i>
                    <span>{t('category_onetime')}</span>
                    <span className="compact-percentage" id="onetimePercentageCompact">
                      {oneTimeTasks.length > 0 ? Math.round((oneTimeTasks.filter((t: any) => t.completedBy?.[studentId]).length / oneTimeTasks.length) * 100) : 0}%
                    </span>
                  </div>
                  <div className="compact-progress-bar">
                    <div className="compact-progress-fill onetime-fill" style={{ width: `${oneTimeTasks.length > 0 ? Math.round((oneTimeTasks.filter((t: any) => t.completedBy?.[studentId]).length / oneTimeTasks.length) * 100) : 0}%` }}></div>
                  </div>
                  <div className="compact-stats-row">
                    <span><i className="fas fa-check-double"></i> <strong id="onetimeCompletedCompact">{oneTimeTasks.filter((t: any) => t.completedBy?.[studentId]).length}</strong>/<span id="onetimeTotalCompact">{oneTimeTasks.length}</span></span>
                    <span className="stat-label">{t('overall_completion')}</span>
                  </div>
                </div>
                <div className="compact-progress-card quiz-card">
                  <div className="compact-progress-header">
                    <i className="fas fa-graduation-cap"></i>
                    <span>{t('quizzes')}</span>
                    <span className="compact-percentage" id="quizPercentageCompact">{avgScore}%</span>
                  </div>
                  <div className="compact-progress-bar">
                    <div className="compact-progress-fill quiz-fill" id="quizProgressCompact" style={{ width: `${avgScore}%` }}></div>
                  </div>
                  <div className="compact-stats-row">
                    <span><i className="fas fa-trophy"></i> <strong id="quizPassedCompact">{passedQuizzes}</strong>/<span id="quizTotalCompact">{studentQuizResults.length}</span></span>
                    <span className="stat-label">{t('passed_quizzes')}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tasks Tab – matches old app: date header + Daily grid (7 days) + One-time table */}
          {activeTab === 'tasks' && (
            <div className="panel-student-detail panel-tasks" style={{ display: 'block' }}>
              <div className="task-date-header">
                <label className="task-date-picker" htmlFor="tasks-tab-date-picker" style={{ position: 'relative', cursor: 'pointer' }}>
                  <i className="fas fa-calendar-alt"></i>
                  <span className="date-display">
                    {(() => {
                      const d = new Date(tasksTabSelectedDate + 'T12:00:00');
                      const today = new Date();
                      const isToday = tasksTabSelectedDate === today.toISOString().split('T')[0];
                      return formatDateDisplay(d, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }, useHijri) + (isToday ? ` (${t('today')})` : '');
                    })()}
                  </span>
                  <i className="fas fa-chevron-down"></i>
                  <input
                    id="tasks-tab-date-picker"
                    type="date"
                    value={tasksTabSelectedDate}
                    onChange={(e) => setTasksTabSelectedDate(e.target.value)}
                    aria-label="Select date"
                    style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%' }}
                  />
                </label>
                <button type="button" className="btn-primary" onClick={() => router.push(`/teacher/dashboard?section=manage-tasks&createFor=${studentId}`)}>
                  <i className="fas fa-plus"></i> <span>{t('assign_task')}</span>
                </button>
              </div>

              <h3 className="task-section-title">
                <i className="fas fa-sync-alt"></i>
                <span>{t('daily_tasks_completion')}</span>
              </h3>
              <div className="task-grid-wrap">
                <table className="task-grid" id="dailyTasksGrid">
                  <thead>
                    <tr>
                      <th className="task-col">{t('daily_task')}</th>
                      {(() => {
                        const endDate = new Date(tasksTabSelectedDate + 'T12:00:00');
                        const today = new Date();
                        const days: Date[] = [];
                        for (let i = 6; i >= 0; i--) {
                          const d = new Date(endDate);
                          d.setDate(endDate.getDate() - i);
                          days.push(d);
                        }
                        return days.map((date) => {
                          const isToday = date.toDateString() === today.toDateString();
                          return (
                            <th key={date.toISOString()} className={isToday ? 'day-today' : ''}>
                              {formatDateDisplay(date, { weekday: 'short' }, useHijri)} {formatDateDisplayDayOnly(date, useHijri)}
                            </th>
                          );
                        });
                      })()}
                    </tr>
                  </thead>
                  <tbody>
                    {dailyTasks.length === 0 ? (
                      <tr>
                        <td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>
                          {t('no_daily_records')}
                        </td>
                      </tr>
                    ) : (
                      dailyTasks.map((task: any) => {
                        const endDate = new Date(tasksTabSelectedDate + 'T12:00:00');
                        const days: Date[] = [];
                        for (let i = 6; i >= 0; i--) {
                          const d = new Date(endDate);
                          d.setDate(endDate.getDate() - i);
                          days.push(d);
                        }
                        const today = new Date();
                        return (
                          <tr key={task.id}>
                            <td className="task-col">{task.title}</td>
                            {days.map((date) => {
                              const dateStr = date.toISOString().split('T')[0];
                              const isDone = task.completedBy?.[studentId]?.date === dateStr;
                              const isToday = date.toDateString() === today.toDateString();
                              return (
                                <td key={dateStr} className={`${isDone ? 'cell-done' : 'cell-miss'}${isToday ? ' day-today' : ''}`}>
                                  {isDone ? '✓' : '—'}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <h3 className="task-section-title">
                <i className="fas fa-clipboard-list"></i>
                <span>{t('onetime_tasks_progress')}</span>
              </h3>
              <div className="task-grid-wrap">
                <table className="task-grid" id="onetimeTasksGrid">
                  <thead>
                    <tr>
                      <th className="task-col">{t('onetime_task')}</th>
                      <th>{t('assigned')}</th>
                      <th>{t('due_date')}</th>
                      <th>{t('status')}</th>
                      <th>{t('completed')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {oneTimeTasks.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>
                          {t('no_tasks_assigned')}
                        </td>
                      </tr>
                    ) : (
                      oneTimeTasks.map((task: any) => {
                        const isCompleted = !!task.completedBy?.[studentId];
                        const completedEntry = task.completedBy?.[studentId];
                        const completedDate = completedEntry && (typeof completedEntry === 'object' && completedEntry !== null && 'date' in completedEntry)
                          ? (completedEntry as { date?: string }).date
                          : isCompleted ? (task.completedBy?.[studentId] as any)?.completedAt : null;
                        const assignedStr = task.createdAt
                          ? formatDateDisplay(task.createdAt, { month: 'short', day: 'numeric' }, useHijri)
                          : '—';
                        const dueStr = task.deadline
                          ? formatDateDisplay(task.deadline, { month: 'short', day: 'numeric' }, useHijri)
                          : '—';
                        const completedStr = isCompleted
                          ? (completedDate ? `✓ ${formatDateDisplay(completedDate, { month: 'short', day: 'numeric' }, useHijri)}` : '✓')
                          : '—';
                        return (
                          <tr key={task.id}>
                            <td className="task-col">{task.title}</td>
                            <td>{assignedStr}</td>
                            <td>{dueStr}</td>
                            <td>
                              <span style={{ color: isCompleted ? 'var(--success-soft)' : 'var(--text-light)' }}>
                                {isCompleted ? t('legend_completed') : t('pending')}
                              </span>
                            </td>
                            <td className={isCompleted ? 'cell-done' : 'cell-miss'}>{completedStr}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Exams Tab – match old: header + Create Exam button + summary + results list */}
          {activeTab === 'exams' && (
            <div className="panel-student-detail panel-exams" style={{ display: 'block' }}>
              <div className="exams-header">
                <h4><i className="fas fa-chart-line"></i> <span>{t('exam_results_student')}</span></h4>
                <button type="button" className="btn-primary" onClick={() => router.push('/teacher/exams')}>
                  <i className="fas fa-plus"></i> <span>{t('create_exam')}</span>
                </button>
              </div>
              <p className="exams-summary">{t('click_exam_detail')}</p>
              {studentQuizResults.length === 0 ? (
                <p className="empty-state">{t('no_exam_records')}</p>
              ) : (
                <div className="results-list" id="examResultsList">
                  {studentQuizResults.map((result: any) => (
                    <div key={result.id} className={`result-card ${result.passed ? 'passed' : 'failed'}`}>
                      <div className="result-info">
                        <h4>{getQuizName(result.quizId)}</h4>
                        <span className="result-date">
                          {formatDateDisplay(result.submittedAt, {}, useHijri)}
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

          {/* Notes Tab – match old: teacher-notes-section, notes-header + button first, then notes-container */}
          {activeTab === 'notes' && (
            <div className="panel-student-detail panel-notes" style={{ display: 'block' }}>
              <div className="teacher-notes-section">
                <div className="notes-header">
                  <h3 className="notes-title">
                    <i className="fas fa-clipboard"></i> <span>{t('teacher_notes_analysis')}</span>
                  </h3>
                  <div className="add-note-inline">
                    <select value={noteCategory} onChange={(e) => setNoteCategory(e.target.value)} aria-label={t('select_category')}>
                      <option value="general">{t('note_category_general')}</option>
                      <option value="academic">{t('note_category_academic')}</option>
                      <option value="behavior">{t('note_category_behavior')}</option>
                      <option value="parent_communication">{t('note_category_parent')}</option>
                      <option value="achievement">{t('note_category_achievement')}</option>
                    </select>
                    <textarea value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder={t('placeholder_note_text')} rows={2} />
                    <button type="button" className="btn-primary" onClick={handleAddNote} disabled={!newNote.trim()}>
                      <i className="fas fa-plus"></i> <span>{t('add_note')}</span>
                    </button>
                  </div>
                </div>
                <div id="notesList" className="notes-container">
                  {(!student?.notes || student.notes.length === 0) ? (
                    <p className="empty-state">{t('no_data_yet')}</p>
                  ) : (
                    student.notes.map((note: TeacherNote) => (
                      <div key={note.id} className="note-card">
                        <div className="note-header">
                          <span className={`category-badge ${note.category || 'general'}`}>{t(`note_category_${(note.category || 'general').replace('-', '_')}`)}</span>
                          <span className="note-date">{formatDateDisplay(note.createdAt, {}, useHijri)}</span>
                          <button type="button" className="btn-icon danger" onClick={() => handleDeleteNote(note.id)} title={t('delete')}>
                            <i className="fas fa-trash"></i>
                          </button>
                        </div>
                        <p className="note-text">{note.text}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Messages Tab – full in-page chat (match old: message-area + message-input-wrap) */}
          {activeTab === 'messages' && (
            <div className="panel-student-detail panel-message" style={{ display: 'block' }}>
              <div className="message-area" id="messagesArea">
                {studentMessages.length === 0 ? (
                  <p className="empty-state">{t('no_messages_yet')}</p>
                ) : (
                  [...studentMessages].sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()).map((msg: any) => {
                    const isFromTeacher = String(msg.sender || '').toLowerCase() === 'teacher';
                    return (
                      <div key={msg.id} className={`message-item ${isFromTeacher ? 'sent' : 'received'}`}>
                        <span className="sender">{isFromTeacher ? t('you') + ': ' : (student?.name || '') + ': '}</span>
                        <span className="text">{(msg.text ?? msg.message ?? '').toString()}</span>
                        <span className="time">{new Date(msg.timestamp).toLocaleTimeString(lang === 'bn' ? 'bn-BD' : 'en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    );
                  })
                )}
              </div>
              <div className="message-input-wrap">
                <input
                  type="text"
                  id="messageInput"
                  placeholder={t('type_message')}
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                />
                <button type="button" id="messageSendBtn" className="btn-primary" onClick={() => handleSendMessage()}>
                  <i className="fas fa-paper-plane"></i> <span>{t('send')}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
      </TeacherPageShell>
  );
}

export default function StudentDetailPage() {
  return (
    <Suspense fallback={<div className="loading-state"><i className="fas fa-circle-notch fa-spin"></i></div>}>
      <StudentDetailContent />
    </Suspense>
  );
}

