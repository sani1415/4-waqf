'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useMessages } from '@/hooks/useFirestore';
import { useTranslation } from '@/hooks/useTranslation';
import '@/styles/student.css';
import '@/styles/messaging.css';
export default function StudentChat() {
  const router = useRouter();
  const { isLoggedIn, role, studentId, isLoading: authLoading } = useAuth();
  const { t, lang, changeLang } = useTranslation();
  
  const { data: messages, addItem: addMessage, updateItem: updateMessage } = useMessages();
  
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // Redirect if not logged in as student
  useEffect(() => {
    if (!authLoading && (!isLoggedIn || role !== 'student')) {
      router.push('/');
    }
  }, [isLoggedIn, role, router, authLoading]);

  // Get messages for this student
  const myMessages = messages
    .filter((m: any) => m.studentId === studentId)
    .sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [myMessages]);

  // Mark teacher messages as read
  useEffect(() => {
    if (studentId) {
      messages
        .filter((m: any) => m.studentId === studentId && m.sender === 'teacher' && !m.read)
        .forEach((m: any) => {
          updateMessage(m.id, { read: true });
        });
    }
  }, [studentId, messages, updateMessage]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !studentId) return;

    await addMessage({
      studentId: studentId,
      sender: 'student',
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

  if (authLoading) {
    return <div className="loading-state"><i className="fas fa-spinner fa-spin"></i></div>;
  }

  if (!isLoggedIn || role !== 'student') {
    return null;
  }

  return (
    <>
      <div className="chat-container">
        {/* Chat Header */}
        <div className="chat-header">
          <button className="back-button" onClick={() => router.push('/student/dashboard')}>
            <i className="fas fa-arrow-left"></i>
          </button>
          <div className="chat-header-info">
            <div className="chat-avatar teacher-avatar">
              <i className="fas fa-chalkboard-teacher"></i>
            </div>
            <div className="chat-header-details">
              <h3>{t('teacher')}</h3>
              <p>{t('your_instructor')}</p>
            </div>
          </div>
          <div className="lang-switcher lang-switcher-compact" style={{ marginRight: '0.5rem' }} aria-label="Language">
            <button 
              type="button"
              className={`lang-btn ${lang === 'en' ? 'active' : ''}`}
              onClick={() => changeLang('en')}
              title="English"
            >
              EN
            </button>
            <button 
              type="button"
              className={`lang-btn ${lang === 'bn' ? 'active' : ''}`}
              onClick={() => changeLang('bn')}
              title={t('lang_bengali')}
            >
              {t('lang_short_bn')}
            </button>
          </div>
          <div className="date-format-toggle"></div>
          <button className="info-button" onClick={() => router.push('/student/dashboard')}>
            <i className="fas fa-home"></i>
          </button>
        </div>

        {/* Messages Area */}
        <div className="messages-area" id="messagesArea">
          {myMessages.length === 0 ? (
            <div className="empty-chat">
              <i className="fas fa-comments"></i>
              <p>{t('no_messages_yet')}</p>
              <span>{t('send_message_to_teacher')}</span>
            </div>
          ) : (
            myMessages.map((msg: any) => {
              const isFromStudent = String(msg.sender || '').toLowerCase() === 'student';
              return (
                <div
                  key={msg.id}
                  className={`message-bubble ${isFromStudent ? 'message-sent' : 'message-received'}`}
                >
                  <p className="message-text">{(msg.text ?? msg.message ?? '').toString()}</p>
                  <span className="message-time">{formatTime(msg.timestamp)}</span>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="message-input-container">
          <form id="messageForm" className="message-form" onSubmit={handleSendMessage}>
            <input
              type="text"
              id="messageInput"
              placeholder={t('type_message')}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              autoComplete="off"
              required
            />
            <button type="submit" className="send-button" disabled={!newMessage.trim()}>
              <i className="fas fa-paper-plane"></i> <span>{t('send')}</span>
            </button>
          </form>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="student-bottom-nav-wrapper bottom-nav-wrapper">
        <div className="bottom-nav-fade bottom-nav-fade-left" id="studentNavFadeLeft" aria-hidden="true"><i className="fas fa-chevron-left"></i></div>
        <nav className="bottom-nav" id="studentBottomNav" aria-label="Student navigation">
          <a href="#" className="bottom-nav-item" onClick={(e) => { e.preventDefault(); router.push('/student/dashboard'); }} title="Today">
            <i className="fas fa-calendar-day"></i>
            <span>{t('today')}</span>
          </a>
          <a href="#" className="bottom-nav-item" onClick={(e) => { e.preventDefault(); router.push('/student/dashboard'); }} title="Tasks">
            <i className="fas fa-clipboard-list"></i>
            <span>{t('tasks')}</span>
          </a>
          <a href="#" className="bottom-nav-item" onClick={(e) => { e.preventDefault(); router.push('/student/exams'); }} title="Exams">
            <i className="fas fa-graduation-cap"></i>
            <span>{t('nav_exams')}</span>
          </a>
          <a href="#" className="bottom-nav-item active" title="Messages">
            <i className="fas fa-comments"></i>
            <span>{t('messages')}</span>
          </a>
          <a href="#" className="bottom-nav-item" onClick={(e) => { e.preventDefault(); router.push('/student/dashboard'); }} title="Records">
            <i className="fas fa-history"></i>
            <span>{t('tab_records')}</span>
          </a>
          <a href="#" className="bottom-nav-item" onClick={(e) => { e.preventDefault(); router.push('/student/dashboard'); }} title="Profile">
            <i className="fas fa-user"></i>
            <span>{t('profile')}</span>
          </a>
        </nav>
        <div className="bottom-nav-fade bottom-nav-fade-right" id="studentNavFadeRight" aria-hidden="true"><i className="fas fa-chevron-right"></i></div>
      </div>
    </>
  );
}







