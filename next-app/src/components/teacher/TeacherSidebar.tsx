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

interface TeacherSidebarProps {
  activeSection?: string;
  onSectionChange?: (section: string) => void;
  unreadMessages?: number;
  t: (key: string) => string;
  lang: 'en' | 'bn';
  onLangChange: (lang: 'en' | 'bn') => void;
  isOpen?: boolean;
}

const navItems: NavItem[] = [
  { id: 'dashboard', icon: 'fa-home', label: 'nav_dashboard', section: 'dashboard' },
  { id: 'manage-tasks', icon: 'fa-tasks', label: 'nav_manage_tasks', section: 'manage-tasks' },
  { id: 'students', icon: 'fa-users', label: 'nav_students', section: 'students' },
  { id: 'daily-overview', icon: 'fa-table', label: 'nav_daily_overview', section: 'daily-overview' },
  { id: 'exams', icon: 'fa-graduation-cap', label: 'nav_exams', href: '/teacher/exams' },
  { id: 'messages', icon: 'fa-comments', label: 'nav_messages', href: '/teacher/messages' },
  { id: 'documents', icon: 'fa-file-upload', label: 'documents_for_review', section: 'documents-for-review' },
  { id: 'analytics', icon: 'fa-chart-bar', label: 'nav_analytics', section: 'analytics' },
];

export default function TeacherSidebar({
  activeSection = 'dashboard',
  onSectionChange,
  unreadMessages = 0,
  t,
  lang,
  onLangChange,
  isOpen = false
}: TeacherSidebarProps) {
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
    <div className={`sidebar ${isOpen ? 'active' : ''}`} id="sidebar">
      <div className="sidebar-header">
        <i className="fas fa-graduation-cap"></i>
        <h2>{t('task_manager')}</h2>
      </div>
      
      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <a
            key={item.id}
            href="#"
            className={`nav-item ${isActive(item) ? 'active' : ''}`}
            onClick={(e) => {
              e.preventDefault();
              handleNavClick(item);
            }}
          >
            <i className={`fas ${item.icon}`}></i>
            <span>{t(item.label)}</span>
            {item.id === 'messages' && unreadMessages > 0 && (
              <span className="nav-badge">{unreadMessages}</span>
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
          className="nav-item"
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
