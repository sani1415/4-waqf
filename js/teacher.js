// Teacher Dashboard JavaScript
// NOTE: This file is being updated to work with async storage adapters
// Some functions may still need async/await additions

// Initialize task filter at the top level to avoid temporal dead zone issues
let currentTaskFilter = 'all';

document.addEventListener('DOMContentLoaded', function() {
    // Wait for dataManager to be ready before initializing
    if (typeof dataManager !== 'undefined' && dataManager.initialized) {
        initializePage();
    } else {
        window.addEventListener('dataManagerReady', initializePage);
    }
});

// Hash routing support for teacher-dashboard.html
// Allows external links like teacher-dashboard.html#students to open the correct section.
let __isUpdatingHash = false;

function hashToSection(hash) {
    const h = String(hash || '').replace(/^#/, '').trim();
    const map = {
        'dashboard': 'dashboard',
        'manage-tasks': 'manage-tasks',
        'create-task': 'manage-tasks', // legacy link used by some pages
        'students': 'students',
        'daily-overview': 'daily-overview',
        'analytics': 'analytics'
    };
    return map[h] || null;
}

function sectionToHash(sectionName) {
    const map = {
        'dashboard': 'dashboard',
        'manage-tasks': 'manage-tasks',
        'students': 'students',
        'daily-overview': 'daily-overview',
        'analytics': 'analytics'
    };
    return map[sectionName] || null;
}

async function applySectionFromHash() {
    try {
        const section = hashToSection(window.location.hash);
        if (!section) return;
        await switchSection(section);

        // Extra UX: if hash was create-task, bring the create task form into view
        if (String(window.location.hash).replace(/^#/, '') === 'create-task') {
            const form = document.getElementById('createTaskForm');
            if (form && typeof form.scrollIntoView === 'function') {
                form.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }
    } catch (e) {
        console.warn('⚠️ Failed to apply section from hash:', e);
    }
}

// Initialize page after dataManager is ready
function initializePage() {
    setupDataManagerHelpers(); // Set up helper functions on dataManager
    initializeTeacherDashboard();
    setupEventListeners();

    // Apply hash on first load (e.g., teacher-dashboard.html#students)
    applySectionFromHash();

    // Keep UI in sync if the hash changes (manual edit or internal links)
    window.addEventListener('hashchange', () => {
        if (__isUpdatingHash) return;
        applySectionFromHash();
    });
}

// Initialize Dashboard
async function initializeTeacherDashboard() {
    await updateDashboard();
    await loadStudentCheckboxes();
    await updateUnreadBadge();
    
    // Update unread badge every 5 seconds
    setInterval(updateUnreadBadge, 5000);
}

// Update Unread Badge
async function updateUnreadBadge() {
    const students = await dataManager.getStudents();
    let totalUnread = 0;
    
    for (const student of students) {
        totalUnread += await dataManager.getUnreadCount(student.id, 'teacher');
    }
    
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
                    switchSection(section, this);
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
            toggleOverlay();
        });
    }

    // Bottom nav (mobile) - section switches
    document.querySelectorAll('.bottom-nav-item[data-section]').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const section = this.getAttribute('data-section');
            if (section) {
                sidebar.classList.remove('active');
                toggleOverlay(false);
                switchSection(section, document.querySelector(`.nav-item[data-section="${section}"]`));
            }
        });
    });

    // Bottom nav Menu button - opens sidebar
    const bottomNavMenu = document.getElementById('bottomNavMenu');
    if (bottomNavMenu) {
        bottomNavMenu.addEventListener('click', function(e) {
            e.preventDefault();
            sidebar.classList.add('active');
            toggleOverlay(true);
        });
    }

    // Click outside to close on mobile (exclude bottom nav - it has its own handlers)
    document.addEventListener('click', function(e) {
        if (window.innerWidth <= 1024 && sidebar.classList.contains('active')) {
            const clickedInsideSidebar = sidebar.contains(e.target) || (menuToggle && menuToggle.contains(e.target));
            const clickedBottomNav = document.getElementById('bottomNav') && document.getElementById('bottomNav').contains(e.target);
            if (!clickedInsideSidebar && !clickedBottomNav) {
                sidebar.classList.remove('active');
                toggleOverlay(false);
            }
        }
    });

    // Progress tabs (Daily, One-time, Spreadsheet)
    setupProgressTabs();

    // Create Task Form
    const taskForm = document.getElementById('createTaskForm');
    if (taskForm) {
        taskForm.addEventListener('submit', handleCreateTask);
    }

    // Add Student Form
    const addStudentForm = document.getElementById('addStudentForm');
    if (addStudentForm) {
        addStudentForm.addEventListener('submit', handleAddStudent);
    }
}

// Overlay helper for mobile sidebar
function toggleOverlay(show = true) {
    let overlay = document.getElementById('sidebarOverlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'sidebarOverlay';
        overlay.style.cssText = 'position:fixed;inset:0;z-index:1000;background:rgba(0,0,0,0.35);display:none;';
        document.body.appendChild(overlay);
        overlay.addEventListener('click', () => {
            const sidebar = document.getElementById('sidebar');
            sidebar.classList.remove('active');
            toggleOverlay(false);
        });
    }
    overlay.style.display = show ? 'block' : 'none';
}

