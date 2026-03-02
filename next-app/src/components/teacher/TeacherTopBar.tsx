'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

interface TeacherTopBarProps {
  title: string;
  onMenuToggle: () => void;
  t: (key: string) => string;
  lang: 'en' | 'bn';
  onLangChange: (lang: 'en' | 'bn') => void;
}

export default function TeacherTopBar({
  title,
  onMenuToggle,
  t,
  lang,
  onLangChange
}: TeacherTopBarProps) {
  const router = useRouter();
  const { logout } = useAuth();
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

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  return (
    <header className="top-bar">
      <button className="menu-toggle" onClick={onMenuToggle}>
        <i className="fas fa-bars"></i>
      </button>
      <h1 className="page-title">{title}</h1>
      <div className="top-bar-right">
        <div className="lang-switcher lang-switcher-compact lang-switcher-header" aria-label="Language">
          <button 
            type="button" 
            className={`lang-btn ${lang === 'en' ? 'active' : ''}`}
            onClick={() => onLangChange('en')}
            title="English"
          >
            EN
          </button>
          <button 
            type="button" 
            className={`lang-btn ${lang === 'bn' ? 'active' : ''}`}
            onClick={() => onLangChange('bn')}
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
        <div className="user-info user-info-desktop">
          <i className="fas fa-user-circle"></i>
          <span>{t('teacher')}</span>
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
  );
}
