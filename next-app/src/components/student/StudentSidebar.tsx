'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

interface NavItem {
  id: string;
  icon: string;
  label: string;
  href?: string;
  section?: string;
}

interface StudentSidebarProps {
  activeSection?: string;
  onSectionChange?: (section: string) => void;
  unreadMessages?: number;
  t: (key: string) => string;
  lang: 'en' | 'bn';
  onLangChange: (lang: 'en' | 'bn') => void;
  studentName?: string;
  studentEmail?: string;
  isOpen?: boolean;
}

const navItems: NavItem[] = [
  { id: 'today', icon: 'fa-calendar-day', label: 'today', section: 'today' },
  { id: 'tasks', icon: 'fa-clipboard-list', label: 'tasks', section: 'tasks' },
  { id: 'exams', icon: 'fa-graduation-cap', label: 'nav_exams', section: 'exams' },
  { id: 'messages', icon: 'fa-comments', label: 'messages', section: 'messages' },
  { id: 'documents', icon: 'fa-file-upload', label: 'nav_documents', section: 'documents' },
  { id: 'records', icon: 'fa-history', label: 'tab_records', section: 'records' },
  { id: 'profile', icon: 'fa-user', label: 'profile', section: 'profile' },
];

export default function StudentSidebar({
  activeSection = 'today',
  onSectionChange,
  unreadMessages = 0,
  t,
  lang,
  onLangChange,
  studentName = 'Student',
  studentEmail,
  isOpen = false
}: StudentSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { logout } = useAuth();

  const handleNavClick = (item: NavItem) => {
    if (item.href) {
      router.push(item.href);
    } else if (item.section && onSectionChange) {
      onSectionChange(item.section);
    }
  };

  const isActive = (item: NavItem) => {
    if (item.href) {
      return pathname?.startsWith(item.href);
    }
    return item.section === activeSection;
  };

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  return (
    <div className={`student-sidebar ${isOpen ? 'active' : ''}`} id="studentSidebar">
      <div className="student-profile">
        <div className="student-profile-avatar" id="studentAvatar">{studentName.charAt(0).toUpperCase()}</div>
        <h2 id="studentNameSidebar">{studentName}</h2>
        <p id="studentRole">{studentEmail || t('student')}</p>
      </div>
      
      <nav className="student-sidebar-nav" aria-label="Student navigation">
        {navItems.map((item) => (
          <a
            key={item.id}
            href="#"
            className={`student-nav-item ${isActive(item) ? 'active' : ''}`}
            onClick={(e) => {
              e.preventDefault();
              handleNavClick(item);
            }}
          >
            <i className={`fas ${item.icon}`}></i>
            <span>{t(item.label)}</span>
            {item.id === 'messages' && unreadMessages > 0 && (
              <span id="msgUnreadDotSidebar" className="nav-unread-dot-sidebar"></span>
            )}
          </a>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="lang-switcher lang-switcher-sidebar" aria-label="Language">
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
        <a 
          href="#" 
          className="back-btn-sidebar"
          onClick={(e) => {
            e.preventDefault();
            handleLogout();
          }}
        >
          <i className="fas fa-sign-out-alt"></i>
          <span>{t('logout')}</span>
        </a>
      </div>
    </div>
  );
}


