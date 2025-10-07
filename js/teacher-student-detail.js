// Teacher Student Detail Page JavaScript

let currentStudent = null;

document.addEventListener('DOMContentLoaded', function() {
    initializeStudentDetail();
    setupMobileMenu();
});

// Initialize Student Detail Page
function initializeStudentDetail() {
    // Get student ID from URL parameter or sessionStorage
    const urlParams = new URLSearchParams(window.location.search);
    const studentId = urlParams.get('studentId') || sessionStorage.getItem('viewStudentId');

    if (!studentId) {
        alert('No student selected!');
        window.location.href = 'teacher-dashboard.html';
        return;
    }

    currentStudent = dataManager.getStudentById(parseInt(studentId));

    if (!currentStudent) {
        alert('Student not found!');
        window.location.href = 'teacher-dashboard.html';
        return;
    }

    // Store in sessionStorage for page refresh
    sessionStorage.setItem('viewStudentId', studentId);

    // Load all student data
    loadStudentProfile();
    loadStudentStats();
    loadStudentTasks();
}

// Load Student Profile
function loadStudentProfile() {
    const initial = currentStudent.name.charAt(0).toUpperCase();
    
    document.getElementById('studentAvatar').textContent = initial;
    document.getElementById('studentName').textContent = currentStudent.name;
    document.getElementById('studentEmail').textContent = currentStudent.email || 'No email provided';
}

// Load Student Stats
function loadStudentStats() {
    const stats = dataManager.getStudentStats(currentStudent.id);

    // Update stat cards
    document.getElementById('completedCount').textContent = stats.completed;
    document.getElementById('pendingCount').textContent = stats.pending;
    document.getElementById('totalCount').textContent = stats.total;
    document.getElementById('progressPercentage').textContent = stats.percentage + '%';

    // Update progress circle
    const progressCircle = document.querySelector('.progress-circle-outer');
    if (progressCircle) {
        const degrees = (stats.percentage / 100) * 360;
        progressCircle.style.setProperty('--progress-degree', degrees + 'deg');
    }

    // Update task count badges
    document.getElementById('pendingCountBadge').textContent = 
        stats.pending + (stats.pending === 1 ? ' task' : ' tasks');
    document.getElementById('completedCountBadge').textContent = 
        stats.completed + (stats.completed === 1 ? ' task' : ' tasks');
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
            'No completed tasks yet.' :
            'Great! No pending tasks.';
        
        container.innerHTML = `
            <div class="empty-state-detailed">
                <i class="fas fa-${isCompleted ? 'clipboard-check' : 'check-circle'}"></i>
                <h3>${message}</h3>
                <p>${isCompleted ? 'Tasks will appear here once completed.' : 'All tasks have been completed!'}</p>
            </div>
        `;
        return;
    }

    container.innerHTML = tasks.map(task => {
        const isTaskCompleted = task.completedBy.includes(currentStudent.id);
        const deadlineDate = task.deadline ? new Date(task.deadline).toLocaleDateString() : null;
        const daysLeft = task.deadline ? calculateDaysLeft(task.deadline) : null;
        
        // Determine deadline class
        let deadlineClass = 'normal';
        if (daysLeft !== null && !isTaskCompleted) {
            if (daysLeft < 0) deadlineClass = 'overdue';
            else if (daysLeft <= 2) deadlineClass = 'soon';
        }

        return `
            <div class="task-detail-card ${isTaskCompleted ? 'completed' : ''} fade-in">
                <div class="task-detail-header">
                    <div class="task-detail-title">
                        <h3>${task.title}</h3>
                        ${task.description ? `<div class="task-detail-description">${task.description}</div>` : ''}
                    </div>
                    <span class="task-status-badge ${isTaskCompleted ? 'completed' : 'pending'}">
                        <i class="fas fa-${isTaskCompleted ? 'check-circle' : 'clock'}"></i>
                        ${isTaskCompleted ? 'Completed' : 'Pending'}
                    </span>
                </div>
                
                <div class="task-detail-meta">
                    <span class="task-type-badge ${task.type}">
                        <i class="fas fa-${task.type === 'individual' ? 'user' : 'users'}"></i>
                        ${task.type === 'individual' ? 'Individual' : 'Group'}
                    </span>
                    
                    ${task.deadline ? `
                        <span class="deadline-badge ${deadlineClass}">
                            <i class="fas fa-calendar"></i>
                            Due: ${deadlineDate}
                            ${daysLeft !== null && !isTaskCompleted ? ` (${getDaysLeftText(daysLeft)})` : ''}
                        </span>
                    ` : ''}
                    
                    ${task.type === 'group' ? `
                        <div class="meta-item">
                            <i class="fas fa-users"></i>
                            <span>${task.completedBy.length}/${task.assignedTo.length} completed</span>
                        </div>
                    ` : ''}
                    
                    ${isTaskCompleted ? `
                        <div class="meta-item" style="color: var(--success-soft);">
                            <i class="fas fa-check-double"></i>
                            <span>Task completed</span>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
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
        return `${Math.abs(days)} day${Math.abs(days) !== 1 ? 's' : ''} overdue`;
    } else if (days === 0) {
        return 'Due today';
    } else if (days === 1) {
        return 'Due tomorrow';
    } else {
        return `${days} days left`;
    }
}

// Go Back to Dashboard
function goBack() {
    sessionStorage.removeItem('viewStudentId');
    window.location.href = 'teacher-dashboard.html#students';
}

// Assign New Task
function assignNewTask() {
    sessionStorage.removeItem('viewStudentId');
    window.location.href = 'teacher-dashboard.html#create-task';
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

