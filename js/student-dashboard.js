// Student Dashboard JavaScript

let currentStudent = null;

document.addEventListener('DOMContentLoaded', function() {
    initializeStudentDashboard();
    setupMobileMenu();
    updateUnreadBadge();
    
    // Update unread badge every 5 seconds
    setInterval(updateUnreadBadge, 5000);
});

// Update Unread Badge
function updateUnreadBadge() {
    if (!currentStudent) return;
    
    const unreadCount = dataManager.getUnreadCount(currentStudent.id, 'student');
    const badge = document.getElementById('unreadBadge');
    
    if (badge) {
        if (unreadCount > 0) {
            badge.style.display = 'block';
        } else {
            badge.style.display = 'none';
        }
    }
}

// Initialize Student Dashboard
function initializeStudentDashboard() {
    // Get current student ID from sessionStorage
    const studentId = sessionStorage.getItem('currentStudentId');

    if (!studentId) {
        // Redirect to student list if no student selected
        window.location.href = 'student-list.html';
        return;
    }

    currentStudent = dataManager.getStudentById(parseInt(studentId));

    if (!currentStudent) {
        alert('Student not found!');
        window.location.href = 'student-list.html';
        return;
    }

    // Load student data
    loadStudentProfile();
    loadStudentStats();
    loadStudentTasks();
}

// Load Student Profile
function loadStudentProfile() {
    const initial = currentStudent.name.charAt(0).toUpperCase();
    
    // Update profile in sidebar
    document.querySelector('.student-profile-avatar').textContent = initial;
    const sidebarName = document.getElementById('studentNameSidebar');
    const sidebarRole = document.getElementById('studentRole');
    const headerName = document.getElementById('studentNameHeader');
    
    if (sidebarName) sidebarName.textContent = currentStudent.name;
    if (sidebarRole) sidebarRole.textContent = currentStudent.email || 'Student';
    if (headerName) headerName.textContent = `Welcome, ${currentStudent.name.split(' ')[0]}!`;
}

// Load Student Stats
function loadStudentStats() {
    const stats = dataManager.getStudentStats(currentStudent.id);

    // Update progress summary in sidebar
    const sidebarProgress = document.getElementById('sidebarProgress');
    if (sidebarProgress) {
        sidebarProgress.textContent = stats.percentage + '%';
    }

    // Update quick stats
    const quickStats = document.getElementById('quickStats');
    if (quickStats) {
        quickStats.innerHTML = `
            <div class="quick-stat-item">
                <span>Total Tasks</span>
                <span>${stats.total}</span>
            </div>
            <div class="quick-stat-item">
                <span>Completed</span>
                <span style="color: var(--success-soft);">${stats.completed}</span>
            </div>
            <div class="quick-stat-item">
                <span>Pending</span>
                <span style="color: var(--warning-soft);">${stats.pending}</span>
            </div>
        `;
    }
}

// Load Student Tasks
function loadStudentTasks() {
    const tasks = dataManager.getTasksForStudent(currentStudent.id);
    const pendingTasks = tasks.filter(task => 
        !task.completedBy.includes(currentStudent.id)
    );
    const completedTasks = tasks.filter(task => 
        task.completedBy.includes(currentStudent.id)
    );

    loadTaskSection('pendingTasksList', pendingTasks, false);
    loadTaskSection('completedTasksList', completedTasks, true);
}

// Load Task Section
function loadTaskSection(containerId, tasks, isCompleted) {
    const container = document.getElementById(containerId);

    if (tasks.length === 0) {
        const message = isCompleted ? 
            'No completed tasks yet. Complete tasks to see them here!' :
            'Great job! You have no pending tasks!';
        
        container.innerHTML = `
            <div class="no-tasks">
                <i class="fas fa-check-circle"></i>
                <p>${message}</p>
            </div>
        `;
        return;
    }

    container.innerHTML = tasks.map(task => {
        const isTaskCompleted = task.completedBy.includes(currentStudent.id);
        const deadlineDate = task.deadline ? new Date(task.deadline).toLocaleDateString() : 'No deadline';
        const daysLeft = task.deadline ? calculateDaysLeft(task.deadline) : null;

        return `
            <div class="task-item ${isTaskCompleted ? 'completed' : ''} fade-in">
                <div class="task-header">
                    <div class="task-checkbox">
                        <input type="checkbox" 
                               id="task-${task.id}" 
                               ${isTaskCompleted ? 'checked' : ''}
                               onchange="toggleTask(${task.id})">
                    </div>
                    <div class="task-content">
                        <div class="task-title">${task.title}</div>
                        ${task.description ? `<div class="task-description">${task.description}</div>` : ''}
                        <div class="task-meta">
                            <span class="task-badge ${task.type}">${task.type === 'individual' ? 'Individual' : 'Group'}</span>
                            ${task.deadline ? `
                                <div class="task-meta-item">
                                    <i class="fas fa-calendar"></i>
                                    <span>Due: ${deadlineDate}</span>
                                </div>
                            ` : ''}
                            ${daysLeft !== null && !isTaskCompleted ? `
                                <div class="task-meta-item" style="color: ${daysLeft < 0 ? '#C62828' : daysLeft <= 2 ? '#E65100' : 'inherit'};">
                                    <i class="fas fa-clock"></i>
                                    <span>${getDaysLeftText(daysLeft)}</span>
                                </div>
                            ` : ''}
                            ${task.type === 'group' ? `
                                <div class="task-meta-item">
                                    <i class="fas fa-users"></i>
                                    <span>${task.completedBy.length}/${task.assignedTo.length} completed</span>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Toggle Task Completion
function toggleTask(taskId) {
    dataManager.toggleTaskCompletion(taskId, currentStudent.id);
    
    // Reload everything with animation
    setTimeout(() => {
        loadStudentStats();
        loadStudentTasks();
    }, 200);
}

// Calculate Days Left
function calculateDaysLeft(deadline) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadlineDate = new Date(deadline);
    deadlineDate.setHours(0, 0, 0, 0);
    const diffTime = deadlineDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
}

// Get Days Left Text
function getDaysLeftText(days) {
    if (days < 0) {
        return `Overdue by ${Math.abs(days)} day${Math.abs(days) !== 1 ? 's' : ''}`;
    } else if (days === 0) {
        return 'Due today';
    } else if (days === 1) {
        return 'Due tomorrow';
    } else {
        return `${days} days left`;
    }
}

// Setup Mobile Menu
function setupMobileMenu() {
    const backBtn = document.querySelector('.back-btn');
    const sidebar = document.querySelector('.student-sidebar');

    if (window.innerWidth <= 1024) {
        // Add menu toggle button for mobile
        const menuToggle = document.createElement('button');
        menuToggle.className = 'menu-toggle';
        menuToggle.innerHTML = '<i class="fas fa-bars"></i>';
        menuToggle.style.cssText = 'position: fixed; top: 1rem; left: 1rem; z-index: 101; background: white; border: none; padding: 0.75rem; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); cursor: pointer; font-size: 1.25rem; color: var(--text-primary);';
        
        document.body.appendChild(menuToggle);

        menuToggle.addEventListener('click', function() {
            sidebar.classList.toggle('active');
        });

        // Close sidebar when clicking outside
        document.addEventListener('click', function(e) {
            if (!sidebar.contains(e.target) && !menuToggle.contains(e.target)) {
                sidebar.classList.remove('active');
            }
        });
    }
}

// Logout / Go Back
function goBackToList() {
    sessionStorage.removeItem('currentStudentId');
    window.location.href = 'student-list.html';
}

