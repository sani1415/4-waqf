// Teacher Dashboard JavaScript

document.addEventListener('DOMContentLoaded', function() {
    initializeTeacherDashboard();
    setupEventListeners();
});

// Initialize Dashboard
function initializeTeacherDashboard() {
    updateDashboard();
    loadStudentCheckboxes();
    updateUnreadBadge();
    
    // Update unread badge every 5 seconds
    setInterval(updateUnreadBadge, 5000);
}

// Update Unread Badge
function updateUnreadBadge() {
    const students = dataManager.getStudents();
    let totalUnread = 0;
    
    students.forEach(student => {
        totalUnread += dataManager.getUnreadCount(student.id, 'teacher');
    });
    
    const badge = document.getElementById('totalUnreadBadge');
    if (badge) {
        if (totalUnread > 0) {
            badge.textContent = totalUnread > 99 ? '99+' : totalUnread;
            badge.style.display = 'inline-block';
        } else {
            badge.style.display = 'none';
        }
    }
}

// Setup Event Listeners
function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function(e) {
            if (this.getAttribute('href') === '#') {
                e.preventDefault();
                const section = this.getAttribute('data-section');
                if (section) {
                    switchSection(section);
                }
            }
        });
    });

    // Menu Toggle for Mobile
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    
    if (menuToggle) {
        menuToggle.addEventListener('click', function() {
            sidebar.classList.toggle('active');
        });
    }

    // Create Task Form
    const taskForm = document.getElementById('createTaskForm');
    if (taskForm) {
        taskForm.addEventListener('submit', handleCreateTask);
    }

    // Task Type Change
    const taskType = document.getElementById('taskType');
    if (taskType) {
        taskType.addEventListener('change', function() {
            updateStudentSelection(this.value);
        });
    }

    // Add Student Form
    const addStudentForm = document.getElementById('addStudentForm');
    if (addStudentForm) {
        addStudentForm.addEventListener('submit', handleAddStudent);
    }
}

// Switch Between Sections
function switchSection(sectionName) {
    // Update nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    event.target.closest('.nav-item').classList.add('active');

    // Update sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });

    const targetSection = document.getElementById(sectionName + '-section');
    if (targetSection) {
        targetSection.classList.add('active');
    }

    // Refresh data for the section
    if (sectionName === 'dashboard') {
        updateDashboard();
    } else if (sectionName === 'students') {
        loadStudentsList();
    } else if (sectionName === 'analytics') {
        updateAnalytics();
    }
}

// Update Dashboard
function updateDashboard() {
    const stats = dataManager.getOverallStats();
    
    // Update stat cards
    document.getElementById('totalStudents').textContent = stats.totalStudents;
    document.getElementById('totalTasks').textContent = stats.totalAssignments;
    document.getElementById('completedTasks').textContent = stats.completedAssignments;
    document.getElementById('pendingTasks').textContent = stats.pendingAssignments;

    // Load students progress
    loadStudentsProgress();
}

// Load Students Progress
function loadStudentsProgress() {
    const progressList = document.getElementById('studentsProgressList');
    const studentsProgress = dataManager.getStudentProgress();

    if (studentsProgress.length === 0) {
        progressList.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 2rem;">No students found. Add students to get started.</p>';
        return;
    }

    progressList.innerHTML = studentsProgress.map(item => {
        const { student, stats } = item;
        const initial = student.name.charAt(0).toUpperCase();
        const badgeClass = stats.percentage >= 80 ? 'success' : stats.percentage >= 50 ? 'warning' : 'danger';
        const badgeStyle = stats.percentage >= 80 ? 'background: #C8E6C9; color: #2E7D32;' : 
                          stats.percentage >= 50 ? 'background: #FFE0B2; color: #E65100;' : 
                          'background: #FFCDD2; color: #C62828;';

        return `
            <div class="student-progress-item fade-in" onclick="viewStudentDetail(${student.id})" style="cursor: pointer;">
                <div class="student-info">
                    <div class="student-name-section">
                        <div class="student-avatar">${initial}</div>
                        <span class="student-name">${student.name}</span>
                    </div>
                    <span class="completion-badge" style="${badgeStyle}">
                        ${stats.completed}/${stats.total} Tasks
                    </span>
                </div>
                <div class="progress-details">
                    <div class="progress-bar-wrapper">
                        <div class="progress-bar-container">
                            <div class="progress-bar" style="width: ${stats.percentage}%"></div>
                        </div>
                    </div>
                    <span class="progress-percentage">${stats.percentage}%</span>
                </div>
            </div>
        `;
    }).join('');
}