// Switch Between Sections
async function switchSection(sectionName, clickedElement) {
    // Update sidebar nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    // Use the passed element or find by data-section attribute
    if (clickedElement) {
        const nav = clickedElement.closest('.nav-item');
        if (nav) nav.classList.add('active');
    } else {
        const navItem = document.querySelector(`.nav-item[data-section="${sectionName}"]`);
        if (navItem) navItem.classList.add('active');
    }

    // Sync bottom nav active state
    document.querySelectorAll('.bottom-nav-item[data-section]').forEach(item => {
        item.classList.toggle('active', item.getAttribute('data-section') === sectionName);
    });

    // Update sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });

    const targetSection = document.getElementById(sectionName + '-section');
    if (targetSection) {
        targetSection.classList.add('active');
    }
    
    // Load data for daily overview when switching to that section
    if (sectionName === 'daily-overview') {
        await selectTodayOverview(); // Initialize with today's data
    } else if (sectionName === 'manage-tasks') {
        await loadAllTasks(); // Load all tasks
    }

    // Refresh data for the section
    if (sectionName === 'dashboard') {
        await updateDashboard();
    } else if (sectionName === 'students') {
        await loadStudentsList();
    } else if (sectionName === 'analytics') {
        await updateAnalytics();
    }

    // Update URL hash to reflect current section (without jumping/scrolling)
    try {
        const hash = sectionToHash(sectionName);
        if (hash && window.location.hash !== `#${hash}`) {
            __isUpdatingHash = true;
            window.history.replaceState(null, '', `#${hash}`);
        }
    } catch (e) {
        // ignore
    } finally {
        // release flag on next tick so hashchange triggered by other code still works
        setTimeout(() => { __isUpdatingHash = false; }, 0);
    }
}

// Update Dashboard
async function updateDashboard() {
    const stats = await dataManager.getOverallStats();
    
    // Update stat cards
    document.getElementById('totalStudents').textContent = stats.totalStudents;
    document.getElementById('totalTasks').textContent = stats.totalAssignments;
    document.getElementById('completedTasks').textContent = stats.completedAssignments;
    document.getElementById('pendingTasks').textContent = stats.pendingAssignments;

    // Load students progress
    await loadStudentsProgress();
}

// Load Students Progress (Daily, One-time, Spreadsheet views)
async function loadStudentsProgress() {
    const dailyList = document.getElementById('studentsProgressListDaily');
    const onetimeList = document.getElementById('studentsProgressListOnetime');
    const spreadsheetWrap = document.getElementById('studentsProgressSpreadsheet');

    const skeletonHtml = `
        <div class="skeleton-list">
            ${Array.from({length: 5}).map(() => `
                <div style="display:flex;align-items:center;gap:12px;">
                    <div class="skeleton skeleton-avatar"></div>
                    <div style="flex:1;">
                        <div class="skeleton skeleton-title" style="width:40%"></div>
                        <div class="skeleton skeleton-text" style="width:70%"></div>
                    </div>
                    <div class="skeleton skeleton-badge"></div>
                </div>
            `).join('')}
        </div>`;

    if (dailyList) dailyList.innerHTML = skeletonHtml;
    if (onetimeList) onetimeList.innerHTML = skeletonHtml;
    if (spreadsheetWrap) spreadsheetWrap.innerHTML = '<div class="skeleton-list"><div class="skeleton skeleton-text" style="height:200px;"></div></div>';

    const studentsProgress = await dataManager.getStudentProgress();
    const today = getDateStringOverview(new Date());
    const dailyTasks = await dataManager.getDailyTasks();
    const tasks = await dataManager.getTasks();
    const oneTimeTasks = tasks.filter(t => t.type === 'one-time');

    const emptyMsg = '<p style="text-align: center; color: var(--text-secondary); padding: 2rem;">No students found. Add students to get started.</p>';

    if (studentsProgress.length === 0) {
        if (dailyList) dailyList.innerHTML = emptyMsg;
        if (onetimeList) onetimeList.innerHTML = emptyMsg;
        if (spreadsheetWrap) spreadsheetWrap.innerHTML = emptyMsg;
        return;
    }

    // Build Daily view
    if (dailyList) {
        dailyList.innerHTML = studentsProgress.map(item => {
            const { student, stats } = item;
            const initial = student.name.charAt(0).toUpperCase();
            const dailyPercentage = stats.dailyTotal > 0 ? Math.round((stats.dailyCompletedToday / stats.dailyTotal) * 100) : 0;
            const badgeBg = dailyPercentage >= 80 ? '#e8f5e9' : dailyPercentage >= 50 ? '#fff3e0' : '#ffebee';
            const badgeColor = dailyPercentage >= 80 ? '#2e7d32' : dailyPercentage >= 50 ? '#e65100' : '#c62828';
            const barBg = dailyPercentage >= 80 ? 'linear-gradient(90deg,#88B68D,#9DC9A3)' : 'linear-gradient(90deg,#FF9800,#FFB74D)';
            return `
                <div class="student-summary-row" onclick="viewStudentDetail(${student.id})" style="cursor: pointer;">
                    <div class="student-avatar">${initial}</div>
                    <div class="student-info">
                        <div class="student-name" title="${(student.name || '').replace(/"/g, '&quot;')}">${student.name}</div>
                        <div class="student-grade">${student.grade || 'N/A'} • Section ${student.section || 'N/A'} • ${stats.dailyCompletedToday}/${stats.dailyTotal} tasks</div>
                    </div>
                    <span class="completion-badge" style="background:${badgeBg};color:${badgeColor};">${dailyPercentage}%</span>
                    <div class="progress-bar-container"><div class="progress-bar" style="width:${dailyPercentage}%;background:${barBg};"></div></div>
                </div>
            `;
        }).join('');
    }

    // Build One-time view
    if (onetimeList) {
        onetimeList.innerHTML = studentsProgress.map(item => {
            const { student, stats } = item;
            const initial = student.name.charAt(0).toUpperCase();
            const badgeBg = stats.percentage >= 80 ? '#e8f5e9' : stats.percentage >= 50 ? '#e3f2fd' : '#ffebee';
            const badgeColor = stats.percentage >= 80 ? '#2e7d32' : stats.percentage >= 50 ? '#1565c0' : '#c62828';
            const barBg = stats.percentage >= 80 ? 'linear-gradient(90deg,#88B68D,#9DC9A3)' : 'linear-gradient(90deg,#2196F3,#64B5F6)';
            return `
                <div class="student-summary-row" onclick="viewStudentDetail(${student.id})" style="cursor: pointer;">
                    <div class="student-avatar">${initial}</div>
                    <div class="student-info">
                        <div class="student-name" title="${(student.name || '').replace(/"/g, '&quot;')}">${student.name}</div>
                        <div class="student-grade">${student.grade || 'N/A'} • Section ${student.section || 'N/A'} • ${stats.completed}/${stats.total} tasks</div>
                    </div>
                    <span class="completion-badge" style="background:${badgeBg};color:${badgeColor};">${stats.percentage}%</span>
                    <div class="progress-bar-container"><div class="progress-bar" style="width:${stats.percentage}%;background:${barBg};"></div></div>
                </div>
            `;
        }).join('');
    }

    // Build Spreadsheet view
    if (spreadsheetWrap && (dailyTasks.length > 0 || oneTimeTasks.length > 0)) {
        const allTasks = [...dailyTasks, ...oneTimeTasks];
        const taskCols = allTasks.map(t => `<th class="task-col" title="${(t.title || '').replace(/"/g, '&quot;')}">${truncateTextOverview(t.title || 'Task', 15)}</th>`).join('');

        const rows = [];
        for (const item of studentsProgress) {
            const { student } = item;
            const cells = [];
            for (const task of allTasks) {
                const isAssigned = task.assignedTo && task.assignedTo.includes(parseInt(student.id));
                let icon = '<span class="cross">✗</span>';
                if (isAssigned) {
                    const completed = task.type === 'daily'
                        ? await dataManager.isDailyTaskCompletedForDate(task.id, student.id, today)
                        : (task.completedBy && task.completedBy.includes(parseInt(student.id)));
                    icon = completed ? '<span class="tick">✓</span>' : '<span class="cross">✗</span>';
                } else {
                    icon = '<span style="color:#94A3B8;">—</span>';
                }
                cells.push(`<td>${icon}</td>`);
            }
            rows.push(`
                <tr onclick="viewStudentDetail(${student.id})" style="cursor: pointer;">
                    <td class="student-col">${student.name}</td>
                    ${cells.join('')}
                </tr>
            `);
        }

        spreadsheetWrap.innerHTML = `
            <table class="spreadsheet-table">
                <thead>
                    <tr>
                        <th class="student-col">Student</th>
                        ${taskCols}
                    </tr>
                </thead>
                <tbody>
                    ${rows.join('')}
                </tbody>
            </table>
        `;
    } else if (spreadsheetWrap) {
        spreadsheetWrap.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 2rem;">No tasks assigned yet. Create tasks to see the spreadsheet view.</p>';
    }
}

