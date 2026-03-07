// Teacher Chat Window JavaScript

let currentStudent = null;
let currentStudentId = null;

document.addEventListener('DOMContentLoaded', function() {
    // Wait for dataManager to be ready before initializing
    if (typeof dataManager !== 'undefined' && dataManager.initialized) {
        initializePage();
    } else {
        window.addEventListener('dataManagerReady', initializePage);
    }
});

// Initialize page after dataManager is ready
function initializePage() {
    if (typeof isTeacherLoggedIn === 'function' && !isTeacherLoggedIn()) {
        window.location.href = '/index.html';
        return;
    }
    initializeChat();
    setupMessageForm();
}

// Real-time: refresh messages when new messages arrive
function setupRealtimeChatMessages() {
    if (!currentStudentId || typeof dataManager?.subscribeToCollection !== 'function') return;
    dataManager.subscribeToCollection('messages', function() {
        if (currentStudentId) loadMessages();
    });
}

// Initialize Chat
async function initializeChat() {
    const urlParams = new URLSearchParams(window.location.search);
    currentStudentId = urlParams.get('studentId');

    if (!currentStudentId) {
        alert(typeof window.t === 'function' ? window.t('no_student_selected') : 'No student selected!');
        window.location.href = '/pages/teacher-messages.html';
        return;
    }

    currentStudent = await dataManager.getStudentById(currentStudentId);

    if (!currentStudent) {
        alert(typeof window.t === 'function' ? window.t('student_not_found') : 'Student not found!');
        window.location.href = '/pages/teacher-messages.html';
        return;
    }

    loadStudentInfo();
    await loadMessages();
    await markAsRead();
    setupRealtimeChatMessages();
}

// Load Student Info
function loadStudentInfo() {
    const initial = currentStudent.name.charAt(0).toUpperCase();
    
    document.getElementById('chatAvatar').textContent = initial;
    document.getElementById('studentName').textContent = currentStudent.name;
    document.getElementById('studentStatus').textContent = currentStudent.email || (typeof window.t === 'function' ? window.t('student') : 'Student');
}

// Load Messages
async function loadMessages() {
    const messagesArea = document.getElementById('messagesArea');
    const loadingText = typeof window.t === 'function' ? window.t('loading') : 'Loading...';
    if (messagesArea) messagesArea.innerHTML = `<div class="loading-spinner"><i class="fas fa-circle-notch fa-spin"></i><span>${loadingText}</span></div>`;

    const messages = await dataManager.getMessagesForStudent(currentStudentId);

    if (messages.length === 0) {
        const noMsg = typeof window.t === 'function' ? window.t('no_messages_yet') : 'No messages yet. Start the conversation!';
        messagesArea.innerHTML = `
            <div class="no-messages">
                <i class="fas fa-comments"></i>
                <p>${noMsg}</p>
            </div>
        `;
        return;
    }

    let lastDate = '';
    let messagesHTML = '';

    const toDateKey = (d) => d.toISOString().slice(0, 10);
    messages.forEach(message => {
        const messageDateKey = toDateKey(new Date(message.timestamp));
        
        // Add date separator if date changed
        if (messageDateKey !== lastDate) {
            messagesHTML += `<div class="date-separator">${formatDate(message.timestamp)}</div>`;
            lastDate = messageDateKey;
        }

        const isSent = message.sender === 'teacher';
        const messageClass = isSent ? 'message-sent' : 'message-received';
        const time = new Date(message.timestamp).toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true 
        });

        messagesHTML += `
            <div class="message-bubble ${messageClass}">
                <div class="message-text">${escapeHtml(message.message)}</div>
                <div class="message-time">${time}</div>
            </div>
        `;
    });

    messagesArea.innerHTML = messagesHTML;
    
    // Scroll to bottom
    scrollToBottom();
}

// Setup Message Form
function setupMessageForm() {
    const form = document.getElementById('messageForm');
    const input = document.getElementById('messageInput');

    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        const message = input.value.trim();
        if (!message) return;

        // Send message
        await dataManager.sendMessage(currentStudentId, message, 'teacher');

        // Clear input
        input.value = '';

        // Reload messages
        await loadMessages();
    });

    // Focus input
    input.focus();
}

// Mark Messages as Read
async function markAsRead() {
    await dataManager.markMessagesAsRead(currentStudentId, 'teacher');
}

// Scroll to Bottom
function scrollToBottom() {
    const messagesArea = document.getElementById('messagesArea');
    messagesArea.scrollTop = messagesArea.scrollHeight;
}

// Format Date
function formatDate(timestamp) {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
        return typeof window.t === 'function' ? window.t('today') : 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
        return typeof window.t === 'function' ? window.t('yesterday') : 'Yesterday';
    } else {
        return typeof formatDateDisplay === 'function' ? formatDateDisplay(date) : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Go Back
function goBack() {
    window.location.href = '/pages/teacher-messages.html';
}

// View Student Detail
function viewStudentDetail() {
    window.location.href = `/pages/teacher-student-detail.html?studentId=${currentStudentId}`;
}

