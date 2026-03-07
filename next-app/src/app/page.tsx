'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useStudents } from '@/hooks/useFirestore';
import { Student } from '@/lib/types';

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
  }
};

export default function LandingPage() {
  const router = useRouter();
  const { loginAsTeacher, loginAsStudent, isLoggedIn, role } = useAuth();
  const { data: students, loading: studentsLoading } = useStudents();
  
  const [lang, setLang] = useState<'en' | 'bn'>('en');
  const [showModal, setShowModal] = useState(false);
  const [loginRole, setLoginRole] = useState<'teacher' | 'student'>('teacher');
  const [loginId, setLoginId] = useState('');
  const [loginPin, setLoginPin] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Translation function
  const t = (key: string) => translations[lang]?.[key] || key;

  // Load saved language
  useEffect(() => {
    const savedLang = localStorage.getItem('waqf_lang');
    if (savedLang === 'bn' || savedLang === 'en') {
      setLang(savedLang);
    }
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
        router.push('/teacher/dashboard');
      } else if (role === 'student') {
        router.push('/student/dashboard');
      }
    }
  }, [isLoggedIn, role, router]);

  const openLoginModal = (forRole: 'teacher' | 'student') => {
    setLoginRole(forRole);
    setLoginId('');
    setLoginPin('');
    setLoginError('');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
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
        const success = loginAsTeacher(loginId, loginPin);
        if (success) {
          router.push('/teacher/dashboard');
        } else {
          setLoginError(t('login_invalid_credentials'));
        }
      } else {
        // Find student by studentId
        const student = students.find(
          (s: Student) => s.studentId?.toLowerCase() === loginId.trim().toLowerCase()
        );
        
        if (student && loginAsStudent(student, loginPin)) {
          router.push('/student/dashboard');
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
      <div className="landing-container">
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
        </div>

        <div className="selection-cards">
          <div 
            className="role-card teacher-card" 
            onClick={() => openLoginModal('teacher')}
          >
            <div className="card-icon">
              <i className="fas fa-chalkboard-teacher"></i>
            </div>
            <h2>{t('landing_teacher')}</h2>
            <p>{t('landing_teacher_desc')}</p>
            <div className="card-arrow">
              <i className="fas fa-arrow-right"></i>
            </div>
          </div>

          <div 
            className="role-card student-card" 
            onClick={() => openLoginModal('student')}
          >
            <div className="card-icon">
              <i className="fas fa-user-graduate"></i>
            </div>
            <h2>{t('landing_student')}</h2>
            <p>{t('landing_student_desc')}</p>
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

        <div className="footer-note">
          <p>{t('landing_select_role')}</p>
        </div>
      </div>

      {/* Login Modal */}
      {showModal && (
        <div 
          className="login-modal-overlay" 
          style={{ display: 'flex' }}
          onClick={(e) => e.target === e.currentTarget && closeModal()}
        >
          <div className="login-modal">
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
            <form onSubmit={handleLogin}>
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
          </div>
        </div>
      )}
    </>
  );
}