// Setup progress tab switching (Daily, One-time, Spreadsheet)
function setupProgressTabs() {
    document.querySelectorAll('.progress-tab').forEach(btn => {
        btn.addEventListener('click', function() {
            const view = this.getAttribute('data-progress-view');
            document.querySelectorAll('.progress-tab').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.progress-view').forEach(v => v.classList.remove('active'));
            this.classList.add('active');
            const el = document.getElementById('view-' + view);
            if (el) el.classList.add('active');
        });
    });
}

// Load Student Checkboxes for Task Assignment
async function loadStudentCheckboxes() {
    const container = document.getElementById('studentCheckboxes');
    const students = await dataManager.getStudents();

    if (students.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">No students available. Add students first.</p>';
        return;
    }

    // Optional: pre-select a specific student if coming from another screen
    let targetId = null;
    try {
        const params = new URLSearchParams(window.location.search);
        const fromUrl = params.get('studentId');
        const fromSession = typeof sessionStorage !== 'undefined'
            ? sessionStorage.getItem('assignTaskStudentId')
            : null;
        if (fromUrl || fromSession) {
            targetId = parseInt(fromUrl || fromSession);
        }
    } catch (e) {
        // ignore
    }

    let foundTarget = false;
    container.innerHTML = students.map(student => {
        const isTarget = targetId && student.id === targetId;
        if (isTarget) foundTarget = true;
        return `
            <label class="checkbox-item">
                <input type="checkbox" name="assignedStudents" value="${student.id}" ${isTarget ? 'checked' : ''}>
                <span>${student.name}</span>
            </label>
        `;
    }).join('');

    if (foundTarget) {
        // Ensure "Assign to All" is off and individual selection is enabled
        const assignToAll = document.getElementById('assignToAll');
        if (assignToAll) {
            assignToAll.checked = false;
        }
        container.style.opacity = '1';
        container.style.pointerEvents = 'auto';

        // Clear hints so it doesn't keep auto-selecting on future visits
        try {
            if (typeof sessionStorage !== 'undefined') {
                sessionStorage.removeItem('assignTaskStudentId');
            }
            const url = new URL(window.location.href);
            url.searchParams.delete('studentId');
            window.history.replaceState(null, '', url.toString());
        } catch (e) {
            // ignore
        }
    }
}

// Handle Task Type Change
function handleTaskTypeChange() {
    const taskType = document.getElementById('taskType').value;
    const deadlineGroup = document.getElementById('deadlineGroup');
    const taskTypeHint = document.getElementById('taskTypeHint');
    
    if (taskType === 'daily') {
        // Hide deadline for daily tasks
        deadlineGroup.style.display = 'none';
        taskTypeHint.style.display = 'block';
    } else {
        deadlineGroup.style.display = 'block';
        taskTypeHint.style.display = 'none';
    }
}

// Handle Assign to All Students Change
function handleAssignToAllChange() {
    const assignToAll = document.getElementById('assignToAll');
    const container = document.getElementById('studentCheckboxes');
    const checkboxes = container.querySelectorAll('input[type="checkbox"]');
    
    if (assignToAll.checked) {
        // Check all students and disable individual selection
        checkboxes.forEach(cb => cb.checked = true);
        container.style.opacity = '0.5';
        container.style.pointerEvents = 'none';
    } else {
        // Enable individual selection
        container.style.opacity = '1';
        container.style.pointerEvents = 'auto';
    }
}

// Handle Create Task
async function handleCreateTask(e) {
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

    await dataManager.addTask(newTask);

    // Reset form
    e.target.reset();
    
    // Show success message
    alert('✅ Task created successfully!');
    
    // Update dashboard and task list
    await updateDashboard();
    await loadStudentCheckboxes();
    
    // Switch to View All Tasks tab
    await switchManageTaskTabProgrammatic('view');
}

