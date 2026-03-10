'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useTranslation } from '@/hooks/useTranslation';
import TeacherSidebar from '@/components/teacher/TeacherSidebar';
import TeacherTopBar from '@/components/teacher/TeacherTopBar';
import '@/styles/teacher.css';
import '@/styles/messaging.css';

// Categories for messages and documents (documents use same categories: general, question, fortnight_report)
const CONTENT_CATEGORIES = ['general', 'question', 'fortnight_report'] as const;
const CATEGORY_LABELS: Record<string, string> = {
  general: 'General',
  question: 'Question',
  fortnight_report: 'Fortnight report',
  documents_only: 'Documents only',
};

const MOCK_STUDENTS = [
  { id: 's1', name: 'Ahmed Hassan', studentId: 'waqf-001' },
  { id: 's2', name: 'Fatima Khan', studentId: 'waqf-002' },
  { id: 's3', name: 'Ibrahim Ali', studentId: 'waqf-003' },
];

// Messages (text) and documents (type: 'document', each with category like general/question/fortnight_report) in one list
const MOCK_ITEMS: Array<
  | { id: string; studentId: string; sender: string; text: string; timestamp: string; category: 'general' | 'question' | 'fortnight_report' }
  | { id: string; studentId: string; sender: string; type: 'document'; category: 'general' | 'question' | 'fortnight_report'; fileName: string; uploadedAt: string; timestamp: string; fileUrl?: string }
> = [
  { id: 'm1', studentId: 's1', sender: 'student', text: 'Assalamu alaikum, I have a question.', timestamp: '2025-03-10T09:00:00Z', category: 'question' },
  { id: 'm2', studentId: 's1', sender: 'teacher', text: 'Wa alaikum assalam. Please go ahead.', timestamp: '2025-03-10T09:15:00Z', category: 'general' },
  { id: 'm3', studentId: 's1', sender: 'student', text: 'When is the fortnight report due?', timestamp: '2025-03-10T09:20:00Z', category: 'question' },
  { id: 'd1', studentId: 's1', sender: 'student', type: 'document', category: 'fortnight_report', fileName: 'report-march.pdf', uploadedAt: '2025-03-10T08:00:00Z', timestamp: '2025-03-10T08:00:00Z', fileUrl: '#' },
  { id: 'd2', studentId: 's1', sender: 'student', type: 'document', category: 'general', fileName: 'photo-task.jpg', uploadedAt: '2025-03-09T12:00:00Z', timestamp: '2025-03-09T12:00:00Z', fileUrl: '#' },
  { id: 'm4', studentId: 's2', sender: 'student', text: 'I uploaded my report.', timestamp: '2025-03-09T14:00:00Z', category: 'fortnight_report' },
  { id: 'm5', studentId: 's2', sender: 'teacher', text: 'Received. I will review it.', timestamp: '2025-03-09T15:00:00Z', category: 'general' },
  { id: 'd3', studentId: 's2', sender: 'student', type: 'document', category: 'fortnight_report', fileName: 'fortnight-report.pdf', uploadedAt: '2025-03-09T14:00:00Z', timestamp: '2025-03-09T14:00:00Z', fileUrl: '#' },
  { id: 'm6', studentId: 's3', sender: 'teacher', text: 'Please submit the assignment by Friday.', timestamp: '2025-03-08T10:00:00Z', category: 'general' },
  { id: 'd4', studentId: 's3', sender: 'student', type: 'document', category: 'general', fileName: 'assignment.pdf', uploadedAt: '2025-03-08T09:00:00Z', timestamp: '2025-03-08T09:00:00Z', fileUrl: '#' },
];

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}
function formatShortDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

const MIN_INPUT_ROWS = 1;
const MAX_INPUT_ROWS = 5;

