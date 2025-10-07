// Teacher Messages List JavaScript

document.addEventListener('DOMContentLoaded', function() {
    loadChatsList();
    setupMobileMenu();
    
    // Auto refresh every 5 seconds to check for new messages
    setInterval(loadChatsList, 5000);
});

// Load Chats List
function loadChatsList() {
    const container = document.getElementById('chatsList');
    const noChats = document.getElementById('noChats');
    const chats = dataManager.getAllChatsForTeacher();

    if (chats.length === 0) {
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
                </div>
            </div>
        `;
    }).join('');
}

// Open Chat
function openChat(studentId) {
    window.location.href = `teacher-chat.html?studentId=${studentId}`;
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