// Load Students List
async function loadStudentsList() {
    const container = document.getElementById('studentsList');
    const students = await dataManager.getStudents();

    // Update student count badge
    updateStudentCount(students.length);

    if (students.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 2rem;">No students found. Click "Add Student" to get started.</p>';
        return;
    }

    const studentsHTML = [];
    for (const student of students) {
        const initial = student.name.charAt(0).toUpperCase();
        const stats = await dataManager.getStudentStats(student.id);
        
        // Calculate percentages for dual progress bars
        const dailyPercent = stats.dailyTotal > 0 ? Math.round((stats.dailyCompletedToday / stats.dailyTotal) * 100) : 0;
        const oneTimePercent = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

        studentsHTML.push(`
            <div class="student-card fade-in">
                <div class="student-card-header" onclick="viewStudentDetail(${student.id})" style="cursor: pointer;">
                    <div class="student-card-avatar">${initial}</div>
                    <div>
                        <h3 class="student-name">${student.name}</h3>
                        <p class="student-meta">${student.grade || 'No grade'}${student.phone ? ` • ${student.phone}` : ''}</p>
                    </div>
                </div>
                
                <!-- New: Grade and Phone badges -->
                <div class="compact-badges">
                    <span class="mini-badge">${student.grade || 'N/A'}</span>
                    ${student.phone ? `<span class="mini-badge"><i class="fas fa-phone"></i> ${student.phone}</span>` : ''}
                </div>
                
                <!-- Compact Dual Progress Bars -->
                <div class="progress-details-dual">
                    <div class="mini-progress-row">
                        <span class="mini-label">📅 Daily</span>
                        <div class="mini-progress-bar">
                            <div class="mini-progress-fill daily" style="width: ${dailyPercent}%"></div>
                        </div>
                        <span class="mini-percent">${dailyPercent}%</span>
                    </div>
                    <div class="mini-progress-row">
                        <span class="mini-label">📋 Tasks</span>
                        <div class="mini-progress-bar">
                            <div class="mini-progress-fill onetime" style="width: ${oneTimePercent}%"></div>
                        </div>
                        <span class="mini-percent">${oneTimePercent}%</span>
                    </div>
                </div>
                
                <button class="btn-secondary btn-full" onclick="viewStudentDetail(${student.id})">
                    <i class="fas fa-eye"></i> View details
                </button>

                <div class="student-card-actions-inline">
                    <button class="icon-btn" title="Assign task" onclick="assignTaskForStudent(${student.id}); event.stopPropagation();">
                        <i class="fas fa-plus-circle"></i>
                    </button>
                    <button class="icon-btn" title="Chat" onclick="messageStudent(${student.id}); event.stopPropagation();">
                        <i class="fas fa-comments"></i>
                    </button>
                    <button class="icon-btn danger" title="Remove student" onclick="event.stopPropagation(); deleteStudent(${student.id});">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `);
    }
    
    container.innerHTML = studentsHTML.join('');
}

// Update student count badge
function updateStudentCount(count) {
    const badge = document.getElementById('studentCountBadge');
    if (badge) {
        badge.textContent = count;
    }
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
async function handleAddStudent(e) {
    e.preventDefault();

    // Get all form values
    const studentData = {
        name: document.getElementById('studentName').value.trim(),
        studentId: document.getElementById('studentId').value.trim(),
        dateOfBirth: document.getElementById('dateOfBirth').value,
        grade: document.getElementById('grade').value,
        section: document.getElementById('section').value,
        phone: document.getElementById('studentPhone').value.trim(),
        email: document.getElementById('studentEmail').value.trim(),
        parentName: document.getElementById('parentName').value.trim(),
        parentPhone: document.getElementById('parentPhone').value.trim(),
        parentEmail: document.getElementById('parentEmail').value.trim(),
        enrollmentDate: document.getElementById('enrollmentDate').value
    };

    // Get initial notes if provided
    const initialNotes = document.getElementById('initialNotes').value.trim();
    
    // Validation
    if (!studentData.name) {
        alert('❌ Student name is required!');
        return;
    }
    
    if (!studentData.studentId) {
        alert('❌ Student ID is required!');
        return;
    }
    
    if (!studentData.dateOfBirth) {
        alert('❌ Date of birth is required!');
        return;
    }
    
    if (!studentData.grade) {
        alert('❌ Grade is required!');
        return;
    }
    
    if (!studentData.section) {
        alert('❌ Section is required!');
        return;
    }
    
    if (!studentData.parentName) {
        alert('❌ Parent/Guardian name is required!');
        return;
    }
    
    if (!studentData.parentPhone) {
        alert('❌ Parent phone is required!');
        return;
    }
    
    if (!studentData.enrollmentDate) {
        alert('❌ Enrollment date is required!');
        return;
    }

    // Phone validation (basic)
    const phoneRegex = /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/;
    if (studentData.phone && !phoneRegex.test(studentData.phone)) {
        alert('❌ Invalid student phone format!');
        return;
    }
    
    if (!phoneRegex.test(studentData.parentPhone)) {
        alert('❌ Invalid parent phone format!');
        return;
    }

    // Email validation (if provided)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (studentData.email && !emailRegex.test(studentData.email)) {
        alert('❌ Invalid student email format!');
        return;
    }
    
    if (studentData.parentEmail && !emailRegex.test(studentData.parentEmail)) {
        alert('❌ Invalid parent email format!');
        return;
    }

    // Date validation - student must be between 5 and 18 years old
    const birthDate = new Date(studentData.dateOfBirth);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    
    if (age < 5 || age > 20) {
        if (!confirm(`⚠️ Student age appears to be ${age} years. Are you sure this is correct?`)) {
            return;
        }
    }

    // Add student
    const newStudent = await dataManager.addStudent(studentData);

    // Add initial note if provided
    if (initialNotes && newStudent) {
        await dataManager.addStudentNote(newStudent.id, {
            category: 'General',
            note: initialNotes
        });
    }

    // Reset form and close modal
    document.getElementById('addStudentForm').reset();
    closeAddStudentModal();
    
    // Refresh UI
    await loadStudentsList();
    await loadStudentCheckboxes();
    await updateDashboard();
    
    alert('✅ Student added successfully!');
}

