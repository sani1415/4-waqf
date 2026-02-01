// Student Chat Window JavaScript

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
    initializeChat();
    setupMessageForm();

    // Auto refresh messages every 3 seconds
    setInterval(() => loadMessages(), 3000);
}

// Initialize Chat
async function initializeChat() {
    currentStudentId = sessionStorage.getItem('currentStudentId');

    if (!currentStudentId) {
        alert('Please select your profile first!');
        window.location.href = '/pages/student-list.html';
        return;
    }

    await loadMessages();
    await markAsRead();
}

// Load Messages
async function loadMessages() {
    const messagesArea = document.getElementById('messagesArea');
    const messages = await dataManager.getMessagesForStudent(currentStudentId);

    if (messages.length === 0) {
        messagesArea.innerHTML = `
            <div class="no-messages">
                <i class="fas fa-comments"></i>
                <p>No messages yet. Start the conversation with your teacher!</p>
            </div>
        `;
        return;
    }

    let lastDate = '';
    let messagesHTML = '';

    messages.forEach(message => {
        const messageDate = new Date(message.timestamp).toLocaleDateString();

        // Add date separator if date changed
        if (messageDate !== lastDate) {
            messagesHTML += `<div class="date-separator">${formatDate(message.timestamp)}</div>`;
            lastDate = messageDate;
        }

        const isSent = message.sender === 'student';
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
        await dataManager.sendMessage(currentStudentId, message, 'student');

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
    await dataManager.markMessagesAsRead(currentStudentId, 'student');
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
        return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
        return 'Yesterday';
    } else {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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
    window.location.href = '/pages/student-dashboard.html';
}

// Go to Dashboard
function goToDashboard() {
    window.location.href = '/pages/student-dashboard.html';
}