export default function MessagesPrototypesPage() {
  const router = useRouter();
  const { isLoggedIn, role, isLoading: authLoading } = useAuth();
  const { t, lang, changeLang } = useTranslation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Category-before-typing: show selector until user picks one, then it disappears
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!authLoading && (!isLoggedIn || role !== 'teacher')) {
      router.push('/');
    }
  }, [isLoggedIn, role, router, authLoading]);

  const handleSectionChange = (section: string) => {
    router.push(`/teacher/dashboard?section=${section}`);
  };

  const selectedStudent = selectedStudentId ? MOCK_STUDENTS.find((s) => s.id === selectedStudentId) : null;
  const studentItems = selectedStudentId
    ? MOCK_ITEMS.filter((i) => i.studentId === selectedStudentId).sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      )
    : [];

  const filteredItems =
    categoryFilter === 'all'
      ? studentItems
      : categoryFilter === 'documents_only'
        ? studentItems.filter((i) => 'type' in i && i.type === 'document')
        : studentItems.filter((i) => i.category === categoryFilter);

  // WhatsApp-style: input grows when typing, shrinks when empty or after send
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value;
    setMessageText(v);
    const ta = e.target;
    ta.rows = MIN_INPUT_ROWS;
    if (!v.trim()) {
      ta.rows = MIN_INPUT_ROWS;
      return;
    }
    const lineHeight = typeof getComputedStyle !== 'undefined' && getComputedStyle(ta).lineHeight ? parseInt(getComputedStyle(ta).lineHeight, 10) : 24;
    const rows = Math.min(MAX_INPUT_ROWS, Math.max(MIN_INPUT_ROWS, Math.ceil(ta.scrollHeight / lineHeight)));
    ta.rows = rows;
  };

  const handleSend = () => {
    if (!messageText.trim()) return;
    setMessageText('');
    if (textareaRef.current) {
      textareaRef.current.rows = MIN_INPUT_ROWS;
    }
    setSelectedCategory(null);
  };

  const resetCategory = () => {
    setSelectedCategory(null);
  };

  if (authLoading) return <div className="loading-state"><i className="fas fa-spinner fa-spin"></i></div>;
  if (!isLoggedIn || role !== 'teacher') return null;

  return (
    <div className="app-container teacher-page">
      <div className={`sidebar-backdrop ${sidebarOpen ? 'active' : ''}`} onClick={() => setSidebarOpen(false)} aria-hidden="true" />
      <TeacherSidebar activeSection="messages" onSectionChange={handleSectionChange} unreadMessages={0} t={t} lang={lang} onLangChange={changeLang} isOpen={sidebarOpen} />
      <main className="main-content">
        <TeacherTopBar title="Messages (single flow + document category)" onMenuToggle={() => setSidebarOpen(true)} t={t} lang={lang} onLangChange={changeLang} />

        <div className="messages-container content-with-bottom-nav" style={{ padding: '1rem' }}>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
            One tab. Filter by category (including Document). Select category before typing → selector disappears → WhatsApp-style input.
          </p>

          <div className="messaging-container teacher-page">
            <div className={`chat-list ${selectedStudentId ? 'hidden-mobile' : ''}`}>
              <div className="chat-list-inner-header">
                <h2>Student conversations</h2>
                <p>Click a student – messages and documents in one list</p>
              </div>
              <div className="search-box">
                <i className="fas fa-search"></i>
                <input type="text" placeholder="Search students" readOnly style={{ cursor: 'text' }} />
              </div>
              <div className="chats-list chat-list-items">
                {MOCK_STUDENTS.map((student) => (
                  <div
                    key={student.id}
                    className={`chat-list-item chat-item ${selectedStudentId === student.id ? 'active' : ''}`}
                    onClick={() => setSelectedStudentId(student.id)}
                  >
                    <div className="chat-item-avatar">{(student.name || '?').charAt(0)}</div>
                    <div className="chat-info chat-item-content">
                      <div className="chat-name-row chat-item-header">
                        <span className="chat-name chat-item-name">{student.name}</span>
                        <span className="chat-time chat-item-time">{student.studentId}</span>
                      </div>
                      <div className="chat-preview-row chat-item-preview">
                        <span className="chat-preview chat-item-message">Tap to open</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className={`chat-area ${!selectedStudentId ? 'hidden-mobile' : ''}`}>
              {!selectedStudentId && (
                <div className="no-chat-selected">
                  <i className="fas fa-comments"></i>
                  <p>Select a student to open the conversation</p>
                </div>
              )}

              {selectedStudent && (
                <>
                  <div className="chat-header">
                    <button type="button" className="back-btn mobile-only" onClick={() => setSelectedStudentId(null)}>
                      <i className="fas fa-arrow-left"></i>
                    </button>
                    <div className="chat-avatar"><i className="fas fa-user-graduate"></i></div>
                    <div className="chat-header-info">
                      <h3>{selectedStudent.name}</h3>
                      <span className="student-id">{selectedStudent.studentId}</span>
                    </div>
                  </div>

                  {/* Filter by category (All, General, Question, Fortnight report, Documents only) */}
                  <div className="message-category-filter" style={{ margin: '0.75rem 1rem' }}>
                    <label htmlFor="proto-category-filter" className="message-category-filter-label">Filter by category</label>
                    <select
                      id="proto-category-filter"
                      className="message-category-select"
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                    >
                      <option value="all">All</option>
                      {CONTENT_CATEGORIES.map((c) => (
                        <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                      ))}
                      <option value="documents_only">{CATEGORY_LABELS.documents_only}</option>
                    </select>
                  </div>

                  <div className="messages-area teacher-page">
                    {filteredItems.length === 0 ? (
                      <div className="empty-chat">
                        <i className="fas fa-comments"></i>
                        <p>{categoryFilter === 'all' ? 'No messages yet' : `No ${CATEGORY_LABELS[categoryFilter] || categoryFilter} items`}</p>
                      </div>
                    ) : (
                      filteredItems.map((item) => {
                        if ('type' in item && item.type === 'document') {
                          const doc = item as { id: string; fileName: string; uploadedAt: string; timestamp: string; category: 'general' | 'question' | 'fortnight_report'; fileUrl?: string };
                          const handleDocClick = () => {
                            if (doc.fileUrl && doc.fileUrl !== '#') {
                              window.open(doc.fileUrl, '_blank', 'noopener,noreferrer');
                            } else {
                              const blob = new Blob(['Prototype document: ' + doc.fileName], { type: 'text/plain' });
                              const a = document.createElement('a');
                              a.href = URL.createObjectURL(blob);
                              a.download = doc.fileName;
                              a.click();
                              URL.revokeObjectURL(a.href);
                            }
                          };
                          return (
                            <div
                              key={doc.id}
                              className="message-bubble message-received prototype-doc-bubble"
                              onClick={handleDocClick}
                              role="button"
                              tabIndex={0}
                              onKeyDown={(e) => e.key === 'Enter' && handleDocClick()}
                            >
                              {doc.category !== 'general' && (
                                <span className="message-category-badge">{CATEGORY_LABELS[doc.category]}</span>
                              )}
                              <div className="prototype-doc-bubble-inner">
                                <i className="fas fa-file-alt prototype-doc-icon"></i>
                                <span className="message-text">{doc.fileName}</span>
                                <i className="fas fa-download prototype-doc-download" title="Download"></i>
                              </div>
                              <span className="message-time">{formatShortDate(doc.uploadedAt || doc.timestamp)}</span>
                            </div>
                          );
                        }
                        const msg = item as { id: string; sender: string; text: string; timestamp: string; category: string };
                        return (
                          <div key={msg.id} className={`message-bubble ${msg.sender === 'teacher' ? 'message-sent' : 'message-received'}`}>
                            {msg.category !== 'general' && (
                              <span className="message-category-badge">{CATEGORY_LABELS[msg.category] || msg.category}</span>
                            )}
                            <p className="message-text">{msg.text}</p>
                            <span className="message-time">{formatTime(msg.timestamp)}</span>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Input: first select category (then it disappears), then WhatsApp-style expanding input + send */}
                  <div className="message-input teacher-message-form prototype-whatsapp-input">
                    {selectedCategory === null ? (
                      <div className="prototype-category-picker">
                        <p className="prototype-category-picker-label">Select category, then type your message</p>
                        <div className="prototype-category-buttons">
                          {CONTENT_CATEGORIES.map((c) => (
                            <button
                              key={c}
                              type="button"
                              className="btn-secondary"
                              style={{ fontSize: '0.85rem', padding: '0.5rem 0.75rem' }}
                              onClick={() => setSelectedCategory(c)}
                            >
                              {CATEGORY_LABELS[c]}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="prototype-input-wrap">
                          <textarea
                            ref={textareaRef}
                            rows={MIN_INPUT_ROWS}
                            placeholder="Type a message..."
                            value={messageText}
                            onChange={handleInputChange}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                              }
                            }}
                            className="prototype-textarea"
                          />
                          <button
                            type="button"
                            className="message-send-btn"
                            disabled={!messageText.trim()}
                            onClick={handleSend}
                            aria-label="Send"
                          >
                            <i className="fas fa-paper-plane"></i>
                          </button>
                        </div>
                        <div className="prototype-selected-category">
                          <span>{CATEGORY_LABELS[selectedCategory]}</span>
                          <button type="button" className="btn-link-sm" onClick={resetCategory}>Change</button>
                        </div>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