// Delete Student
async function deleteStudent(id) {
    if (confirm('Are you sure you want to remove this student? This action cannot be undone.')) {
        await dataManager.deleteStudent(id);
        await loadStudentsList();
        await loadStudentCheckboxes();
        await updateDashboard();
    }
}

// Update Analytics
async function updateAnalytics() {
    const stats = await dataManager.getOverallStats();
    const tasks = await dataManager.getTasks();
    const oneTimeTasksCount = tasks.filter(t => t.type === 'one-time').length;
    const dailyTasksCount = tasks.filter(t => t.type === 'daily').length;

    document.getElementById('overallCompletion').textContent = stats.overallCompletion + '%';
    
    // Update task distribution counts
    const oneTimeCountElement = document.getElementById('oneTimeCount');
    if (oneTimeCountElement) {
        oneTimeCountElement.textContent = oneTimeTasksCount;
    }
    
    const dailyCountElement = document.getElementById('dailyCount');
    if (dailyCountElement) {
        dailyCountElement.textContent = dailyTasksCount;
    }
}

// View Student Detail
function viewStudentDetail(studentId) {
    window.location.href = `/pages/teacher-student-detail.html?studentId=${studentId}`;
}

// Assign task for a specific student from the Students section
function assignTaskForStudent(studentId) {
    try {
        if (typeof sessionStorage !== 'undefined') {
            sessionStorage.setItem('assignTaskStudentId', String(studentId));
        }
    } catch (e) {
        // ignore
    }
    // Switch to Manage Tasks section so the form is visible
    switchSection('manage-tasks');
}

// Open chat with a specific student from the dashboard
function messageStudent(studentId) {
    window.location.href = `/pages/teacher-chat.html?studentId=${studentId}`;
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('addStudentModal');
    if (event.target === modal) {
        closeAddStudentModal();
    }
}

/* ===================================
   DAILY OVERVIEW FUNCTIONS
   =================================== */

let selectedDateOverview = new Date();

// Select Today for Overview
async function selectTodayOverview() {
    selectedDateOverview = new Date();
    updateDateDisplayOverview();
    updateActiveButtonOverview('todayBtn');
    await loadOverviewDataDashboard();
}

// Select Yesterday for Overview
async function selectYesterdayOverview() {
    selectedDateOverview = new Date();
    selectedDateOverview.setDate(selectedDateOverview.getDate() - 1);
    updateDateDisplayOverview();
    updateActiveButtonOverview('yesterdayBtn');
    await loadOverviewDataDashboard();
}

// Select Custom Date for Overview
async function selectCustomDateOverview() {
    const dateInput = document.getElementById('customDate');
    if (dateInput && dateInput.value) {
        selectedDateOverview = new Date(dateInput.value);
        updateDateDisplayOverview();
        updateActiveButtonOverview(null);
        await loadOverviewDataDashboard();
    }
}

// Update Date Display for Overview
function updateDateDisplayOverview() {
    const displayElement = document.getElementById('selectedDateDisplay');
    if (!displayElement) return;
    
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    const formattedDate = selectedDateOverview.toLocaleDateString('en-US', options);
    
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (isSameDay(selectedDateOverview, today)) {
        displayElement.textContent = `Today - ${formattedDate}`;
    } else if (isSameDay(selectedDateOverview, yesterday)) {
        displayElement.textContent = `Yesterday - ${formattedDate}`;
    } else {
        displayElement.textContent = formattedDate;
    }
}

// Update Active Button for Overview
function updateActiveButtonOverview(buttonId) {
    const buttons = document.querySelectorAll('#daily-overview-section .date-btn');
    buttons.forEach(btn => btn.classList.remove('active'));
    
    if (buttonId) {
        const button = document.getElementById(buttonId);
        if (button) button.classList.add('active');
    }
}

// Load Overview Data for Dashboard
async function loadOverviewDataDashboard() {
    const students = await dataManager.getStudents();
    const dailyTasks = await dataManager.getDailyTasks();
    
    if (students.length === 0 || dailyTasks.length === 0) {
        showEmptyStateOverview();
        return;
    }
    
    // Calculate student performance
    const studentPerformance = [];
    for (const student of students) {
        let completedCount = 0;
        for (const task of dailyTasks) {
            const isCompleted = await dataManager.isDailyTaskCompletedForDate(task.id, student.id, getDateStringOverview(selectedDateOverview));
            if (isCompleted) completedCount++;
        }
        
        const percentage = dailyTasks.length > 0 ? Math.round((completedCount / dailyTasks.length) * 100) : 0;
        
        studentPerformance.push({
            student: student,
            completed: completedCount,
            total: dailyTasks.length,
            percentage: percentage
        });
    }
    
    // Update statistics
    updateStatisticsOverview(students.length, dailyTasks.length, studentPerformance);
    
    // Display best performing students
    displayBestStudentsOverview(studentPerformance);
    
    // Build and display table
    await buildOverviewTableDashboard(studentPerformance, dailyTasks);
}

// Update Statistics for Overview
function updateStatisticsOverview(studentCount, taskCount, studentPerformance) {
    const totalStudentsEl = document.getElementById('totalStudentsOverview');
    const totalTasksEl = document.getElementById('totalTasksOverview');
    const overallCompletionEl = document.getElementById('overallCompletionOverview');
    
    if (totalStudentsEl) totalStudentsEl.textContent = studentCount;
    if (totalTasksEl) totalTasksEl.textContent = taskCount;
    
    // Calculate overall completion
    const totalPossible = studentCount * taskCount;
    const totalCompleted = studentPerformance.reduce((sum, sp) => sum + sp.completed, 0);
    const overallPercentage = totalPossible > 0 ? Math.round((totalCompleted / totalPossible) * 100) : 0;
    
    if (overallCompletionEl) overallCompletionEl.textContent = overallPercentage + '%';
}

