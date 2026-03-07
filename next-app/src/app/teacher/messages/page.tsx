'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useStudents, useMessages } from '@/hooks/useFirestore';
import { useTranslation } from '@/hooks/useTranslation';
import TeacherSidebar from '@/components/teacher/TeacherSidebar';
import TeacherTopBar from '@/components/teacher/TeacherTopBar';
import { formatDateDisplay, getUseHijri } from '@/lib/date-format';
import '@/styles/teacher.css';
import '@/styles/messaging.css';
export default function TeacherMessages() {
  const router = useRouter();
  const { isLoggedIn, role, isLoading: authLoading } = useAuth();
  const { t, lang, changeLang } = useTranslation();

  const { data: students, loading: studentsLoading } = useStudents();
  const { data: messages, addItem: addMessage, updateItem: updateMessage } = useMessages();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authLoading && (!isLoggedIn || role !== 'teacher')) {
      router.push('/');
    }
  }, [isLoggedIn, role, router, authLoading]);

  const selectedStudent = students.find((s: any) => s.id === selectedStudentId);

  const studentMessages = messages
    .filter((m: any) => m.studentId === selectedStudentId)
    .sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const getUnreadCount = (studentId: string) => {
    return messages.filter(
      (m: any) => m.studentId === studentId && m.sender === 'student' && !m.read
    ).length;
  };

  const unreadMessages = messages.filter((m: any) => m.sender === 'student' && !m.read).length;

  /** Message body: new app uses "text", old app uses "message" */
  const getMessageBody = (msg: any) => (msg?.text ?? msg?.message ?? '').toString();

  const filteredStudents = students.filter((s: any) =>
    s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.studentId?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sortedStudents = [...filteredStudents].sort((a: any, b: any) => {
    const aUnread = getUnreadCount(a.id);
    const bUnread = getUnreadCount(b.id);
    if (aUnread !== bUnread) return bUnread - aUnread;

    const aLastMsg = messages.filter((m: any) => m.studentId === a.id).slice(-1)[0];
    const bLastMsg = messages.filter((m: any) => m.studentId === b.id).slice(-1)[0];
    if (!aLastMsg) return 1;
    if (!bLastMsg) return -1;
    return new Date(bLastMsg.timestamp).getTime() - new Date(aLastMsg.timestamp).getTime();
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [studentMessages]);

  useEffect(() => {
    if (selectedStudentId) {
      messages
        .filter((m: any) => m.studentId === selectedStudentId && m.sender === 'student' && !m.read)
        .forEach((m: any) => {
          updateMessage(m.id, { read: true });
        });
    }
  }, [selectedStudentId, messages, updateMessage]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedStudentId) return;

    await addMessage({
      studentId: selectedStudentId,
      sender: 'teacher',
      text: newMessage.trim(),
      timestamp: new Date().toISOString(),
      read: false
    });

    setNewMessage('');
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString(lang === 'bn' ? 'bn-BD' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const [dateFormatKey, setDateFormatKey] = useState(0);
  useEffect(() => {
    const onFormatChange = () => setDateFormatKey((k) => k + 1);
    window.addEventListener('waqf-date-format-changed', onFormatChange);
    return () => window.removeEventListener('waqf-date-format-changed', onFormatChange);
  }, []);
  const useHijri = getUseHijri();
  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return t('today');
    }
    if (date.toDateString() === yesterday.toDateString()) {
      return t('yesterday');
    }
    return formatDateDisplay(date, { month: 'short', day: 'numeric', locale: lang === 'bn' ? 'bn' : 'en' }, useHijri);
  };

  /** Match old app: for list item last-message time – today = time, yesterday = Yesterday, <7 days = weekday, else = date */
  const formatTimeForList = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays === 0) {
      return date.toLocaleTimeString(lang === 'bn' ? 'bn-BD' : 'en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    }
    if (diffDays === 1) return t('yesterday');
    if (diffDays < 7) {
      return formatDateDisplay(date, { weekday: 'short', locale: lang === 'bn' ? 'bn' : 'en' }, useHijri);
    }
    return formatDateDisplay(date, { month: 'short', day: 'numeric', locale: lang === 'bn' ? 'bn' : 'en' }, useHijri);
  };

  const toggleSidebar = () => setSidebarOpen((prev) => !prev);

  const handleSectionChange = (section: string) => {
    router.push(`/teacher/dashboard?section=${section}`);
  };

  if (authLoading) {
    return <div className="loading-state"><i className="fas fa-spinner fa-spin"></i></div>;
  }

  if (!isLoggedIn || role !== 'teacher') {
    return null;
  }

  return (
    <div className="app-container teacher-page">
      {sidebarOpen && <div className="sidebar-backdrop active" onClick={() => setSidebarOpen(false)}></div>}

      <TeacherSidebar
        activeSection="messages"
        onSectionChange={handleSectionChange}
        unreadMessages={unreadMessages}
        t={t}
        lang={lang}
        onLangChange={changeLang}
        isOpen={sidebarOpen}
      />

      <main className="main-content">
        <TeacherTopBar
          title={t('messages_title')}
          onMenuToggle={toggleSidebar}
          t={t}
          lang={lang}
          onLangChange={changeLang}
        />

        <div className="messages-container content-with-bottom-nav">
          <div className="messages-header">
            <h2>{t('student_conversations')}</h2>
            <p>{t('click_student_to_chat')}</p>
          </div>

          <div className="messaging-container">
            <div className={`chat-list ${selectedStudentId ? 'hidden-mobile' : ''}`}>
              <div className="search-box">
                <i className="fas fa-search"></i>
                <input
                  type="text"
                  placeholder={t('search_students')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div id="chatsList" className="chats-list chat-list-items">
                {studentsLoading ? (
                  <div className="loading-spinner">
                    <i className="fas fa-circle-notch fa-spin"></i>
                    <span>{t('loading')}</span>
                  </div>
                ) : sortedStudents.length === 0 ? (
                  <div id="noChats" className="empty-state">
                    <i className="fas fa-comments"></i>
                    <h3>{t('no_conversations_yet')}</h3>
                    <p>{t('no_conversations_hint_long')}</p>
                  </div>
                ) : (
                  sortedStudents.map((student: any) => {
                    const lastMsg = messages
                      .filter((m: any) => m.studentId === student.id)
                      .slice(-1)[0];
                    const unreadCount = getUnreadCount(student.id);

                    const initial = (student.name || '?').charAt(0).toUpperCase();
                    const maxPreviewLen = 50;
                    const body = lastMsg ? getMessageBody(lastMsg) : '';
                    const previewText = lastMsg
                      ? (lastMsg.sender === 'teacher' ? t('you_prefix') : '') + (body.length > maxPreviewLen ? body.substring(0, maxPreviewLen) + '...' : body)
                      : t('no_messages_yet');
                    return (
                      <div
                        key={student.id}
                        className={`chat-list-item chat-item ${selectedStudentId === student.id ? 'active' : ''} ${unreadCount > 0 ? 'unread' : ''}`}
                        onClick={() => setSelectedStudentId(student.id)}
                      >
                        <div className="chat-item-avatar">{initial}</div>
                        <div className="chat-info chat-item-content">
                          <div className="chat-name-row chat-item-header">
                            <span className="chat-name chat-item-name">{student.name}</span>
                            {lastMsg && (
                              <span className="chat-time chat-item-time">{formatTimeForList(lastMsg.timestamp)}</span>
                            )}
                          </div>
                          <div className="chat-preview-row chat-item-preview">
                            <span className="chat-preview chat-item-message">{previewText}</span>
                            {unreadCount > 0 && (
                              <span className="unread-badge">{unreadCount}</span>
                            )}
                          </div>
                          <div className="chat-item-actions">
                            <button type="button" className="chat-action-btn" onClick={(e) => { e.stopPropagation(); router.push(`/teacher/student?id=${student.id}&returnSection=messages`); }} title={t('profile')}>
                              <i className="fas fa-user"></i> {t('profile')}
                            </button>
                            <button type="button" className="chat-action-btn" onClick={(e) => { e.stopPropagation(); router.push(`/teacher/dashboard?section=manage-tasks&createFor=${student.id}`); }} title={t('tasks')}>
                              <i className="fas fa-tasks"></i> {t('tasks')}
                            </button>
                            <button type="button" className="chat-action-btn" onClick={(e) => { e.stopPropagation(); setSelectedStudentId(student.id); }} title={t('chat')}>
                              <i className="fas fa-comments"></i> {t('chat')}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className={`chat-area ${!selectedStudentId ? 'hidden-mobile' : ''}`}>
              {selectedStudentId && selectedStudent ? (
                <>
                  <div className="chat-header">
                    <button className="back-btn mobile-only" onClick={() => setSelectedStudentId(null)}>
                      <i className="fas fa-arrow-left"></i>
                    </button>
                    <div className="chat-avatar">
                      <i className="fas fa-user-graduate"></i>
                    </div>
                    <div className="chat-header-info">
                      <h3>{selectedStudent.name}</h3>
                      <span className="student-id">{selectedStudent.studentId}</span>
                    </div>
                  </div>

                  <div className="messages-area">
                    {studentMessages.length === 0 ? (
                      <div className="empty-chat">
                        <i className="fas fa-comments"></i>
                        <p>{t('start_conversation')}</p>
                      </div>
                    ) : (
                      studentMessages.map((msg: any) => {
                        const isFromTeacher = String(msg.sender || '').toLowerCase() === 'teacher';
                        return (
                          <div
                            key={msg.id}
                            className={`message-bubble ${isFromTeacher ? 'message-sent' : 'message-received'}`}
                          >
                            <p className="message-text">{getMessageBody(msg)}</p>
                            <span className="message-time">{formatTime(msg.timestamp)}</span>
                          </div>
                        );
                      })
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  <form className="message-input" onSubmit={handleSendMessage}>
                    <input
                      type="text"
                      placeholder={t('type_message')}
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                    />
                    <button type="submit" disabled={!newMessage.trim()}>
                      <i className="fas fa-paper-plane"></i>
                    </button>
                  </form>
                </>
              ) : (
                <div className="no-chat-selected">
                  <i className="fas fa-comments"></i>
                  <p>{t('select_student_to_chat')}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <div className="bottom-nav-wrapper">
        <div className="bottom-nav-fade bottom-nav-fade-left" id="bottomNavFadeLeft" aria-hidden="true"><i className="fas fa-chevron-left"></i></div>
        <nav className="bottom-nav" id="bottomNav" aria-label="Main navigation">
          <a href="#" className="bottom-nav-item" onClick={(e) => { e.preventDefault(); router.push('/teacher/dashboard'); }} title="Dashboard">
            <i className="fas fa-home"></i>
            <span>{t('nav_dashboard')}</span>
          </a>
          <a href="#" className="bottom-nav-item" onClick={(e) => { e.preventDefault(); router.push('/teacher/dashboard?section=manage-tasks'); }} title="Tasks">
            <i className="fas fa-tasks"></i>
            <span>{t('stat_tasks')}</span>
          </a>
          <a href="#" className="bottom-nav-item" onClick={(e) => { e.preventDefault(); router.push('/teacher/dashboard?section=students'); }} title="Students">
            <i className="fas fa-users"></i>
            <span>{t('nav_students')}</span>
          </a>
          <a href="#" className="bottom-nav-item bottom-nav-item-msg active" title="Messages">
            <i className="fas fa-comments"></i>
            <span>{t('nav_messages')}</span>
            {unreadMessages > 0 && <span id="messagesUnreadBadgeNav" className="bottom-nav-badge">{unreadMessages}</span>}
          </a>
          <a href="#" className="bottom-nav-item" onClick={(e) => { e.preventDefault(); router.push('/teacher/dashboard?section=daily-overview'); }} title="Overview">
            <i className="fas fa-table"></i>
            <span>{t('nav_overview')}</span>
          </a>
          <a href="#" className="bottom-nav-item" onClick={(e) => { e.preventDefault(); router.push('/teacher/exams'); }} title="Exams">
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




