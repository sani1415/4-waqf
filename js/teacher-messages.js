// Teacher Messages List JavaScript

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
    loadChatsList();
    setupMobileMenu();

    // Auto refresh every 5 seconds to check for new messages
    setInterval(() => loadChatsList(), 5000);
}

// Load Chats List
async function loadChatsList() {
    const container = document.getElementById('chatsList');
    const noChats = document.getElementById('noChats');
    const chats = await dataManager.getAllChatsForTeacher();

    if (!chats || chats.length === 0) {
        container.style.display = 'none';
        noChats.style.display = 'block';
        return;
    }

    container.style.display = 'block';
    noChats.style.display = 'none';

    container.innerHTML = chats.map(chat => {
        const { student, lastMessage, unreadCount } = chat;
        const initial = student.name.charAt(0).toUpperCase();
        
        let lastMessageText = 'No messages yet';
        let lastMessageTime = '';
        
        if (lastMessage) {
            const maxLength = 50;
            const prefix = lastMessage.sender === 'teacher' ? 'You: ' : '';
            lastMessageText = prefix + (lastMessage.message.length > maxLength ? 
                lastMessage.message.substring(0, maxLength) + '...' : 
                lastMessage.message);
            lastMessageTime = formatTime(lastMessage.timestamp);
        }

        return `
            <div class="chat-item fade-in" onclick="openChat(${student.id})">
                <div class="chat-item-avatar">${initial}</div>
                <div class="chat-item-content">
                    <div class="chat-item-header">
                        <span class="chat-item-name">${student.name}</span>
                        <span class="chat-item-time">${lastMessageTime}</span>
                    </div>
                    <div class="chat-item-preview">
                        <span class="chat-item-message">${lastMessageText}</span>
                        ${unreadCount > 0 ? `<span class="unread-badge">${unreadCount}</span>` : ''}
                    </div>
                    <div class="chat-item-actions">
                        <button class="chat-action-btn" onclick="event.stopPropagation(); window.location.href='pages/teacher-student-detail.html?studentId=${student.id}';">
                            <i class="fas fa-user"></i> Profile
                        </button>
                        <button class="chat-action-btn" onclick="event.stopPropagation(); window.location.href='pages/teacher-dashboard.html?studentId=${student.id}#manage-tasks';">
                            <i class="fas fa-tasks"></i> Tasks
                        </button>
                        <button class="chat-action-btn" onclick="event.stopPropagation(); window.location.href='pages/teacher-chat.html?studentId=${student.id}';">
                            <i class="fas fa-comments"></i> Chat
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Open Chat
function openChat(studentId) {
    window.location.href = `pages/teacher-chat.html?studentId=${studentId}`;
}

// Format Time
function formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffTime = now - date;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
        // Today - show time
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    } else if (diffDays === 1) {
        return 'Yesterday';
    } else if (diffDays < 7) {
        return date.toLocaleDateString('en-US', { weekday: 'short' });
    } else {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
}

// Setup Mobile Menu
function setupMobileMenu() {
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    
    if (menuToggle) {
        menuToggle.addEventListener('click', function() {
            sidebar.classList.toggle('active');
        });
    }
}

