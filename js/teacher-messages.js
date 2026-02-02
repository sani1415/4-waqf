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
    // No auto-refresh: list loads on open; when user returns to page they get latest
}

// Prevent blink: only re-render when chat list data actually changed
let lastChatsSignature = null;

// Load Chats List
async function loadChatsList() {
    const container = document.getElementById('chatsList');
    const noChats = document.getElementById('noChats');
    
    // Show loading skeleton on first load (only if empty)
    if (container && !container.querySelector('.chat-item') && !container.querySelector('.skeleton-chat')) {
        container.innerHTML = getChatsSkeletonHtml();
        container.style.display = 'block';
        noChats.style.display = 'none';
    }
    
    const chats = await dataManager.getAllChatsForTeacher();

    if (!chats || chats.length === 0) {
        container.style.display = 'none';
        noChats.style.display = 'block';
        lastChatsSignature = 'empty';
        return;
    }

    // Skip DOM update if data unchanged (stops blink from Firestore real-time / repeated calls)
    const signature = chats.map(c =>
        `${c.student.id}|${c.lastMessage?.timestamp ?? ''}|${c.unreadCount}`
    ).join(';');
    if (lastChatsSignature === signature) {
        return;
    }
    lastChatsSignature = signature;

    container.style.display = 'block';
    noChats.style.display = 'none';

    container.innerHTML = chats.map(chat => {
        const { student, lastMessage, unreadCount } = chat;
        const initial = student.name.charAt(0).toUpperCase();
        
        const noMsgLabel = typeof window.t === 'function' ? window.t('no_messages_yet') : 'No messages yet';
        let lastMessageText = noMsgLabel;
        let lastMessageTime = '';
        
        if (lastMessage) {
            const maxLength = 50;
            const youPrefix = typeof window.t === 'function' ? window.t('you_prefix') : 'You: ';
            const prefix = lastMessage.sender === 'teacher' ? youPrefix : '';
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
                        <button class="chat-action-btn" onclick="event.stopPropagation(); window.location.href='/pages/teacher-student-detail.html?studentId=${student.id}';">
                            <i class="fas fa-user"></i> ${typeof window.t === 'function' ? window.t('profile') : 'Profile'}
                        </button>
                        <button class="chat-action-btn" onclick="event.stopPropagation(); window.location.href='/pages/teacher-dashboard.html?studentId=${student.id}#manage-tasks';">
                            <i class="fas fa-tasks"></i> ${typeof window.t === 'function' ? window.t('tasks') : 'Tasks'}
                        </button>
                        <button class="chat-action-btn" onclick="event.stopPropagation(); window.location.href='/pages/teacher-chat.html?studentId=${student.id}';">
                            <i class="fas fa-comments"></i> ${typeof window.t === 'function' ? window.t('chat') : 'Chat'}
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Skeleton HTML for loading state
function getChatsSkeletonHtml() {
    const count = 5;
    return Array.from({ length: count }).map(() => `
        <div class="chat-item skeleton-chat">
            <div class="chat-item-avatar skeleton-avatar"></div>
            <div class="chat-item-content" style="flex:1;">
                <div class="chat-item-header" style="margin-bottom:0.5rem;">
                    <span class="skeleton skeleton-text" style="width:120px;height:1rem;display:block;"></span>
                    <span class="skeleton skeleton-text" style="width:50px;height:0.85rem;display:block;"></span>
                </div>
                <div class="skeleton skeleton-text" style="width:80%;height:0.9rem;"></div>
            </div>
        </div>
    `).join('');
}

// Open Chat
function openChat(studentId) {
    window.location.href = `/pages/teacher-chat.html?studentId=${studentId}`;
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
        return typeof window.t === 'function' ? window.t('yesterday') : 'Yesterday';
    } else if (diffDays < 7) {
        return date.toLocaleDateString('en-US', { weekday: 'short' });
    } else {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
}

// Setup Mobile Menu and overlay
function setupMobileMenu() {
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    
    if (menuToggle) {
        menuToggle.addEventListener('click', function() {
            sidebar.classList.toggle('active');
            toggleOverlay(sidebar.classList.contains('active'));
        });
    }
    
    // Overlay - click to close sidebar
    let overlay = document.getElementById('sidebarOverlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'sidebarOverlay';
        overlay.style.cssText = 'position:fixed;inset:0;z-index:1000;background:rgba(0,0,0,0.35);display:none;';
        document.body.appendChild(overlay);
        overlay.addEventListener('click', () => {
            sidebar.classList.remove('active');
            toggleOverlay(false);
        });
    }
    
    // Bottom nav Menu button
    const bottomNavMenu = document.getElementById('bottomNavMenu');
    if (bottomNavMenu) {
        bottomNavMenu.addEventListener('click', function(e) {
            e.preventDefault();
            sidebar.classList.add('active');
            toggleOverlay(true);
        });
    }
}

function toggleOverlay(show) {
    const overlay = document.getElementById('sidebarOverlay');
    if (overlay) overlay.style.display = show ? 'block' : 'none';
}