// Load Student Checkboxes for Task Assignment
function loadStudentCheckboxes() {
    const container = document.getElementById('studentCheckboxes');
    const students = dataManager.getStudents();

    if (students.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">No students available. Add students first.</p>';
        return;
    }

    container.innerHTML = students.map(student => `
        <label class="checkbox-item">
            <input type="checkbox" name="assignedStudents" value="${student.id}">
            <span>${student.name}</span>
        </label>
    `).join('');
}

// Update Student Selection Based on Task Type
function updateStudentSelection(taskType) {
    const container = document.getElementById('studentCheckboxes');
    if (taskType === 'group') {
        container.style.opacity = '0.6';
        container.style.pointerEvents = 'none';
        // Select all for group tasks
        container.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = true);
    } else {
        container.style.opacity = '1';
        container.style.pointerEvents = 'auto';
    }
}

// Handle Create Task
function handleCreateTask(e) {
    e.preventDefault();

    const title = document.getElementById('taskTitle').value.trim();
    const description = document.getElementById('taskDescription').value.trim();
    const type = document.getElementById('taskType').value;
    const deadline = document.getElementById('taskDeadline').value;

    // Get selected students
    const selectedStudents = Array.from(
        document.querySelectorAll('input[name="assignedStudents"]:checked')
    ).map(cb => parseInt(cb.value));

    if (selectedStudents.length === 0) {
        alert('Please select at least one student!');
        return;
    }

    const newTask = {
        title: title,
        description: description,
        type: type,
        assignedTo: selectedStudents,
        deadline: deadline
    };

    dataManager.addTask(newTask);

    // Reset form
    e.target.reset();
    
    // Show success message
    alert('Task created successfully!');
    
    // Update dashboard
    updateDashboard();
    loadStudentCheckboxes();
}

// Load Students List
function loadStudentsList() {
    const container = document.getElementById('studentsList');
    const students = dataManager.getStudents();

    if (students.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 2rem;">No students found. Click "Add Student" to get started.</p>';
        return;
    }

    container.innerHTML = students.map(student => {
        const initial = student.name.charAt(0).toUpperCase();
        const stats = dataManager.getStudentStats(student.id);

        return `
            <div class="student-card fade-in">
                <div class="student-card-avatar" onclick="viewStudentDetail(${student.id})" style="cursor: pointer;">${initial}</div>
                <h3 onclick="viewStudentDetail(${student.id})" style="cursor: pointer;">${student.name}</h3>
                <p>${student.email || 'No email provided'}</p>
                <p style="color: var(--primary-soft); font-weight: 600; margin-bottom: 1rem; cursor: pointer;" onclick="viewStudentDetail(${student.id})">
                    ${stats.completed}/${stats.total} tasks completed
                </p>
                <div style="display: flex; gap: 0.5rem; justify-content: center;">
                    <button class="btn-secondary" onclick="viewStudentDetail(${student.id})" style="flex: 1;">
                        <i class="fas fa-eye"></i> View
                    </button>
                    <button class="delete-btn" onclick="event.stopPropagation(); deleteStudent(${student.id})" style="flex: 1;">
                        <i class="fas fa-trash"></i> Remove
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Show Add Student Modal
function showAddStudentModal() {
    document.getElementById('addStudentModal').style.display = 'block';
}

// Close Add Student Modal
function closeAddStudentModal() {
    document.getElementById('addStudentModal').style.display = 'none';
    document.getElementById('addStudentForm').reset();
}

// Handle Add Student
function handleAddStudent(e) {
    e.preventDefault();

    const name = document.getElementById('studentName').value.trim();
    const email = document.getElementById('studentEmail').value.trim();

    if (!name) {
        alert('Please enter student name!');
        return;
    }

    dataManager.addStudent({ name, email });

    closeAddStudentModal();
    loadStudentsList();
    loadStudentCheckboxes();
    updateDashboard();
    
    alert('Student added successfully!');
}

// Delete Student
function deleteStudent(id) {
    if (confirm('Are you sure you want to remove this student? This action cannot be undone.')) {
        dataManager.deleteStudent(id);
        loadStudentsList();
        loadStudentCheckboxes();
        updateDashboard();
    }
}

// Update Analytics
function updateAnalytics() {
    const stats = dataManager.getOverallStats();

    document.getElementById('overallCompletion').textContent = stats.overallCompletion + '%';
    document.getElementById('individualCount').textContent = stats.individualTasks;
    document.getElementById('groupCount').textContent = stats.groupTasks;
}

// View Student Detail
function viewStudentDetail(studentId) {
    window.location.href = `teacher-student-detail.html?studentId=${studentId}`;
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('addStudentModal');
    if (event.target === modal) {
        closeAddStudentModal();
    }
}

