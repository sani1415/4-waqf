'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useStudents, useMessages, useSubmittedDocuments } from '@/hooks/useFirestore';
import { useTranslation } from '@/hooks/useTranslation';
import TeacherSidebar from '@/components/teacher/TeacherSidebar';
import TeacherTopBar from '@/components/teacher/TeacherTopBar';
import { formatDateDisplay, getUseHijri } from '@/lib/date-format';
import type { MessageCategory } from '@/lib/types';
import '@/styles/teacher.css';
import '@/styles/messaging.css';

type SubmittedDocumentLike = {
  id: string;
  studentId: string;
  fileName?: string;
  fileUrl?: string;
  downloadURL?: string;
  fileSize?: number;
  uploadedAt?: string;
  forReview?: boolean;
  markedForReview?: boolean;
  category?: MessageCategory;
};

function formatFileSize(bytes?: number) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatShortDate(iso?: string) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

const MESSAGE_CATEGORIES: MessageCategory[] = ['general', 'question', 'fortnight_report'];

export default function TeacherMessages() {
  const router = useRouter();
  const { isLoggedIn, role, isLoading: authLoading } = useAuth();
  const { t, lang, changeLang } = useTranslation();

  const { data: students, loading: studentsLoading } = useStudents();
  const { data: messages, addItem: addMessage, updateItem: updateMessage } = useMessages();
  const { data: submittedDocumentsData, updateItem: updateSubmittedDocument } = useSubmittedDocuments();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [messageCategory, setMessageCategory] = useState<MessageCategory>('general');
  const [filterByCategory, setFilterByCategory] = useState<MessageCategory | 'all' | 'documents_only'>('all');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageTextareaRef = useRef<HTMLTextAreaElement>(null);
  const hasOpenedConversationRef = useRef(false);

  const MIN_INPUT_ROWS = 1;
  const EXPANDED_ROWS = 4; /* WhatsApp-style: expand when focused so typing is comfortable */
  const MAX_INPUT_ROWS = 6;

  const submittedDocuments = (submittedDocumentsData as SubmittedDocumentLike[]) || [];
  const studentDocuments = selectedStudentId
    ? submittedDocuments.filter((d) => String(d.studentId) === String(selectedStudentId))
    : [];

  useEffect(() => {
    if (!authLoading && (!isLoggedIn || role !== 'teacher')) {
      router.push('/');
    }
  }, [isLoggedIn, role, router, authLoading]);

  const selectedStudent = students.find((s: any) => s.id === selectedStudentId);

  const studentMessages = messages
    .filter((m: any) => m.studentId === selectedStudentId)
    .sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  /** Combined timeline: messages + documents, sorted by time */
  const combinedTimeline = selectedStudentId
    ? [
        ...studentMessages.map((m: any) => ({ type: 'message' as const, ...m, _sort: m.timestamp })),
        ...studentDocuments.map((d) => ({ type: 'document' as const, ...d, _sort: d.uploadedAt || '' })),
      ].sort((a, b) => new Date(a._sort).getTime() - new Date(b._sort).getTime())
    : [];

  const displayedTimeline =
    filterByCategory === 'all'
      ? combinedTimeline
      : filterByCategory === 'documents_only'
        ? combinedTimeline.filter((i) => i.type === 'document')
        : combinedTimeline.filter((i) => (i.category ?? 'general') === filterByCategory);

  const getCategoryLabel = (cat: MessageCategory | undefined) =>
    cat ? t('msg_category_' + cat) : t('msg_category_general');

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

  /** Last activity (message or document) for a student – for list order and preview */
  const getLastActivityForStudent = (studentId: string): { type: 'message'; timestamp: string; text?: string; sender?: string } | { type: 'document'; uploadedAt?: string; fileName?: string } | null => {
    const docsForStudent = submittedDocuments.filter((d) => String(d.studentId) === String(studentId));
    const lastMsg = messages
      .filter((m: any) => m.studentId === studentId)
      .reduce<any>((latest, m) => (new Date(m.timestamp).getTime() > new Date(latest?.timestamp || 0).getTime() ? m : latest), null);
    const lastDoc = docsForStudent.reduce<SubmittedDocumentLike | null>((latest, d) =>
      (new Date(d.uploadedAt || 0).getTime() > new Date(latest?.uploadedAt || 0).getTime() ? d : latest), null);
    const msgTime = lastMsg ? new Date(lastMsg.timestamp).getTime() : 0;
    const docTime = lastDoc && lastDoc.uploadedAt ? new Date(lastDoc.uploadedAt).getTime() : 0;
    if (docTime > msgTime && lastDoc) return { type: 'document', uploadedAt: lastDoc.uploadedAt, fileName: lastDoc.fileName };
    if (lastMsg) return { type: 'message', timestamp: lastMsg.timestamp, text: getMessageBody(lastMsg), sender: lastMsg.sender };
    return null;
  };

  /** Sort like messaging apps: most recent conversation (last activity) at top; unread as tie-breaker */
  const sortedStudents = [...filteredStudents].sort((a: any, b: any) => {
    const aLast = getLastActivityForStudent(a.id);
    const bLast = getLastActivityForStudent(b.id);
    const aTime = aLast ? (aLast.type === 'message' ? new Date(aLast.timestamp).getTime() : new Date((aLast as any).uploadedAt || 0).getTime()) : 0;
    const bTime = bLast ? (bLast.type === 'message' ? new Date(bLast.timestamp).getTime() : new Date((bLast as any).uploadedAt || 0).getTime()) : 0;
    if (bTime !== aTime) return bTime - aTime; // most recent first
    const aUnread = getUnreadCount(a.id);
    const bUnread = getUnreadCount(b.id);
    return bUnread - aUnread; // tie-break: unread first
  });

  useEffect(() => {
    hasOpenedConversationRef.current = false;
  }, [selectedStudentId]);

  useEffect(() => {
    if (!selectedStudentId || !messagesEndRef.current) return;
    messagesEndRef.current?.scrollIntoView({
      behavior: hasOpenedConversationRef.current ? 'smooth' : 'auto',
      block: 'end',
    });
    hasOpenedConversationRef.current = true;
  }, [selectedStudentId, displayedTimeline]);

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
      read: false,
      category: messageCategory,
      messageType: 'text'
    });

    setNewMessage('');
    if (messageTextareaRef.current) {
      messageTextareaRef.current.rows = MIN_INPUT_ROWS;
    }
  };

  const handleMessageInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value;
    setNewMessage(v);
    const ta = e.target;
    ta.rows = MIN_INPUT_ROWS;
    if (!v.trim()) {
      ta.rows = MIN_INPUT_ROWS;
      return;
    }
    const lineHeight = typeof getComputedStyle !== 'undefined' && getComputedStyle(ta).lineHeight ? parseInt(getComputedStyle(ta).lineHeight, 10) : 24;
    const rows = Math.min(MAX_INPUT_ROWS, Math.max(EXPANDED_ROWS, Math.ceil(ta.scrollHeight / lineHeight)));
    ta.rows = rows;
  };

  const handleMessageInputFocus = () => {
    const ta = messageTextareaRef.current;
    if (ta && !newMessage.trim()) ta.rows = EXPANDED_ROWS;
  };

  const handleMessageInputBlur = () => {
    const ta = messageTextareaRef.current;
    if (ta && !newMessage.trim()) ta.rows = MIN_INPUT_ROWS;
  };

  const getDocumentUrl = (doc: SubmittedDocumentLike) => doc.fileUrl || doc.downloadURL || '';
  const markDocumentReviewed = async (doc: SubmittedDocumentLike) => {
    await updateSubmittedDocument(doc.id, {
      forReview: false,
      markedForReview: false,
      reviewedAt: new Date().toISOString()
    });
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
      <div className={`sidebar-backdrop ${sidebarOpen ? 'active' : ''}`} onClick={() => setSidebarOpen(false)} aria-hidden="true"></div>

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
          <div className="messaging-container">
            <div className={`chat-list ${selectedStudentId ? 'hidden-mobile' : ''}`}>
              <div className="chat-list-inner-header">
                <h2>{t('student_conversations')}</h2>
                <p>{t('click_student_to_chat')}</p>
              </div>
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
                    const lastActivity = getLastActivityForStudent(student.id);
                    const unreadCount = getUnreadCount(student.id);

                    const initial = (student.name || '?').charAt(0).toUpperCase();
                    const maxPreviewLen = 50;
                    const previewText = lastActivity
                      ? lastActivity.type === 'document'
                        ? (t('document') || 'Document') + ': ' + (lastActivity.fileName || '')
                        : (lastActivity.type === 'message' && (lastActivity as any).sender === 'teacher' ? t('you_prefix') : '') + ((lastActivity.text || '').length > maxPreviewLen ? (lastActivity.text || '').substring(0, maxPreviewLen) + '...' : (lastActivity.text || ''))
                      : t('no_messages_yet');
                    const lastTime = lastActivity
                      ? lastActivity.type === 'message' ? (lastActivity as any).timestamp : (lastActivity as any).uploadedAt
                      : null;
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
                            {lastTime && (
                              <span className="chat-time chat-item-time">{formatTimeForList(lastTime)}</span>
                            )}
                          </div>
                          <div className="chat-preview-row chat-item-preview">
                            <span className="chat-preview chat-item-message">{previewText}</span>
                            {unreadCount > 0 && (
                              <span className="unread-badge">{unreadCount}</span>
                            )}
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

                  {/* Single flow: filter + timeline (messages + documents) + input */}
                  <div className="message-category-filter" data-testid="teacher-message-category-filter">
                    <label htmlFor="teacher-msg-filter" className="message-category-filter-label">{t('filter_by_category')}</label>
                    <select
                      id="teacher-msg-filter"
                      value={filterByCategory}
                      onChange={(e) => setFilterByCategory(e.target.value as MessageCategory | 'all' | 'documents_only')}
                      className="message-category-select"
                      data-testid="teacher-filter-by-category"
                    >
                      <option value="all">{t('all_categories')}</option>
                      {MESSAGE_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>{getCategoryLabel(cat)}</option>
                      ))}
                      <option value="documents_only">{t('documents_only') || 'Documents only'}</option>
                    </select>
                  </div>

                  <div className="messages-area">
                    {combinedTimeline.length === 0 ? (
                      <div className="empty-chat">
                        <i className="fas fa-comments"></i>
                        <p>{t('start_conversation')}</p>
                      </div>
                    ) : displayedTimeline.length === 0 ? (
                      <div className="empty-chat">
                        <i className="fas fa-filter"></i>
                        <p>{t('no_messages_yet')}</p>
                        <span>{t('filter_by_category')}</span>
                      </div>
                    ) : (
                      displayedTimeline.map((item: any) => {
                        if (item.type === 'document') {
                          const url = getDocumentUrl(item);
                          const cat = (item.category ?? 'general') as MessageCategory;
                          return (
                            <div
                              key={`doc-${item.id}`}
                              className="message-bubble message-received doc-bubble"
                              role={url ? 'link' : undefined}
                              onClick={() => url && window.open(url, '_blank')}
                              title={url ? t('download') : t('no_file_url')}
                            >
                              <div className="doc-bubble-inner">
                                <span className="doc-bubble-icon"><i className="fas fa-file-alt"></i></span>
                                <span className="doc-bubble-name">{item.fileName || 'document'}</span>
                                {cat !== 'general' && (
                                  <span className="message-category-badge" title={getCategoryLabel(cat)}>{getCategoryLabel(cat)}</span>
                                )}
                                {url && <span className="doc-bubble-download"><i className="fas fa-download"></i></span>}
                              </div>
                              <span className="message-time">{item.uploadedAt ? formatTime(item.uploadedAt) : ''}</span>
                              {(item.forReview || item.markedForReview) && (
                                <button
                                  type="button"
                                  className="doc-bubble-mark-reviewed"
                                  onClick={(e) => { e.stopPropagation(); markDocumentReviewed(item); }}
                                  title={t('mark_reviewed')}
                                >
                                  <i className="fas fa-check"></i> {t('mark_reviewed')}
                                </button>
                              )}
                            </div>
                          );
                        }
                        const isFromTeacher = String(item.sender || '').toLowerCase() === 'teacher';
                        const cat = (item.category ?? 'general') as MessageCategory;
                        return (
                          <div
                            key={item.id}
                            className={`message-bubble ${isFromTeacher ? 'message-sent' : 'message-received'}`}
                          >
                            {cat !== 'general' && (
                              <span className="message-category-badge" title={getCategoryLabel(cat)}>{getCategoryLabel(cat)}</span>
                            )}
                            <p className="message-text">{getMessageBody(item)}</p>
                            <span className="message-time">{formatTime(item.timestamp)}</span>
                          </div>
                        );
                      })
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  <form className="message-input teacher-message-form message-input-single-box" onSubmit={handleSendMessage}>
                    <div className="message-input-single-box-inner">
                      <div className="message-category-in-box" data-testid="teacher-send-category-wrap">
                        <select
                          id="teacher-msg-category"
                          value={messageCategory}
                          onChange={(e) => setMessageCategory(e.target.value as MessageCategory)}
                          className="message-category-select-in-box"
                          title={t('message_category')}
                          data-testid="teacher-send-category"
                          aria-label={t('message_category')}
                        >
                          {MESSAGE_CATEGORIES.map((cat) => (
                            <option key={cat} value={cat}>{getCategoryLabel(cat)}</option>
                          ))}
                        </select>
                        <i className="fas fa-chevron-down message-category-arrow" aria-hidden />
                      </div>
                      <textarea
                        ref={messageTextareaRef}
                        className="prototype-textarea message-input-text-in-box"
                        placeholder={t('type_message')}
                        value={newMessage}
                        onChange={handleMessageInputChange}
                        onFocus={handleMessageInputFocus}
                        onBlur={handleMessageInputBlur}
                        rows={MIN_INPUT_ROWS}
                        aria-label={t('type_message')}
                        data-testid="teacher-message-input"
                      />
                      <button type="submit" className="message-send-btn message-send-btn-in-box" disabled={!newMessage.trim()} aria-label={t('send') || 'Send'}>
                        <i className="fas fa-paper-plane"></i>
                      </button>
                    </div>
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




