'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useMessages, useStudents } from '@/hooks/useFirestore';
import { clearDeviceMode, getDeviceMode, type DeviceMode } from '@/lib/device-mode';
import { Student } from '@/lib/types';

type LandingMessage = {
  id: string;
  studentId?: string;
  sender?: 'teacher' | 'student';
  text?: string;
  message?: string;
  timestamp?: string;
  read?: boolean;
};

// Translation hook (simplified version - we'll enhance later)
const translations: Record<string, Record<string, string>> = {
  en: {
    landing_welcome: 'Welcome to Task Manager',
    landing_subtitle: 'Manage and track student tasks efficiently',
    landing_teacher: 'Teacher',
    landing_teacher_desc: 'Manage tasks and monitor student progress',
    landing_student: 'Student',
    landing_student_desc: 'View and complete your assigned tasks',
    landing_spreadsheet: 'Task Sheet',
    landing_spreadsheet_desc: 'Quick check-in: tap your name, enter PIN, mark tasks',
    landing_select_role: 'Select your role to continue',
    lang_english: 'English',
    lang_bengali: 'বাংলা',
    teacher_login: 'Teacher Login',
    student_login: 'Student Login',
    login_id: 'Login ID',
    pin: 'PIN',
    placeholder_login_id: 'e.g. teacher or waqf-001',
    placeholder_pin: 'Enter your PIN',
    login: 'Login',
    login_invalid_credentials: 'Invalid ID or PIN',
    login_loading: 'Please wait, loading...',
    login_required: 'Please enter ID and PIN',
    new_messages: 'new messages',
    new_message: 'new message',
    login_priority_hint: 'Messages come first after login',
    student_list_title: 'Students with messages',
    student_list_hint: 'Students with unread teacher messages appear first',
    student_select_hint: 'Select a student from the list, then enter PIN',
    student_search: 'Search student name or ID',
    no_students_found: 'No students found',
    no_student_messages: 'No teacher messages yet',
    latest_message: 'Latest',
    login_selected_student: 'Selected student',
    login_with_student_id: 'Student ID or name',
    unread_label: 'Unread',
    unread_from_teacher: 'Unread from teacher',
    teacher_messages_total: 'Teacher messages',
    teacher_messages_waiting: 'student messages waiting',
    student_messages_waiting: 'teacher messages waiting',
    teacher_message_preview: 'Teacher message',
    messages_ready: 'Messages ready',
    teacher_login_hint: 'Teacher messages open first after login',
    teacher_login_waiting_title: 'Teacher inbox status',
    teacher_login_waiting_desc: 'Unread student messages are waiting for review',
    message_priority_teacher: 'Teacher inbox',
    message_priority_student: 'Student inbox',
    no_waiting_messages: 'No waiting messages',
    student_device_title: 'Shared student device',
    teacher_device_title: 'Teacher device',
    student_device_desc: 'This device opens directly to the student list. Each student still signs in with their own PIN.',
    teacher_device_desc: 'This device stays in teacher mode and opens teacher-first every time.',
    change_device_mode: 'Change device mode',
    back_to_role_selection: 'Back to role selection',
    continue_as_teacher: 'Continue as teacher',
    continue_as_student: 'Continue as student',
    remembered_teacher_hint: 'Only teacher login is shown on this device.',
    remembered_student_hint: 'Only student login is shown on this device.',
  },
  bn: {
    landing_welcome: 'মারহাবা - কাজ ম্যানেজার',
    landing_subtitle: 'ছাত্রদের কাজ দক্ষতার সাথে পরিচালনা ও ট্র্যাক করুন',
    landing_teacher: 'শিক্ষক',
    landing_teacher_desc: 'কাজ পরিচালনা ও ছাত্রদের অগ্রগতি মনিটর করুন',
    landing_student: 'ছাত্র',
    landing_student_desc: 'আপনার অ্যাসাইন করা কাজ দেখুন ও সম্পন্ন করুন',
    landing_spreadsheet: 'টাস্ক শীট',
    landing_spreadsheet_desc: 'দ্রুত চেক-ইন: আপনার নাম ট্যাপ করুন, পিন দিন, কাজ চিহ্নিত করুন',
    landing_select_role: 'চালিয়ে যেতে আপনার ভূমিকা নির্বাচন করুন',
    lang_english: 'English',
    lang_bengali: 'বাংলা',
    teacher_login: 'শিক্ষক লগইন',
    student_login: 'ছাত্র লগইন',
    login_id: 'লগইন আইডি',
    pin: 'পিন',
    placeholder_login_id: 'যেমন teacher বা waqf-001',
    placeholder_pin: 'আপনার পিন লিখুন',
    login: 'লগইন',
    login_invalid_credentials: 'আইডি বা পিন ভুল',
    login_loading: 'অনুগ্রহ করে অপেক্ষা করুন...',
    login_required: 'আইডি এবং পিন লিখুন',
    new_messages: 'নতুন মেসেজ',
    new_message: 'নতুন মেসেজ',
    login_priority_hint: 'লগইন করার পর আগে মেসেজ দেখা হবে',
    student_list_title: 'মেসেজ থাকা ছাত্রদের তালিকা',
    student_list_hint: 'যাদের জন্য নতুন মেসেজ আছে তারা উপরে থাকবে',
    student_select_hint: 'তালিকা থেকে ছাত্র নির্বাচন করুন, তারপর পিন দিন',
    student_search: 'ছাত্রের নাম বা আইডি খুঁজুন',
    no_students_found: 'কোনো ছাত্র পাওয়া যায়নি',
    no_student_messages: 'এখনও কোনো শিক্ষক মেসেজ নেই',
    latest_message: 'সর্বশেষ',
    login_selected_student: 'নির্বাচিত ছাত্র',
    login_with_student_id: 'ছাত্রের আইডি বা নাম',
    unread_label: 'অপঠিত',
    unread_from_teacher: 'শিক্ষকের অপঠিত মেসেজ',
    teacher_messages_total: 'শিক্ষকের মোট মেসেজ',
    teacher_messages_waiting: 'ছাত্রের মেসেজ অপেক্ষায় আছে',
    student_messages_waiting: 'শিক্ষকের মেসেজ অপেক্ষায় আছে',
    teacher_message_preview: 'শিক্ষকের মেসেজ',
    messages_ready: 'মেসেজ প্রস্তুত',
    teacher_login_hint: 'লগইন করার পর আগে শিক্ষক মেসেজ খোলা হবে',
    teacher_login_waiting_title: 'শিক্ষকের ইনবক্স অবস্থা',
    teacher_login_waiting_desc: 'ছাত্রদের অপঠিত মেসেজ রিভিউয়ের অপেক্ষায় আছে',
    message_priority_teacher: 'শিক্ষক ইনবক্স',
    message_priority_student: 'ছাত্র ইনবক্স',
    no_waiting_messages: 'এখন কোনো অপেক্ষমান মেসেজ নেই',
    student_device_title: 'শেয়ারড স্টুডেন্ট ডিভাইস',
    teacher_device_title: 'শিক্ষক ডিভাইস',
    student_device_desc: 'এই ডিভাইস সরাসরি ছাত্র তালিকায় যাবে। তবে প্রত্যেক ছাত্র নিজ নিজ পিন দিয়ে আলাদা লগইন করবে।',
    teacher_device_desc: 'এই ডিভাইস শিক্ষক মোডে থাকবে এবং প্রতিবার teacher-first flow খুলবে।',
    change_device_mode: 'ডিভাইস মোড পরিবর্তন করুন',
    back_to_role_selection: 'রোল নির্বাচন পেজে ফিরে যান',
    continue_as_teacher: 'শিক্ষক হিসেবে চালিয়ে যান',
    continue_as_student: 'ছাত্র হিসেবে চালিয়ে যান',
    remembered_teacher_hint: 'এই ডিভাইসে শুধু শিক্ষক লগইনই দেখানো হবে।',
    remembered_student_hint: 'এই ডিভাইসে শুধু ছাত্র লগইনই দেখানো হবে।',
  }
};

