'use client';

import { ReactNode, useState } from 'react';
import { useRouter } from 'next/navigation';
import TeacherSidebar from '@/components/teacher/TeacherSidebar';
import TeacherTopBar from '@/components/teacher/TeacherTopBar';

type BottomItem = 'dashboard' | 'tasks' | 'students' | 'messages' | 'overview' | 'exams';

interface TeacherPageShellProps {
  children: ReactNode;
  t: (key: string) => string;
  lang: 'en' | 'bn';
  onLangChange: (lang: 'en' | 'bn') => void;
  unreadMessages?: number;
  activeSection?: string;
  activeBottom?: BottomItem;
  showTopBar?: boolean;
  topBarTitle?: string;
}

export default function TeacherPageShell({
  children,
  t,
  lang,
  onLangChange,
  unreadMessages = 0,
  activeSection = 'dashboard',
  activeBottom,
  showTopBar = false,
  topBarTitle
}: TeacherPageShellProps) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => setSidebarOpen((prev) => !prev);

  const handleSectionChange = (section: string) => {
    router.push(`/teacher/dashboard?section=${section}`);
    setSidebarOpen(false);
  };

  const isBottomActive = (item: BottomItem) => activeBottom === item;

  return (
    <div className="app-container teacher-page">
      {sidebarOpen && <div className="sidebar-backdrop active" onClick={() => setSidebarOpen(false)}></div>}

      <TeacherSidebar
        activeSection={activeSection}
        onSectionChange={handleSectionChange}
        unreadMessages={unreadMessages}
        t={t}
        lang={lang}
        onLangChange={onLangChange}
        isOpen={sidebarOpen}
      />

      <main className="main-content">
        {showTopBar ? (
          <TeacherTopBar
            title={topBarTitle || t('nav_dashboard')}
            onMenuToggle={toggleSidebar}
            t={t}
            lang={lang}
            onLangChange={onLangChange}
          />
        ) : null}

        {children}
      </main>

      <div className="bottom-nav-wrapper">
        <div className="bottom-nav-fade bottom-nav-fade-left" id="bottomNavFadeLeft" aria-hidden="true"><i className="fas fa-chevron-left"></i></div>
        <nav className="bottom-nav" id="bottomNav" aria-label="Main navigation">
          <a href="#" className={`bottom-nav-item ${isBottomActive('dashboard') ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); router.push('/teacher/dashboard'); }} title="Dashboard">
            <i className="fas fa-home"></i>
            <span>{t('nav_dashboard')}</span>
          </a>
          <a href="#" className={`bottom-nav-item ${isBottomActive('tasks') ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); router.push('/teacher/dashboard?section=manage-tasks'); }} title="Tasks">
            <i className="fas fa-tasks"></i>
            <span>{t('stat_tasks')}</span>
          </a>
          <a href="#" className={`bottom-nav-item ${isBottomActive('students') ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); router.push('/teacher/dashboard?section=students'); }} title="Students">
            <i className="fas fa-users"></i>
            <span>{t('nav_students')}</span>
          </a>
          <a href="#" className={`bottom-nav-item bottom-nav-item-msg ${isBottomActive('messages') ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); router.push('/teacher/messages'); }} title="Messages">
            <i className="fas fa-comments"></i>
            <span>{t('nav_messages')}</span>
            {unreadMessages > 0 && <span id="messagesUnreadBadgeNav" className="bottom-nav-badge">{unreadMessages}</span>}
          </a>
          <a href="#" className={`bottom-nav-item ${isBottomActive('overview') ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); router.push('/teacher/dashboard?section=daily-overview'); }} title="Overview">
            <i className="fas fa-table"></i>
            <span>{t('nav_overview')}</span>
          </a>
          <a href="#" className={`bottom-nav-item ${isBottomActive('exams') ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); router.push('/teacher/exams'); }} title="Exams">
            <i className="fas fa-graduation-cap"></i>
            <span>{t('nav_exams')}</span>
          </a>
          <a href="#" className="bottom-nav-item bottom-nav-menu" id="bottomNavMenu" onClick={(e) => { e.preventDefault(); setSidebarOpen(true); }} title="Menu">
            <i className="fas fa-ellipsis-v"></i>
            <span>{t('nav_menu')}</span>
          </a>
        </nav>
        <div className="bottom-nav-fade bottom-nav-fade-right" id="bottomNavFadeRight" aria-hidden="true"><i className="fas fa-chevron-right"></i></div>
      </div>
    </div>
  );
}