// Display Best Performing Students for Overview
function displayBestStudentsOverview(studentPerformance) {
    const container = document.getElementById('bestStudentsGrid');
    if (!container) return;
    
    // Sort by percentage (descending) and take top 3
    const topStudents = studentPerformance
        .filter(sp => sp.percentage > 0)
        .sort((a, b) => b.percentage - a.percentage)
        .slice(0, 3);
    
    if (topStudents.length === 0) {
        container.innerHTML = '<div class="no-best-students">No completed tasks yet for this date.</div>';
        return;
    }
    
    container.innerHTML = topStudents.map((sp, index) => {
        const rank = index + 1;
        const rankClass = `rank-${rank}`;
        const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉';
        
        return `
            <div class="best-student-card ${rankClass}">
                <div class="best-student-rank">${medal}</div>
                <div class="best-student-info">
                    <h4>${sp.student.name}</h4>
                    <p>${sp.student.grade || 'N/A'} - Section ${sp.student.section || 'N/A'}</p>
                </div>
                <div class="best-student-percentage">${sp.percentage}%</div>
            </div>
        `;
    }).join('');
}

// Build Overview Table for Dashboard
async function buildOverviewTableDashboard(studentPerformance, dailyTasks) {
    const table = document.getElementById('overviewTable');
    const tbody = document.getElementById('overviewTableBody');
    
    if (!table || !tbody) return;
    
    const thead = table.querySelector('thead tr');
    
    // Clear existing task columns (keep first 2 and last column)
    while (thead.children.length > 3) {
        thead.removeChild(thead.children[2]);
    }
    
    // Add task columns
    dailyTasks.forEach(task => {
        const th = document.createElement('th');
        th.innerHTML = `<i class="fas fa-check-circle"></i> ${truncateTextOverview(task.title, 20)}`;
        th.title = task.title; // Full title on hover
        thead.insertBefore(th, thead.lastElementChild);
    });
    
    // Build rows
    const rows = [];
    for (const sp of studentPerformance) {
        const student = sp.student;
        const initial = student.name.charAt(0).toUpperCase();
        const isTopPerformer = sp.percentage >= 80;
        
        // Determine completion color class
        let completionClass = 'poor';
        if (sp.percentage >= 80) completionClass = 'excellent';
        else if (sp.percentage >= 60) completionClass = 'good';
        else if (sp.percentage >= 40) completionClass = 'average';
        
        // Build task status cells (with data-task-title for mobile card layout)
        const taskCells = [];
        for (const task of dailyTasks) {
            const isCompleted = await dataManager.isDailyTaskCompletedForDate(task.id, student.id, getDateStringOverview(selectedDateOverview));
            const statusIcon = isCompleted ? '✅' : '❌';
            const statusClass = isCompleted ? 'completed' : 'pending';
            const safeTitle = (task.title || '').replace(/"/g, '&quot;');
            taskCells.push(`<td data-task-title="${safeTitle}"><span class="task-status ${statusClass}">${statusIcon}</span></td>`);
        }
        
        const trophyIcon = isTopPerformer ? '<span class="completion-trophy">🏆</span>' : '';
        
        rows.push(`
            <tr class="${isTopPerformer ? 'top-performer' : ''}">
                <td class="sticky-col student-col">
                    <div class="student-cell">
                        <div class="student-avatar-small">${initial}</div>
                        <div class="student-name-info">
                            <h4>${student.name}</h4>
                            <p>${student.studentId || 'N/A'}</p>
                        </div>
                    </div>
                </td>
                <td class="sticky-col info-col">
                    <div class="info-cell">
                        <span class="info-badge">${student.grade || 'N/A'}</span>
                        <span class="info-badge">Section ${student.section || 'N/A'}</span>
                    </div>
                </td>
                ${taskCells.join('')}
                <td class="sticky-col completion-col">
                    <span class="completion-cell ${completionClass}">
                        ${sp.percentage}%${trophyIcon}
                    </span>
                </td>
            </tr>
        `);
    }
    
    tbody.innerHTML = rows.join('');
}

// Show Empty State for Overview
async function showEmptyStateOverview() {
    const tbody = document.getElementById('overviewTableBody');
    const dailyTasks = await dataManager.getDailyTasks();
    const students = await dataManager.getStudents();
    
    if (!tbody) return;
    
    let message = '';
    if (students.length === 0) {
        message = '<i class="fas fa-users-slash"></i><h3>No Students Found</h3><p>Please add students first to see the overview.</p>';
    } else if (dailyTasks.length === 0) {
        message = '<i class="fas fa-tasks"></i><h3>No Daily Tasks Found</h3><p>Please create daily routine tasks to track completion.</p>';
    }
    
    tbody.innerHTML = `
        <tr>
            <td colspan="100">
                <div class="empty-overview">
                    ${message}
                </div>
            </td>
        </tr>
    `;
    
    const bestGrid = document.getElementById('bestStudentsGrid');
    if (bestGrid) {
        bestGrid.innerHTML = '<div class="no-best-students">No data available.</div>';
    }
    
    const totalStudentsEl = document.getElementById('totalStudentsOverview');
    const totalTasksEl = document.getElementById('totalTasksOverview');
    const overallCompletionEl = document.getElementById('overallCompletionOverview');
    
    if (totalStudentsEl) totalStudentsEl.textContent = students.length;
    if (totalTasksEl) totalTasksEl.textContent = dailyTasks.length;
    if (overallCompletionEl) overallCompletionEl.textContent = '0%';
}

// Helper: Get Daily Tasks
// This will be set up after dataManager is ready
function setupDataManagerHelpers() {
    if (typeof dataManager !== 'undefined' && dataManager.getTasks) {
        dataManager.getDailyTasks = async function() {
            const tasks = await this.getTasks();
            return tasks.filter(task => task.type === 'daily');
        };
        
        dataManager.isDailyTaskCompletedForDate = async function(taskId, studentId, dateString) {
            const task = await this.getTaskById(taskId);
            if (!task || !task.dailyCompletions) return false;
            
            const studentCompletions = task.dailyCompletions[studentId] || [];
            return studentCompletions.includes(dateString);
        };
    }
}

// Helper: Check if daily task is completed for specific date
// Moved to setupDataManagerHelpers() function above

// Helper: Get date string in YYYY-MM-DD format
function getDateStringOverview(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Helper: Check if two dates are the same day
function isSameDay(date1, date2) {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
}

// Helper: Truncate text
function truncateTextOverview(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

// Reset Sample Data
async function resetSampleData() {
    if (confirm('⚠️ This will clear all current data and reload fresh sample data. Continue?')) {
        try {
            // Clear data using the storage adapter (works for both localStorage and Firebase)
            await dataManager.storage.clear();
            alert('✅ Sample data reset! Page will reload now.');
            location.reload();
        } catch (error) {
            console.error('Error resetting data:', error);
            alert('❌ Error resetting data. Please try again.');
        }
    }
}

/* ===================================
   MANAGE TASKS FUNCTIONS
   =================================== */

// Switch Manage Task Tabs
async function switchManageTaskTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.manage-tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.closest('.manage-tab-btn').classList.add('active');
    
    // Hide all tab contents
    document.querySelectorAll('.manage-tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // Show selected tab
    if (tabName === 'create') {
        document.getElementById('createTaskTab').classList.add('active');
    } else if (tabName === 'view') {
        document.getElementById('viewTasksTab').classList.add('active');
        await loadAllTasks(); // Load tasks when viewing
    }
}

// Programmatic tab switch (without event)
async function switchManageTaskTabProgrammatic(tabName) {
    // Update tab buttons
    document.querySelectorAll('.manage-tab-btn').forEach((btn, index) => {
        btn.classList.remove('active');
        if ((tabName === 'create' && index === 0) || (tabName === 'view' && index === 1)) {
            btn.classList.add('active');
        }
    });
    
    // Hide all tab contents
    document.querySelectorAll('.manage-tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // Show selected tab
    if (tabName === 'create') {
        document.getElementById('createTaskTab').classList.add('active');
    } else if (tabName === 'view') {
        document.getElementById('viewTasksTab').classList.add('active');
        await loadAllTasks(); // Load tasks when viewing
    }
}

// Load All Tasks
async function loadAllTasks() {
    const tasks = await dataManager.getTasks();
    const oneTimeTasks = tasks.filter(t => t.type === 'one-time');
    const dailyTasks = tasks.filter(t => t.type === 'daily');
    
    // Update counts
    document.getElementById('taskCountBadge').textContent = tasks.length;
    document.getElementById('oneTimeTaskCount').textContent = oneTimeTasks.length;
    document.getElementById('dailyTaskCount').textContent = dailyTasks.length;
    
    // Show/hide empty state
    if (tasks.length === 0) {
        document.getElementById('noTasksMessage').style.display = 'block';
        document.getElementById('oneTimeTasksCategory').style.display = 'none';
        document.getElementById('dailyTasksCategory').style.display = 'none';
        return;
    } else {
        document.getElementById('noTasksMessage').style.display = 'none';
    }
    
    // Load one-time tasks
    const oneTimeContainer = document.getElementById('oneTimeTasksList');
    if (oneTimeTasks.length > 0) {
        document.getElementById('oneTimeTasksCategory').style.display = 'block';
        oneTimeContainer.innerHTML = oneTimeTasks.map(task => renderTaskCard(task)).join('');
    } else {
        document.getElementById('oneTimeTasksCategory').style.display = 'none';
    }
    
    // Load daily tasks
    const dailyContainer = document.getElementById('dailyTasksList');
    if (dailyTasks.length > 0) {
        document.getElementById('dailyTasksCategory').style.display = 'block';
        dailyContainer.innerHTML = dailyTasks.map(task => renderTaskCard(task)).join('');
    } else {
        document.getElementById('dailyTasksCategory').style.display = 'none';
    }
    
    // Apply current filter
    applyTaskFilter();
}

// Render Task Card (Compact List Item)
function renderTaskCard(task) {
    
    let completionText = '';
    if (task.type === 'one-time') {
        const completed = task.completedBy ? task.completedBy.length : 0;
        const total = task.assignedTo.length;
        const pending = total - completed;
        completionText = `<span class="status-success">✅ ${completed}</span> / <span class="status-pending">⏳ ${pending}</span>`;
    } else {
        // For daily tasks, show today's completion
        const today = new Date().toISOString().split('T')[0];
        let completedToday = 0;
        if (task.dailyCompletions) {
            completedToday = Object.keys(task.dailyCompletions).filter(studentId => {
                const completions = task.dailyCompletions[studentId];
                return Array.isArray(completions) && completions.includes(today);
            }).length;
        }
        const total = task.assignedTo.length;
        const pending = total - completedToday;
        completionText = `<span class="status-success">✅ ${completedToday}</span> / <span class="status-pending">⏳ ${pending}</span> today`;
    }
    
    const deadlineText = task.deadline ? 
        `<span class="task-deadline"><i class="fas fa-calendar-alt"></i> ${new Date(task.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>` : 
        '<span class="no-deadline">No deadline</span>';
    
    const descriptionPreview = task.description ? 
        (task.description.length > 60 ? task.description.substring(0, 60) + '...' : task.description) : 
        '<span class="no-description">No description</span>';
    
    return `
        <div class="task-item-compact">
            <div class="task-item-main">
                <div class="task-item-header">
                    <h4 class="task-item-title">${task.title}</h4>
                    <span class="task-type-badge-small ${task.type}">${task.type === 'daily' ? '🔄 Daily' : '📋 One-time'}</span>
                </div>
                <p class="task-item-description">${descriptionPreview}</p>
            </div>
            <div class="task-item-meta">
                <span class="meta-students"><i class="fas fa-users"></i> ${task.assignedTo.length} student${task.assignedTo.length > 1 ? 's' : ''}</span>
                ${deadlineText}
                <span class="meta-completion">${completionText}</span>
            </div>
            <div class="task-item-actions">
                <button class="btn-action-edit" onclick="showEditTaskModal(${task.id})" title="Edit Task">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-action-delete" onclick="handleDeleteTask(${task.id})" title="Delete Task">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `;
}

// Filter Tasks
function filterTasks(type) {
    currentTaskFilter = type;
    
    // Update active filter button
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    applyTaskFilter();
}

// Apply Task Filter
function applyTaskFilter() {
    const oneTimeCategory = document.getElementById('oneTimeTasksCategory');
    const dailyCategory = document.getElementById('dailyTasksCategory');
    const oneTimeList = document.getElementById('oneTimeTasksList');
    const dailyList = document.getElementById('dailyTasksList');

    const oneTimeHasItems = !!(oneTimeList && oneTimeList.innerHTML && oneTimeList.innerHTML.trim());
    const dailyHasItems = !!(dailyList && dailyList.innerHTML && dailyList.innerHTML.trim());
    
    if (currentTaskFilter === 'all') {
        if (oneTimeCategory) oneTimeCategory.style.display = oneTimeHasItems ? 'block' : 'none';
        if (dailyCategory) dailyCategory.style.display = dailyHasItems ? 'block' : 'none';
    } else if (currentTaskFilter === 'one-time') {
        if (oneTimeCategory) oneTimeCategory.style.display = 'block';
        if (dailyCategory) dailyCategory.style.display = 'none';
    } else if (currentTaskFilter === 'daily') {
        if (oneTimeCategory) oneTimeCategory.style.display = 'none';
        if (dailyCategory) dailyCategory.style.display = 'block';
    }
}

// Show Edit Task Modal
async function showEditTaskModal(taskId) {
    const task = await dataManager.getTaskById(taskId);
    if (!task) {
        alert('❌ Task not found!');
        return;
    }
    
    // Populate form with task data
    document.getElementById('editTaskId').value = task.id;
    document.getElementById('editTaskTitle').value = task.title;
    document.getElementById('editTaskDescription').value = task.description || '';
    document.getElementById('editTaskType').value = task.type;
    document.getElementById('editTaskDeadline').value = task.deadline || '';
    
    // Show/hide deadline based on task type
    handleEditTaskTypeChange();
    
    // Load student checkboxes for edit form
    await loadEditStudentCheckboxes(task.assignedTo);
    
    // Show modal
    document.getElementById('editTaskModal').style.display = 'block';
}

// Close Edit Task Modal
function closeEditTaskModal() {
    document.getElementById('editTaskModal').style.display = 'none';
    document.getElementById('editTaskForm').reset();
}

// Load Student Checkboxes for Edit Form
async function loadEditStudentCheckboxes(assignedStudentIds) {
    const students = await dataManager.getStudents();
    const container = document.getElementById('editStudentCheckboxes');
    
    container.innerHTML = students.map(student => {
        const isChecked = assignedStudentIds.includes(student.id);
        return `
            <label class="checkbox-item">
                <input type="checkbox" name="editAssignedStudents" value="${student.id}" ${isChecked ? 'checked' : ''}>
                <span>${student.name}</span>
            </label>
        `;
    }).join('');
    
    // Check if all are selected
    const allChecked = students.length > 0 && assignedStudentIds.length === students.length;
    document.getElementById('editAssignToAll').checked = allChecked;
}

// Handle Edit Task Type Change
function handleEditTaskTypeChange() {
    const taskType = document.getElementById('editTaskType').value;
    const deadlineGroup = document.getElementById('editDeadlineGroup');
    const hint = document.getElementById('editTaskTypeHint');
    
    if (taskType === 'daily') {
        deadlineGroup.style.display = 'none';
        hint.style.display = 'block';
    } else {
        deadlineGroup.style.display = 'block';
        hint.style.display = 'none';
    }
}

// Handle Edit Assign To All Change
function handleEditAssignToAllChange() {
    const assignToAll = document.getElementById('editAssignToAll');
    const checkboxes = document.querySelectorAll('input[name="editAssignedStudents"]');
    
    checkboxes.forEach(cb => {
        cb.checked = assignToAll.checked;
        cb.disabled = assignToAll.checked;
    });
}

// Handle Update Task
async function handleUpdateTask(e) {
    e.preventDefault();
    
    const taskId = document.getElementById('editTaskId').value;
    const title = document.getElementById('editTaskTitle').value.trim();
    const description = document.getElementById('editTaskDescription').value.trim();
    const type = document.getElementById('editTaskType').value;
    const deadline = type === 'one-time' ? document.getElementById('editTaskDeadline').value : null;
    
    // Get selected students
    const selectedStudents = Array.from(
        document.querySelectorAll('input[name="editAssignedStudents"]:checked')
    ).map(cb => parseInt(cb.value));
    
    if (selectedStudents.length === 0) {
        alert('❌ Please select at least one student!');
        return;
    }
    
    const updatedTask = {
        title: title,
        description: description,
        type: type,
        assignedTo: selectedStudents,
        deadline: deadline
    };
    
    const result = await dataManager.updateTask(taskId, updatedTask);
    
    if (result) {
        alert('✅ Task updated successfully!');
        closeEditTaskModal();
        await loadAllTasks();
        await updateDashboard();
    } else {
        alert('❌ Failed to update task!');
    }
}

// Handle Delete Task
async function handleDeleteTask(taskId) {
    const task = await dataManager.getTaskById(taskId);
    if (!task) return;
    
    const studentCount = task.assignedTo.length;
    const confirmMsg = `⚠️ Are you sure you want to delete "${task.title}"?\n\nThis will remove the task from ${studentCount} student${studentCount > 1 ? 's' : ''}.\n\nThis action cannot be undone.`;
    
    if (confirm(confirmMsg)) {
        await dataManager.deleteTask(taskId);
        alert('✅ Task deleted successfully!');
        await loadAllTasks();
        await updateDashboard();
    }
}

// Setup Edit Task Form Handler
document.addEventListener('DOMContentLoaded', function() {
    const editTaskForm = document.getElementById('editTaskForm');
    if (editTaskForm) {
        editTaskForm.addEventListener('submit', handleUpdateTask);
    }
});