function getMessageBody(message: LandingMessage) {
  return (message.text ?? message.message ?? '').toString();
}

export default function LandingPage() {
  const router = useRouter();
  const { loginAsTeacher, loginAsStudent, isLoggedIn, role } = useAuth();
  const { data: students, loading: studentsLoading } = useStudents();
  const { data: messagesData, loading: messagesLoading } = useMessages();
  const studentsReady = !studentsLoading;
  const messages = (messagesData as LandingMessage[]) || [];
  
  const [lang, setLang] = useState<'en' | 'bn'>('en');
  const [showModal, setShowModal] = useState(false);
  const [loginRole, setLoginRole] = useState<'teacher' | 'student'>('teacher');
  const [loginId, setLoginId] = useState('');
  const [loginPin, setLoginPin] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [deviceMode, setRememberedDeviceMode] = useState<DeviceMode>('unset');

  // Translation function
  const t = (key: string) => translations[lang]?.[key] || key;

  // Load saved language
  useEffect(() => {
    const savedLang = localStorage.getItem('waqf_lang');
    if (savedLang === 'bn' || savedLang === 'en') {
      setLang(savedLang);
    }
    setRememberedDeviceMode(getDeviceMode());
  }, []);

  // Save language
  const changeLang = (newLang: 'en' | 'bn') => {
    setLang(newLang);
    localStorage.setItem('waqf_lang', newLang);
  };

  // Redirect if already logged in
  useEffect(() => {
    if (isLoggedIn) {
      if (role === 'teacher') {
        router.push('/teacher/messages');
      } else if (role === 'student') {
        router.push('/student/dashboard?section=messages');
      }
    }
  }, [isLoggedIn, role, router]);

  const teacherUnreadCount = useMemo(
    () => messages.filter((message) => message.sender === 'student' && !message.read).length,
    [messages]
  );

  const studentUnreadCount = useMemo(
    () => messages.filter((message) => message.sender === 'teacher' && !message.read).length,
    [messages]
  );

  const studentMessagingList = useMemo(() => {
    const normalizedQuery = studentSearch.trim().toLowerCase();
    const byStudent = students.map((student: Student) => {
      const studentMessages = messages.filter(
        (message) => String(message.studentId) === String(student.id)
      );
      const teacherMessages = studentMessages.filter((message) => message.sender === 'teacher');
      const unreadTeacherMessages = teacherMessages.filter((message) => !message.read);
      const latestTeacherMessage = teacherMessages.reduce<LandingMessage | null>((latest, current) => {
        const latestTs = latest?.timestamp ? new Date(latest.timestamp).getTime() : 0;
        const currentTs = current.timestamp ? new Date(current.timestamp).getTime() : 0;
        return currentTs > latestTs ? current : latest;
      }, null);
      const latestActivityAt = studentMessages.reduce<number>((latest, current) => {
        const currentTs = current.timestamp ? new Date(current.timestamp).getTime() : 0;
        return Math.max(latest, currentTs);
      }, 0);

      return {
        student,
        unreadCount: unreadTeacherMessages.length,
        teacherMessageCount: teacherMessages.length,
        latestTeacherMessage,
        latestActivityAt
      };
    });

    const filtered = normalizedQuery
      ? byStudent.filter(({ student }) => {
          const name = student.name?.toLowerCase() || '';
          const studentCode = student.studentId?.toLowerCase() || '';
          return name.includes(normalizedQuery) || studentCode.includes(normalizedQuery);
        })
      : byStudent;

    return filtered.sort((a, b) => {
      if (b.unreadCount !== a.unreadCount) return b.unreadCount - a.unreadCount;
      if (b.teacherMessageCount !== a.teacherMessageCount) return b.teacherMessageCount - a.teacherMessageCount;
      if (b.latestActivityAt !== a.latestActivityAt) return b.latestActivityAt - a.latestActivityAt;
      return (a.student.name || '').localeCompare(b.student.name || '');
    });
  }, [messages, studentSearch, students]);

  const selectedStudent = useMemo(
    () => students.find((student: Student) => student.id === selectedStudentId) || null,
    [selectedStudentId, students]
  );

  const openLoginModal = (forRole: 'teacher' | 'student') => {
    setLoginRole(forRole);
    setLoginId('');
    setLoginPin('');
    setLoginError('');
    setStudentSearch('');
    setSelectedStudentId(null);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setLoginError('');
  };

  const resetDeviceMode = () => {
    clearDeviceMode();
    setRememberedDeviceMode('unset');
    setShowModal(false);
    setLoginRole('teacher');
    setLoginId('');
    setLoginPin('');
    setLoginError('');
    setStudentSearch('');
    setSelectedStudentId(null);
  };

  useEffect(() => {
    if (
      showModal &&
      loginRole === 'student' &&
      studentsReady &&
      studentMessagingList.length > 0 &&
      !selectedStudentId &&
      !loginId
    ) {
      const firstStudent = studentMessagingList[0].student;
      setSelectedStudentId(firstStudent.id);
      setLoginId(firstStudent.studentId || firstStudent.name || '');
    }
  }, [showModal, loginRole, studentsReady, studentMessagingList, selectedStudentId, loginId]);

  const getTeacherCardLabel = (count: number) =>
    `${count} ${t('teacher_messages_waiting')}`;

  const getStudentCardLabel = (count: number) =>
    `${count} ${t('student_messages_waiting')}`;

  const getStudentRowStatus = (unreadCount: number) => {
    if (unreadCount > 0) {
      return `${t('unread_from_teacher')} • ${unreadCount}`;
    }
    return '';
  };

  const modalSubtitle =
    loginRole === 'teacher' ? t('teacher_login_hint') : t('login_priority_hint');

  const rememberedModeDescription =
    deviceMode === 'teacher' ? t('teacher_device_desc') : t('student_device_desc');

  const rememberedModeHint =
    deviceMode === 'teacher' ? t('remembered_teacher_hint') : t('remembered_student_hint');

  const handleStudentSelect = (student: Student) => {
    setSelectedStudentId(student.id);
    setLoginId(student.studentId || student.name || '');
    setLoginError('');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!loginId.trim() || !loginPin.trim()) {
      setLoginError(t('login_required'));
      return;
    }

    setIsSubmitting(true);
    setLoginError('');

    try {
      if (loginRole === 'teacher') {
        const success = await loginAsTeacher(loginId, loginPin);
        if (success) {
          router.push('/teacher/messages');
        } else {
          setLoginError(t('login_invalid_credentials'));
        }
      } else {
        // Find student by studentId or by name (trim both so DB spacing doesn't break match)
        const idOrName = loginId.trim().toLowerCase();
        const student = students.find(
          (s: Student) =>
            (s.studentId && s.studentId.trim().toLowerCase() === idOrName) ||
            (s.name && s.name.trim().toLowerCase() === idOrName)
        );

        if (student && loginAsStudent(student, loginPin)) {
          router.push('/student/dashboard?section=messages');
        } else {
          setLoginError(t('login_invalid_credentials'));
        }
      }
    } catch (err) {
      setLoginError(t('login_invalid_credentials'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className={`landing-container ${deviceMode !== 'unset' && !isLoggedIn ? 'landing-container-remembered' : ''}`}>
        <div className="welcome-section">
          <div className="logo-area">
            <i className="fas fa-graduation-cap"></i>
          </div>
          <div className="lang-switcher" aria-label="Language">
            <button 
              type="button" 
              className={`lang-btn ${lang === 'en' ? 'active' : ''}`}
              onClick={() => changeLang('en')}
              title="English"
            >
              <span>{t('lang_english')}</span>
            </button>
            <button 
              type="button" 
              className={`lang-btn ${lang === 'bn' ? 'active' : ''}`}
              onClick={() => changeLang('bn')}
              title="বাংলা"
            >
              <span>{t('lang_bengali')}</span>
            </button>
          </div>
          <h1 className="main-title">{t('landing_welcome')}</h1>
          <p className="subtitle">{t('landing_subtitle')}</p>
          {deviceMode !== 'unset' && !isLoggedIn && (
            <div className="remembered-device-banner">
              <div className="remembered-device-banner-head">
                <i className={`fas ${deviceMode === 'teacher' ? 'fa-chalkboard-teacher' : 'fa-user-graduate'}`}></i>
                <strong>{deviceMode === 'teacher' ? t('teacher_device_title') : t('student_device_title')}</strong>
              </div>
              <p>{rememberedModeDescription}</p>
              <button type="button" className="remembered-device-reset" onClick={resetDeviceMode}>
                {t('back_to_role_selection')}
              </button>
            </div>
          )}
        </div>

        {deviceMode !== 'unset' && !isLoggedIn ? (
        <div className="selection-cards selection-cards-remembered">
          {deviceMode === 'teacher' ? (
            <div
              className="role-card teacher-card role-card-remembered"
              onClick={() => openLoginModal('teacher')}
            >
              {teacherUnreadCount > 0 && (
                <span className="role-card-badge" aria-label={getTeacherCardLabel(teacherUnreadCount)}>
                  {teacherUnreadCount}
                </span>
              )}
              <div className="card-icon">
                <i className="fas fa-chalkboard-teacher"></i>
              </div>
              <h2>{t('continue_as_teacher')}</h2>
              <p>{rememberedModeHint}</p>
              {teacherUnreadCount > 0 && (
                <div className="role-card-meta">
                  <i className="fas fa-bell"></i>
                  <span>{getTeacherCardLabel(teacherUnreadCount)}</span>
                </div>
              )}
              <div className="card-arrow">
                <i className="fas fa-arrow-right"></i>
              </div>
            </div>
          ) : (
            <div
              className="role-card student-card role-card-remembered"
              onClick={() => openLoginModal('student')}
            >
              {studentUnreadCount > 0 && (
                <span className="role-card-badge" aria-label={getStudentCardLabel(studentUnreadCount)}>
                  {studentUnreadCount}
                </span>
              )}
              <div className="card-icon">
                <i className="fas fa-user-graduate"></i>
              </div>
              <h2>{t('continue_as_student')}</h2>
              <p>{rememberedModeHint}</p>
              {studentUnreadCount > 0 && (
                <div className="role-card-meta">
                  <i className="fas fa-bell"></i>
                  <span>{getStudentCardLabel(studentUnreadCount)}</span>
                </div>
              )}
              <div className="card-arrow">
                <i className="fas fa-arrow-right"></i>
              </div>
            </div>
          )}
        </div>
        ) : null}

        {deviceMode === 'unset' && !isLoggedIn ? (
        <div className="selection-cards">
          <div 
            className="role-card teacher-card" 
            onClick={() => openLoginModal('teacher')}
          >
            {teacherUnreadCount > 0 && (
              <span className="role-card-badge" aria-label={getTeacherCardLabel(teacherUnreadCount)}>
                {teacherUnreadCount}
              </span>
            )}
            <div className="card-icon">
              <i className="fas fa-chalkboard-teacher"></i>
            </div>
            <h2>{t('landing_teacher')}</h2>
            <p>{t('landing_teacher_desc')}</p>
            {teacherUnreadCount > 0 && (
              <div className="role-card-meta">
                <i className="fas fa-bell"></i>
                <span>{getTeacherCardLabel(teacherUnreadCount)}</span>
              </div>
            )}
            <div className="card-arrow">
              <i className="fas fa-arrow-right"></i>
            </div>
          </div>

          <div 
            className="role-card student-card" 
            onClick={() => openLoginModal('student')}
          >
            {studentUnreadCount > 0 && (
              <span className="role-card-badge" aria-label={getStudentCardLabel(studentUnreadCount)}>
                {studentUnreadCount}
              </span>
            )}
            <div className="card-icon">
              <i className="fas fa-user-graduate"></i>
            </div>
            <h2>{t('landing_student')}</h2>
            <p>{t('landing_student_desc')}</p>
            {studentUnreadCount > 0 && (
              <div className="role-card-meta">
                <i className="fas fa-bell"></i>
                <span>{getStudentCardLabel(studentUnreadCount)}</span>
              </div>
            )}
            <div className="card-arrow">
              <i className="fas fa-arrow-right"></i>
            </div>
          </div>

          <div 
            className="role-card spreadsheet-card" 
            onClick={() => router.push('/task-sheet')}
          >
            <div className="card-icon">
              <i className="fas fa-table"></i>
            </div>
            <h2>{t('landing_spreadsheet')}</h2>
            <p>{t('landing_spreadsheet_desc')}</p>
            <div className="card-arrow">
              <i className="fas fa-arrow-right"></i>
            </div>
          </div>
        </div>
        ) : null}

        <div className="footer-note">
          <p>{deviceMode === 'unset' ? t('landing_select_role') : rememberedModeHint}</p>
        </div>
      </div>

      {/* Login Modal */}
      {showModal && (
        <div 
          className="login-modal-overlay" 
          style={{ display: 'flex' }}
          onClick={(e) => e.target === e.currentTarget && closeModal()}
        >
          <div className={`login-modal ${loginRole === 'student' ? 'login-modal-student' : ''}`}>
            <button 
              type="button" 
              className="login-modal-close" 
              onClick={closeModal}
              aria-label="Close"
            >
              <i className="fas fa-times"></i>
            </button>
            <h2 className="login-modal-title">
              {loginRole === 'teacher' ? t('teacher_login') : t('student_login')}
            </h2>
            <p className="login-modal-subtitle">{modalSubtitle}</p>

            {loginRole === 'student' ? (
              <div className="student-login-layout">
                <div className="student-login-list-panel">
                  <div className="student-login-list-header">
                    <h3>{t('student_list_title')}</h3>
                    <p>{t('student_list_hint')}</p>
                    {deviceMode === 'student' ? (
                      <button type="button" className="modal-mode-reset" onClick={resetDeviceMode}>
                        {t('change_device_mode')}
                      </button>
                    ) : null}
                  </div>

                  <div className="login-form-group">
                    <input
                      type="text"
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      placeholder={t('student_search')}
                      disabled={!studentsReady}
                    />
                  </div>

                  {!studentsReady || messagesLoading ? (
                    <p className="login-loading-hint" style={{ marginBottom: '0.75rem', color: 'var(--text-muted, #666)' }}>
                      <i className="fas fa-spinner fa-spin" aria-hidden /> {t('login_loading')}
                    </p>
                  ) : studentMessagingList.length === 0 ? (
                    <div className="student-login-empty">
                      <i className="fas fa-user-graduate"></i>
                      <span>{students.length === 0 ? t('no_students_found') : t('no_student_messages')}</span>
                    </div>
                  ) : (
                    <div className="student-login-list">
                      {studentMessagingList.map(({ student, unreadCount, latestTeacherMessage }) => (
                        <button
                          key={student.id}
                          type="button"
                          className={`student-login-row ${selectedStudentId === student.id ? 'active' : ''}`}
                          onClick={() => handleStudentSelect(student)}
                          aria-label={`${student.name} ${student.studentId}.${unreadCount > 0 ? ` ${getStudentRowStatus(unreadCount)}.` : ''}${latestTeacherMessage ? ` ${t('teacher_message_preview')}: ${getMessageBody(latestTeacherMessage)}` : ''}`}
                        >
                          <div className="student-login-row-main">
                            <div className="student-login-row-primary">
                              <span className="student-login-row-name">{student.name}</span>
                              <span className="student-login-row-id">{student.studentId}</span>
                            </div>
                            <div className="student-login-row-status-badges">
                              {unreadCount > 0 ? (
                                <span className="student-login-row-status unread">
                                  {t('unread_label')} {unreadCount}
                                </span>
                              ) : null}
                            </div>
                          </div>
                          {unreadCount > 0 ? (
                            <div className="student-login-row-side">
                              <span className="student-login-row-status-text">{getStudentRowStatus(unreadCount)}</span>
                            </div>
                          ) : null}
                          {latestTeacherMessage ? (
                            <div className="student-login-row-preview">
                              <span className="student-login-row-preview-label">{t('teacher_message_preview')}:</span>
                              <span className="student-login-row-preview-text">{getMessageBody(latestTeacherMessage)}</span>
                            </div>
                          ) : null}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="student-login-form-panel">
                  <form onSubmit={handleLogin}>
                    <p className="student-login-form-hint">{t('student_select_hint')}</p>

                    <div className="login-form-group">
                      <label htmlFor="loginId">
                        <span>{t('login_with_student_id')}</span>
                      </label>
                      <input
                        type="text"
                        id="loginId"
                        value={loginId}
                        onChange={(e) => setLoginId(e.target.value)}
                        autoComplete="username"
                        placeholder={lang === 'bn' ? 'যেমন আপনার নাম বা waqf-001' : 'e.g. your name or waqf-001'}
                        disabled={!studentsReady}
                      />
                    </div>

                    {selectedStudentId ? (
                      <div className="login-selected-student">
                        <span className="login-selected-student-label">{t('login_selected_student')}</span>
                        <strong>
                          {selectedStudent?.name || loginId}
                        </strong>
                        {selectedStudent?.studentId ? (
                          <span className="login-selected-student-id">{selectedStudent.studentId}</span>
                        ) : null}
                      </div>
                    ) : null}

                    <div className="login-form-group">
                      <label htmlFor="loginPin">
                        <span>{t('pin')}</span>
                      </label>
                      <input
                        type="password"
                        id="loginPin"
                        value={loginPin}
                        onChange={(e) => setLoginPin(e.target.value)}
                        autoComplete="current-password"
                        maxLength={8}
                        placeholder={t('placeholder_pin')}
                        disabled={!studentsReady}
                      />
                    </div>

                    {loginError && (
                      <p className="login-error" style={{ display: 'block' }}>
                        {loginError}
                      </p>
                    )}

                    <button
                      type="submit"
                      className="login-submit-btn"
                      disabled={isSubmitting || !studentsReady}
                    >
                      <i className="fas fa-sign-in-alt"></i>
                      <span>{isSubmitting ? t('login_loading') : t('login')}</span>
                    </button>
                  </form>
                </div>
              </div>
            ) : (
              <form onSubmit={handleLogin}>
                {deviceMode === 'teacher' ? (
                  <button type="button" className="modal-mode-reset modal-mode-reset-inline" onClick={resetDeviceMode}>
                    {t('change_device_mode')}
                  </button>
                ) : null}
                <div className="teacher-login-summary">
                  <div className="teacher-login-summary-icon">
                    <i className="fas fa-inbox"></i>
                  </div>
                  <div className="teacher-login-summary-content">
                    <strong>{t('teacher_login_waiting_title')}</strong>
                    <span>
                      {teacherUnreadCount > 0
                        ? `${teacherUnreadCount} ${t('teacher_messages_waiting')}`
                        : t('no_waiting_messages')}
                    </span>
                    <small>{t('teacher_login_waiting_desc')}</small>
                  </div>
                </div>
                <div className="login-form-group">
                  <label htmlFor="loginId">
                    <span>{t('login_id')}</span>
                  </label>
                  <input
                    type="text"
                    id="loginId"
                    value={loginId}
                    onChange={(e) => setLoginId(e.target.value)}
                    autoComplete="username"
                    placeholder={t('placeholder_login_id')}
                  />
                </div>
                <div className="login-form-group">
                  <label htmlFor="loginPin">
                    <span>{t('pin')}</span>
                  </label>
                  <input
                    type="password"
                    id="loginPin"
                    value={loginPin}
                    onChange={(e) => setLoginPin(e.target.value)}
                    autoComplete="current-password"
                    maxLength={8}
                    placeholder={t('placeholder_pin')}
                  />
                </div>
                {loginError && (
                  <p className="login-error" style={{ display: 'block' }}>
                    {loginError}
                  </p>
                )}
                <button
                  type="submit"
                  className="login-submit-btn"
                  disabled={isSubmitting}
                >
                  <i className="fas fa-sign-in-alt"></i>
                  <span>{isSubmitting ? t('login_loading') : t('login')}</span>
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
