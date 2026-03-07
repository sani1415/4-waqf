'use client';

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

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  return (
    <header className="top-bar">
      <button className="menu-toggle" id="menuToggle" onClick={onMenuToggle}>
        <i className="fas fa-bars"></i>
      </button>
      <h1 className="page-title" id="pageTitle">{title}</h1>
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
            title={t('lang_bengali')}
          >
            {t('lang_short_bn')}
          </button>
        </div>
        <div className="date-format-toggle" aria-hidden="true"></div>
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

