'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useStudents, useMessages } from '@/hooks/useFirestore';
import { useTranslation } from '@/hooks/useTranslation';
import '@/styles/messaging.css';

export default function TeacherMessages() {
  const router = useRouter();
  const { isLoggedIn, role, logout, isLoading: authLoading } = useAuth();
  const { t, lang, changeLang } = useTranslation();
  
  const { data: students } = useStudents();
  const { data: messages, addItem: addMessage, updateItem: updateMessage } = useMessages();
  
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Redirect if not logged in as teacher
  useEffect(() => {
    if (!authLoading && (!isLoggedIn || role !== 'teacher')) {
      router.push('/');
    }
  }, [isLoggedIn, role, router, authLoading]);

  // Get selected student
  const selectedStudent = students.find((s: any) => s.id === selectedStudentId);

  // Get messages for selected student
  const studentMessages = messages
    .filter((m: any) => m.studentId === selectedStudentId)
    .sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  // Get unread count per student
  const getUnreadCount = (studentId: string) => {
    return messages.filter(
      (m: any) => m.studentId === studentId && m.sender === 'student' && !m.read
    ).length;
  };

  // Filter students by search
  const filteredStudents = students.filter((s: any) =>
    s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.studentId?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Sort students by unread messages and last message time
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

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [studentMessages]);

  // Mark messages as read when selecting student
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

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString(lang === 'bn' ? 'bn-BD' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return t('today');
    } else if (date.toDateString() === yesterday.toDateString()) {
      return t('yesterday');
    }
    return date.toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  if (authLoading) {
    return <div className="loading-state"><i className="fas fa-spinner fa-spin"></i></div>;
  }

  if (!isLoggedIn || role !== 'teacher') {
    return null;
  }

  return (
    <div className="messaging-container">
      {/* Students List */}
      <div className={`chat-list ${selectedStudentId ? 'hidden-mobile' : ''}`}>
        <div className="chat-list-header">
          <button className="back-btn" onClick={() => router.push('/teacher/dashboard')}>
            <i className="fas fa-arrow-left"></i>
          </button>
          <h2>{t('messages')}</h2>
          <div className="header-actions">
            <div className="lang-switcher lang-switcher-compact">
              <button 
                className={`lang-btn ${lang === 'en' ? 'active' : ''}`}
                onClick={() => changeLang('en')}
              >
                EN
              </button>
              <button 
                className={`lang-btn ${lang === 'bn' ? 'active' : ''}`}
                onClick={() => changeLang('bn')}
              >
                বাং
              </button>
            </div>
            <button className="btn-logout-chat" onClick={handleLogout} title={t('logout')}>
              <i className="fas fa-sign-out-alt"></i>
            </button>
          </div>
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

        <div className="chat-list-items">
          {sortedStudents.length === 0 ? (
            <p className="empty-state">{t('no_students')}</p>
          ) : (
            sortedStudents.map((student: any) => {
              const lastMsg = messages
                .filter((m: any) => m.studentId === student.id)
                .slice(-1)[0];
              const unreadCount = getUnreadCount(student.id);

              return (
                <div
                  key={student.id}
                  className={`chat-list-item ${selectedStudentId === student.id ? 'active' : ''} ${unreadCount > 0 ? 'unread' : ''}`}
                  onClick={() => setSelectedStudentId(student.id)}
                >
                  <div className="chat-avatar">
                    <i className="fas fa-user-graduate"></i>
                  </div>
                  <div className="chat-info">
                    <div className="chat-name-row">
                      <span className="chat-name">{student.name}</span>
                      {lastMsg && (
                        <span className="chat-time">{formatDate(lastMsg.timestamp)}</span>
                      )}
                    </div>
                    <div className="chat-preview-row">
                      <span className="chat-preview">
                        {lastMsg ? (
                          <>
                            {lastMsg.sender === 'teacher' && <span className="you-prefix">{t('you')}: </span>}
                            {lastMsg.text.substring(0, 30)}
                            {lastMsg.text.length > 30 && '...'}
                          </>
                        ) : (
                          t('no_messages_yet')
                        )}
                      </span>
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

      {/* Chat Area */}
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

            <div className="messages-container">
              {studentMessages.length === 0 ? (
                <div className="empty-chat">
                  <i className="fas fa-comments"></i>
                  <p>{t('start_conversation')}</p>
                </div>
              ) : (
                studentMessages.map((msg: any) => (
                  <div
                    key={msg.id}
                    className={`message ${msg.sender === 'teacher' ? 'sent' : 'received'}`}
                  >
                    <div className="message-content">
                      <p>{msg.text}</p>
                      <span className="message-time">{formatTime(msg.timestamp)}</span>
                    </div>
                  </div>
                ))
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
  );
}
