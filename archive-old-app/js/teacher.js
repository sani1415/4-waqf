// Teacher Dashboard JavaScript
// NOTE: This file is being updated to work with async storage adapters
// Some functions may still need async/await additions

function _t(key, params) {
    return typeof window.t === 'function' ? window.t(key, params) : key;
}

function getStudentYearLabel(student) {
    if (!student || !dataManager || typeof dataManager.getStudentYear !== 'function') return 'N/A';
    const n = dataManager.getStudentYear(student.enrollmentDate);
    const keys = ['', 'first_year', 'second_year', 'third_year', 'fourth_year', 'fifth_year', 'sixth_year', 'seventh_year', 'eighth_year', 'ninth_year', 'tenth_year'];
    const key = keys[n] || ('year_' + n);
    return (key && _t(key)) || ('Year ' + n);
}

// Initialize task filter at the top level to avoid temporal dead zone issues
let currentTaskFilter = 'all';
// Spreadsheet task filter: 'all' | 'daily' | 'onetime'
let spreadsheetTaskFilter = (typeof localStorage !== 'undefined' && localStorage.getItem('spreadsheetTaskFilter')) || 'all';

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
        'analytics': 'analytics',
        'documents-for-review': 'documents-for-review'
    };
    return map[h] || null;
}

function sectionToHash(sectionName) {
    const map = {
        'dashboard': 'dashboard',
        'manage-tasks': 'manage-tasks',
        'students': 'students',
        'daily-overview': 'daily-overview',
        'analytics': 'analytics',
        'documents-for-review': 'documents-for-review'
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
    if (typeof isTeacherLoggedIn === 'function' && !isTeacherLoggedIn()) {
        window.location.href = '/index.html';
        return;
    }
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
    setupRealtimeDashboard();
    // Unread badge is handled by teacher-unread-badge.js on all teacher pages
}

// Real-time: refresh dashboard when tasks change (student completions)
function setupRealtimeDashboard() {
    if (typeof dataManager?.subscribeToCollection !== 'function') return;
    const refreshIfDashboard = async function() {
        const dash = document.getElementById('dashboard-section');
        if (dash && dash.classList.contains('active')) {
            await updateDashboard();
        }
    };
    dataManager.subscribeToCollection('tasks', refreshIfDashboard);
}

// Setup Event Listeners
function setupEventListeners() {
    // Navigation - sidebar and in-page tabs
    document.querySelectorAll('.nav-item[data-section]').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const section = this.getAttribute('data-section');
            if (section) {
                switchSection(section, this);
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

    // Documents for Review - view toggle (grouped / table)
    setupDocumentsViewToggle();
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

// Section title i18n keys for top bar
const SECTION_TITLE_KEYS = {
    'dashboard': 'nav_dashboard',
    'manage-tasks': 'nav_manage_tasks',
    'students': 'nav_students',
    'daily-overview': 'nav_daily_overview',
    'analytics': 'nav_analytics',
    'documents-for-review': 'documents_for_review'
};

// Switch Between Sections
async function switchSection(sectionName, clickedElement) {
    // Update top bar title to match current section
    const titleEl = document.getElementById('pageTitle');
    if (titleEl) {
        const key = SECTION_TITLE_KEYS[sectionName];
        titleEl.setAttribute('data-i18n', key || 'nav_dashboard');
        titleEl.textContent = typeof window.t === 'function' ? window.t(key || 'nav_dashboard') : 'Dashboard';
    }

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
    } else if (sectionName === 'documents-for-review') {
        await loadDocumentsForReview();
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
            const dailyPercentage = stats.dailyTotal > 0 ? Math.round((stats.dailyCompletedToday / stats.dailyTotal) * 100) : 0;
            const badgeBg = dailyPercentage >= 80 ? '#e8f5e9' : dailyPercentage >= 50 ? '#fff3e0' : '#ffebee';
            const badgeColor = dailyPercentage >= 80 ? '#2e7d32' : dailyPercentage >= 50 ? '#e65100' : '#c62828';
            const barBg = dailyPercentage >= 80 ? 'linear-gradient(90deg,#88B68D,#9DC9A3)' : 'linear-gradient(90deg,#FF9800,#FFB74D)';
            const sid = student.studentId || student.id;
            return `
                <div class="student-summary-row" onclick="viewStudentDetail(${student.id})" style="cursor: pointer;">
                    <div class="student-info">
                        <div class="student-name-row">
                            <span class="student-name" title="${(student.name || '').replace(/"/g, '&quot;')}">${student.name}</span>
                            ${sid ? `<span class="student-id-display">${sid}</span>` : ''}
                        </div>
                        <div class="student-grade">${getStudentYearLabel(student)} • ${stats.dailyCompletedToday}/${stats.dailyTotal} tasks</div>
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
            const badgeBg = stats.percentage >= 80 ? '#e8f5e9' : stats.percentage >= 50 ? '#e3f2fd' : '#ffebee';
            const badgeColor = stats.percentage >= 80 ? '#2e7d32' : stats.percentage >= 50 ? '#1565c0' : '#c62828';
            const barBg = stats.percentage >= 80 ? 'linear-gradient(90deg,#88B68D,#9DC9A3)' : 'linear-gradient(90deg,#2196F3,#64B5F6)';
            const sid = student.studentId || student.id;
            return `
                <div class="student-summary-row" onclick="viewStudentDetail(${student.id})" style="cursor: pointer;">
                    <div class="student-info">
                        <div class="student-name-row">
                            <span class="student-name" title="${(student.name || '').replace(/"/g, '&quot;')}">${student.name}</span>
                            ${sid ? `<span class="student-id-display">${sid}</span>` : ''}
                        </div>
                        <div class="student-grade">${getStudentYearLabel(student)} • ${stats.completed}/${stats.total} tasks</div>
                    </div>
                    <span class="completion-badge" style="background:${badgeBg};color:${badgeColor};">${stats.percentage}%</span>
                    <div class="progress-bar-container"><div class="progress-bar" style="width:${stats.percentage}%;background:${barBg};"></div></div>
                </div>
            `;
        }).join('');
    }

    // Build Spreadsheet view
    const spreadsheetFilterEl = document.getElementById('spreadsheetTaskFilter');
    if (spreadsheetWrap && (dailyTasks.length > 0 || oneTimeTasks.length > 0)) {
        const filter = (typeof spreadsheetTaskFilter !== 'undefined' ? spreadsheetTaskFilter : 'all');
        let tasksToShow = [];
        if (filter === 'daily') tasksToShow = dailyTasks;
        else if (filter === 'onetime') tasksToShow = oneTimeTasks;
        else tasksToShow = [...dailyTasks, ...oneTimeTasks];

        if (spreadsheetFilterEl) {
            spreadsheetFilterEl.style.display = 'flex';
            spreadsheetFilterEl.querySelectorAll('.spreadsheet-filter-btn').forEach(btn => {
                btn.classList.toggle('active', btn.getAttribute('data-filter') === filter);
            });
        }

        const t = typeof window.t === 'function' ? window.t : (k) => k;
        const dailyLabel = t('spreadsheet_daily_tasks') || 'Daily Tasks';
        const onetimeLabel = t('spreadsheet_onetime_tasks') || 'One-time Tasks';

        let headerHtml = '';
        if (filter === 'all' && dailyTasks.length > 0 && oneTimeTasks.length > 0) {
            headerHtml = `
                <tr class="spreadsheet-group-header-row">
                    <th class="student-col"></th>
                    ${dailyTasks.length > 0 ? `<th colspan="${dailyTasks.length}" class="spreadsheet-group-header spreadsheet-group-daily">${dailyLabel}</th>` : ''}
                    ${oneTimeTasks.length > 0 ? `<th colspan="${oneTimeTasks.length}" class="spreadsheet-group-header spreadsheet-group-onetime">${onetimeLabel}</th>` : ''}
                </tr>
                <tr>
                    <th class="student-col">${t('student') || 'Student'}</th>
                    ${tasksToShow.map(tk => `<th class="task-col" title="${(tk.title || '').replace(/"/g, '&quot;')}">${truncateTextOverview(tk.title || 'Task', 15)}</th>`).join('')}
                </tr>
            `;
        } else {
            headerHtml = `
                <tr>
                    <th class="student-col">${t('student') || 'Student'}</th>
                    ${tasksToShow.map(tk => `<th class="task-col" title="${(tk.title || '').replace(/"/g, '&quot;')}">${truncateTextOverview(tk.title || 'Task', 15)}</th>`).join('')}
                </tr>
            `;
        }

        const rows = [];
        for (const item of studentsProgress) {
            const { student } = item;
            const cells = [];
            for (const task of tasksToShow) {
                const isAssigned = task.assignedTo && task.assignedTo.some(sid => String(sid) === String(student.id));
                let icon = '<span class="cross">✗</span>';
                if (isAssigned) {
                    const completed = task.type === 'daily'
                        ? await dataManager.isDailyTaskCompletedForDate(task.id, student.id, today)
                        : (task.completedBy && task.completedBy.some(sid => String(sid) === String(student.id)));
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
                    ${headerHtml}
                </thead>
                <tbody>
                    ${rows.join('')}
                </tbody>
            </table>
        `;
    } else {
        if (spreadsheetFilterEl) spreadsheetFilterEl.style.display = 'none';
        if (spreadsheetWrap) {
            spreadsheetWrap.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 2rem;">No tasks assigned yet. Create tasks to see the spreadsheet view.</p>';
        }
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

    // Spreadsheet task filter (Daily | One-time | All) - use event delegation
    const dashboardSection = document.getElementById('dashboard-section');
    if (dashboardSection) {
        dashboardSection.addEventListener('click', function(e) {
            const btn = e.target.closest('.spreadsheet-filter-btn');
            if (!btn) return;
            const filter = btn.getAttribute('data-filter');
            if (!filter || filter === spreadsheetTaskFilter) return;
            spreadsheetTaskFilter = filter;
            if (typeof localStorage !== 'undefined') localStorage.setItem('spreadsheetTaskFilter', filter);
            loadStudentsProgress();
        });
    }
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
            targetId = fromUrl || fromSession;
        }
    } catch (e) {
        // ignore
    }

    let foundTarget = false;
    container.innerHTML = students.map(student => {
        const isTarget = targetId && String(student.id) === String(targetId);
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
    ).map(cb => cb.value);

    if (selectedStudents.length === 0) {
        alert('❌ ' + _t('alert_select_one_student_task'));
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
    alert('✅ ' + _t('alert_task_created'));
    
    // Update dashboard and task list
    await updateDashboard();
    await loadStudentCheckboxes();
    
    // Switch to View All Tasks tab
    await switchManageTaskTabProgrammatic('view');
}

// Loading spinner HTML
function getLoadingSpinnerHtml() {
    const loadingText = typeof window.t === 'function' ? window.t('loading') : 'Loading...';
    return `<div class="loading-spinner"><i class="fas fa-circle-notch fa-spin"></i><span>${loadingText}</span></div>`;
}

// Load Students List
async function loadStudentsList() {
    const container = document.getElementById('studentsList');
    if (container) {
        container.innerHTML = getLoadingSpinnerHtml();
    }
    const students = await dataManager.getStudents();

    // Update student count badge
    updateStudentCount(students.length);

    if (students.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 2rem;">No students found. Click "Add Student" to get started.</p>';
        return;
    }

    const statsPromises = students.map(s => dataManager.getStudentStats(s.id));
    const allStats = await Promise.all(statsPromises);
    
    const studentsHTML = students.map((student, i) => {
        const stats = allStats[i];
        const sid = student.studentId || student.id;
        const dailyPercent = stats.dailyTotal > 0 ? Math.round((stats.dailyCompletedToday / stats.dailyTotal) * 100) : 0;
        const oneTimePercent = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

        return `
            <div class="student-card fade-in">
                <div class="student-card-header" onclick="viewStudentDetail(${student.id})" style="cursor: pointer;">
                    <div>
                        <h3 class="student-name">${student.name}${sid ? `<span class="student-id-display">${sid}</span>` : ''}</h3>
                        <p class="student-meta">${getStudentYearLabel(student)}${student.phone ? ` • ${student.phone}` : ''}</p>
                    </div>
                </div>
                
                <!-- New: Grade and Phone badges -->
                <div class="compact-badges">
                    <span class="mini-badge">${getStudentYearLabel(student)}</span>
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
        `;
    });
    
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
async function showAddStudentModal() {
    const sidInput = document.getElementById('studentId');
    if (sidInput && dataManager && typeof dataManager.getNextStudentId === 'function') {
        try {
            sidInput.value = await dataManager.getNextStudentId();
        } catch (e) {
            sidInput.value = 'waqf-001';
        }
    }
    document.getElementById('addStudentModal').style.display = 'block';
}

// Close Add Student Modal
function closeAddStudentModal() {
    document.getElementById('addStudentModal').style.display = 'none';
    document.getElementById('addStudentForm').reset();
}

// Parse CSV text into rows (handles quoted fields)
function parseCSV(text) {
    const rows = [];
    const lines = text.split(/\r?\n/).filter(line => line.trim());
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const cols = [];
        let cur = '';
        let inQuotes = false;
        for (let j = 0; j < line.length; j++) {
            const c = line[j];
            if (c === '"') inQuotes = !inQuotes;
            else if (c === ',' && !inQuotes) { cols.push(cur.trim()); cur = ''; }
            else cur += c;
        }
        cols.push(cur.trim());
        rows.push(cols);
    }
    return rows;
}

// Handle Import Students from CSV file
async function handleImportStudentsFile(event) {
    const input = event.target;
    const file = input && input.files && input.files[0];
    if (!file) return;
    input.value = '';
    const text = await new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result || '');
        r.onerror = () => reject(new Error('Failed to read file'));
        r.readAsText(file, 'UTF-8');
    });
    const rows = parseCSV(text);
    if (rows.length < 2) {
        alert('❌ ' + (_t('import_no_data') || 'No data found. Use the template: templates/students-import-template.csv'));
        return;
    }
    const header = rows[0].map(h => (h || '').toLowerCase().replace(/\s+/g, ' ').trim());
    const idx = (name) => {
        const n = name.toLowerCase();
        return header.findIndex(h => h && (h.includes(n) || n.includes(h)));
    };
    const getCol = (row, names) => {
        for (const n of names) {
            const i = idx(n);
            if (i >= 0 && row[i] !== undefined) return (row[i] || '').trim();
        }
        return '';
    };
    let added = 0, skipped = 0, errors = [];
    for (let r = 1; r < rows.length; r++) {
        const row = rows[r];
        if (!row || row.every(c => !c)) continue;
        const name = getCol(row, ['name']);
        const dateOfBirth = getCol(row, ['date of birth', 'dob', 'birth']);
        const enrollmentDate = getCol(row, ['admission date', 'enrollment date', 'enrollment', 'admission']);
        const parentName = getCol(row, ['parent name', 'parent', 'guardian']);
        const parentPhone = getCol(row, ['parent phone', 'guardian phone']);
        if (!name) { skipped++; continue; }
        if (!dateOfBirth) { errors.push(`Row ${r + 1}: ${name} - Date of Birth required`); continue; }
        if (!parentName) { errors.push(`Row ${r + 1}: ${name} - Parent Name required`); continue; }
        if (!parentPhone) { errors.push(`Row ${r + 1}: ${name} - Parent Phone required`); continue; }
        const adm = enrollmentDate || dateOfBirth || new Date().toISOString().slice(0, 10);
        const studentData = {
            name,
            dateOfBirth,
            enrollmentDate: adm,
            phone: getCol(row, ['phone', 'student phone']),
            email: getCol(row, ['email', 'student email']),
            parentName,
            parentPhone,
            parentEmail: getCol(row, ['parent email']),
            fatherWork: getCol(row, ["father's work", 'father work', 'father occupation', 'parent work']),
            district: getCol(row, ['district', 'jela', 'জেলা']),
            upazila: getCol(row, ['upazila', 'upozela', 'sub district', 'উপজেলা']),
            address: getCol(row, ['address', 'detail address', 'detailed address']),
            pin: getCol(row, ['pin']) || '1234'
        };
        try {
            await dataManager.addStudent(studentData);
            added++;
        } catch (e) {
            errors.push(`Row ${r + 1}: ${name} - ${e.message || 'Error'}`);
        }
    }
    await loadStudentsList();
    updateStudentCount((await dataManager.getStudents()).length);
    const msg = (added ? `✅ ${added} student(s) imported. ` : '') +
        (skipped ? `⏭ ${skipped} row(s) skipped. ` : '') +
        (errors.length ? `❌ Errors: ${errors.slice(0, 5).join('; ')}${errors.length > 5 ? '...' : ''}` : '');
    alert(msg || (_t('import_no_data') || 'No valid rows to import.'));
}

// Handle Add Student
async function handleAddStudent(e) {
    e.preventDefault();

    // Get all form values
    const pinVal = (document.getElementById('studentPin') && document.getElementById('studentPin').value) ? document.getElementById('studentPin').value.trim() : '1234';
    const studentData = {
        name: document.getElementById('studentName').value.trim(),
        studentId: document.getElementById('studentId').value.trim(),
        pin: pinVal || '1234',
        dateOfBirth: document.getElementById('dateOfBirth').value,
        phone: document.getElementById('studentPhone').value.trim(),
        email: document.getElementById('studentEmail').value.trim(),
        parentName: document.getElementById('parentName').value.trim(),
        parentPhone: document.getElementById('parentPhone').value.trim(),
        parentEmail: document.getElementById('parentEmail').value.trim(),
        fatherWork: (document.getElementById('fatherWork') && document.getElementById('fatherWork').value) ? document.getElementById('fatherWork').value.trim() : '',
        district: (document.getElementById('district') && document.getElementById('district').value) ? document.getElementById('district').value.trim() : '',
        upazila: (document.getElementById('upazila') && document.getElementById('upazila').value) ? document.getElementById('upazila').value.trim() : '',
        address: (document.getElementById('address') && document.getElementById('address').value) ? document.getElementById('address').value.trim() : '',
        enrollmentDate: document.getElementById('enrollmentDate').value
    };

    // Get initial notes if provided
    const initialNotes = document.getElementById('initialNotes').value.trim();
    
    // Validation
    if (!studentData.name) {
        alert('❌ ' + _t('alert_student_name_required'));
        return;
    }
    
    if (!studentData.studentId) {
        alert('❌ ' + _t('alert_student_id_required'));
        return;
    }
    if (!studentData.pin || studentData.pin.length < 4 || studentData.pin.length > 8) {
        alert('❌ ' + (_t('alert_pin_required') || 'Please enter a 4-6 digit PIN.'));
        return;
    }
    
    if (!studentData.dateOfBirth) {
        alert('❌ ' + _t('alert_dob_required'));
        return;
    }
    
    if (!studentData.parentName) {
        alert('❌ ' + _t('alert_parent_name_required'));
        return;
    }
    
    if (!studentData.parentPhone) {
        alert('❌ ' + _t('alert_parent_phone_required'));
        return;
    }
    
    if (!studentData.enrollmentDate) {
        alert('❌ ' + _t('alert_enrollment_date_required'));
        return;
    }

    // Phone validation (basic)
    const phoneRegex = /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/;
    if (studentData.phone && !phoneRegex.test(studentData.phone)) {
        alert('❌ ' + _t('alert_invalid_student_phone'));
        return;
    }
    
    if (!phoneRegex.test(studentData.parentPhone)) {
        alert('❌ ' + _t('alert_invalid_parent_phone'));
        return;
    }

    // Email validation (if provided)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (studentData.email && !emailRegex.test(studentData.email)) {
        alert('❌ ' + _t('alert_invalid_student_email'));
        return;
    }
    
    if (studentData.parentEmail && !emailRegex.test(studentData.parentEmail)) {
        alert('❌ ' + _t('alert_invalid_parent_email'));
        return;
    }

    // Date validation - student must be between 5 and 18 years old
    const birthDate = new Date(studentData.dateOfBirth);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    
    if (age < 5 || age > 20) {
        if (!confirm('⚠️ ' + _t('confirm_student_age', { age: age }))) {
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
    
    alert('✅ ' + _t('alert_student_added'));
}

// Delete Student
async function deleteStudent(id) {
    if (confirm('⚠️ ' + _t('confirm_remove_student'))) {
        await dataManager.deleteStudent(id);
        await loadStudentsList();
        await loadStudentCheckboxes();
        await updateDashboard();
    }
}

// Update Analytics
async function updateAnalytics() {
    const loader = document.getElementById('analyticsLoader');
    const content = document.getElementById('analyticsContent');
    if (loader && content) {
        loader.style.display = 'flex';
        content.style.opacity = '0.5';
    }
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
    if (loader && content) {
        loader.style.display = 'none';
        content.style.opacity = '1';
    }
}

// Documents for Review - student-submitted documents marked for teacher view
// View mode: 'grouped' (accordion) or 'table'
let documentsReviewView = (typeof localStorage !== 'undefined' && localStorage.getItem('documentsReviewView')) || 'grouped';

async function loadDocumentsForReview() {
    const listEl = document.getElementById('documentsForReviewList');
    const emptyEl = document.getElementById('documentsForReviewEmpty');
    const toggleEl = document.getElementById('documentsViewToggle');
    if (!listEl || !emptyEl) return;

    listEl.innerHTML = '<div class="loading-spinner"><i class="fas fa-circle-notch fa-spin"></i><span data-i18n="loading">Loading...</span></div>';
    emptyEl.style.display = 'none';
    if (toggleEl) toggleEl.style.display = 'none';

    const docs = await dataManager.getDocumentsForReview();
    emptyEl.style.display = docs.length === 0 ? 'block' : 'none';

    if (docs.length === 0) {
        listEl.innerHTML = '';
        return;
    }

    if (toggleEl) toggleEl.style.display = 'flex';

    const students = await dataManager.getStudents();
    const getStudent = (id) => students.find(s => String(s.id) === String(id)) || { name: 'Unknown', studentId: id };

    function escHtml(s) {
        const div = document.createElement('div');
        div.textContent = s;
        return div.innerHTML;
    }
    function escAttr(s) {
        return String(s || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
    function formatDate(iso) {
        if (!iso) return '';
        return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    }
    function formatSize(bytes) {
        if (!bytes) return ''; if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

    function docToHtml(d, name, sid) {
        const url = d.downloadURL ? escAttr(d.downloadURL) : '';
        const viewLink = url ? `<a href="${url}" target="_blank" rel="noopener" class="document-review-name-link">${escHtml(d.fileName)}</a>` : `<span class="document-review-name">${escHtml(d.fileName)}</span>`;
        const downloadBtn = url
            ? `<button type="button" class="btn-download-doc" data-doc-url="${url}" data-doc-name="${escAttr(d.fileName || 'document')}"><i class="fas fa-download"></i> <span data-i18n="download">Download</span></button>`
            : '<span class="doc-no-url" data-i18n="no_file_url">(No file link)</span>';
        return { d, html: `
            <div class="document-review-item">
                <div class="document-review-icon"><i class="fas fa-file"></i></div>
                <div class="document-review-info">
                    ${viewLink}
                    <span class="document-review-student">${escHtml(name)} <span class="document-review-id">${escHtml(String(sid))}</span></span>
                    <span class="document-review-meta">${formatDate(d.uploadedAt)}${d.fileSize ? ' · ' + formatSize(d.fileSize) : ''}</span>
                </div>
                <div class="document-review-actions">${downloadBtn}</div>
            </div>
        ` };
    }

    function attachDownloadHandlers(container) {
        if (!container) return;
        container.querySelectorAll('.btn-download-doc').forEach(btn => {
            btn.addEventListener('click', async function() {
                const url = this.getAttribute('data-doc-url');
                const name = this.getAttribute('data-doc-name') || 'document';
                if (!url) return;
                const origHtml = this.innerHTML;
                this.disabled = true;
                this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>' + (typeof window.t === 'function' ? window.t('downloading') : 'Downloading') + '...</span>';
                await downloadDocToDevice(url, name);
                this.disabled = false;
                this.innerHTML = origHtml;
            });
        });
    }

    if (documentsReviewView === 'table') {
        const sortCol = window._documentsSortCol || 'student';
        const sortDir = window._documentsSortDir || 'asc';
        const t = typeof window.t === 'function' ? window.t : (k) => k;
        const rows = docs.map(d => {
            const student = getStudent(d.studentId);
            const name = d.studentName || student.name || 'Unknown';
            const sid = student.studentId || d.studentId;
            return { d, name, sid, sortName: name.toLowerCase(), sortDate: new Date(d.uploadedAt || 0).getTime() };
        });
        rows.sort((a, b) => {
            let v = 0;
            if (sortCol === 'student') v = a.sortName.localeCompare(b.sortName);
            else if (sortCol === 'document') v = (a.d.fileName || '').toLowerCase().localeCompare((b.d.fileName || '').toLowerCase());
            else if (sortCol === 'date') v = a.sortDate - b.sortDate;
            else if (sortCol === 'size') v = (a.d.fileSize || 0) - (b.d.fileSize || 0);
            return sortDir === 'asc' ? v : -v;
        });
        const downloadLabel = t('download');
        const studentLabel = t('student');
        const documentLabel = t('document_column') || t('document') || 'Document';
        const dateLabel = t('date') || 'Date';
        const sizeLabel = t('size') || 'Size';
        const actionsLabel = t('actions') || 'Actions';
        listEl.innerHTML = `
            <div class="documents-table-wrap">
                <table class="documents-table">
                    <thead>
                        <tr>
                            <th class="sortable" data-sort="student">${studentLabel} <i class="sort-icon"></i></th>
                            <th class="sortable" data-sort="document">${documentLabel} <i class="sort-icon"></i></th>
                            <th class="sortable" data-sort="date">${dateLabel} <i class="sort-icon"></i></th>
                            <th class="sortable" data-sort="size">${sizeLabel} <i class="sort-icon"></i></th>
                            <th>${actionsLabel}</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows.map(r => {
                            const { d, name, sid } = r;
                            const url = d.downloadURL ? escAttr(d.downloadURL) : '';
                            const viewLink = url ? `<a href="${url}" target="_blank" rel="noopener" class="document-review-name-link">${escHtml(d.fileName)}</a>` : escHtml(d.fileName);
                            const downloadBtn = url
                                ? `<button type="button" class="btn-download-doc btn-sm" data-doc-url="${url}" data-doc-name="${escAttr(d.fileName || 'document')}"><i class="fas fa-download"></i> ${downloadLabel}</button>`
                                : '<span class="doc-no-url" data-i18n="no_file_url">(No file link)</span>';
                            return `<tr>
                                <td><span class="doc-cell-student">${escHtml(name)}</span> <span class="doc-cell-id">${escHtml(String(sid))}</span></td>
                                <td>${viewLink}</td>
                                <td>${formatDate(d.uploadedAt)}</td>
                                <td>${formatSize(d.fileSize)}</td>
                                <td>${downloadBtn}</td>
                            </tr>`;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
        listEl.querySelectorAll('.sortable').forEach(th => {
            th.addEventListener('click', function() {
                const col = this.getAttribute('data-sort');
                if (!col) return;
                const nextDir = (window._documentsSortCol === col && window._documentsSortDir === 'asc') ? 'desc' : 'asc';
                window._documentsSortCol = col;
                window._documentsSortDir = nextDir;
                loadDocumentsForReview();
            });
            const isActive = th.getAttribute('data-sort') === sortCol;
            const icon = th.querySelector('.sort-icon');
            if (icon) icon.className = 'sort-icon fas ' + (isActive ? (sortDir === 'asc' ? 'fa-sort-up' : 'fa-sort-down') : 'fa-sort');
        });
        attachDownloadHandlers(listEl);
    } else {
        const grouped = {};
        for (const d of docs) {
            const sid = String(d.studentId);
            if (!grouped[sid]) grouped[sid] = [];
            grouped[sid].push(d);
        }
        const studentIds = Object.keys(grouped).sort((a, b) => {
            const sa = getStudent(a);
            const sb = getStudent(b);
            return (sa.name || '').localeCompare(sb.name || '');
        });
        listEl.innerHTML = studentIds.map(sid => {
            const student = getStudent(sid);
            const name = student.name || 'Unknown';
            const sidDisplay = student.studentId || sid;
            const studentDocs = grouped[sid];
            const count = studentDocs.length;
            const docsHtml = studentDocs.map(d => docToHtml(d, name, sidDisplay).html).join('');
            return `
                <div class="documents-group" data-student-id="${escAttr(sid)}">
                    <button type="button" class="documents-group-header" aria-expanded="true">
                        <i class="fas fa-chevron-down documents-group-chevron"></i>
                        <span class="documents-group-name">${escHtml(name)}</span>
                        <span class="documents-group-id">${escHtml(String(sidDisplay))}</span>
                        <span class="documents-group-count">${count} ${count === 1 ? (typeof window.t === 'function' ? window.t('document') : 'document') : (typeof window.t === 'function' ? window.t('documents') : 'documents')}</span>
                    </button>
                    <div class="documents-group-body">
                        ${docsHtml}
                    </div>
                </div>
            `;
        }).join('');

        listEl.querySelectorAll('.documents-group-header').forEach(btn => {
            btn.addEventListener('click', function() {
                const group = this.closest('.documents-group');
                const body = group?.querySelector('.documents-group-body');
                const chevron = this.querySelector('.documents-group-chevron');
                const expanded = body?.style.display !== 'none';
                if (body) body.style.display = expanded ? 'none' : '';
                if (chevron) chevron.style.transform = expanded ? 'rotate(-90deg)' : '';
                this.setAttribute('aria-expanded', expanded ? 'false' : 'true');
            });
        });
        attachDownloadHandlers(listEl);
    }

    document.querySelectorAll('.view-toggle-btn').forEach(b => {
        b.classList.toggle('active', b.getAttribute('data-view') === documentsReviewView);
    });

    if (typeof applyI18n === 'function') applyI18n();
}

function setupDocumentsViewToggle() {
    const container = document.getElementById('documents-for-review-section');
    if (!container) return;
    container.addEventListener('click', function(e) {
        const btn = e.target.closest('.view-toggle-btn');
        if (!btn) return;
        const view = btn.getAttribute('data-view');
        if (!view || view === documentsReviewView) return;
        documentsReviewView = view;
        if (typeof localStorage !== 'undefined') localStorage.setItem('documentsReviewView', view);
        document.querySelectorAll('.view-toggle-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        loadDocumentsForReview();
    });
}

// Download document file to device - uses Firebase Storage SDK when available (avoids CORS)
async function downloadDocToDevice(url, fileName) {
    const triggerDownload = (blob) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = fileName || 'document';
        a.click();
        URL.revokeObjectURL(a.href);
    };
    try {
        if (typeof firebase !== 'undefined' && firebase.storage) {
            const ref = firebase.storage().refFromURL(url);
            const blob = await ref.getBlob();
            triggerDownload(blob);
            return;
        }
        const res = await fetch(url, { mode: 'cors' });
        if (!res.ok) throw new Error('Download failed');
        const blob = await res.blob();
        triggerDownload(blob);
    } catch (e) {
        console.warn('Download failed, opening in new tab:', e);
        window.open(url, '_blank');
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
    
    const formattedDate = typeof formatDateDisplay === 'function' ? formatDateDisplay(selectedDateOverview) : selectedDateOverview.toLocaleDateString('en-US', { year: '2-digit', month: 'long', day: 'numeric' });
    
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
    const bestGrid = document.querySelector('#daily-overview-section #bestStudentsGrid');
    const tableBody = document.querySelector('#daily-overview-section #overviewTableBody');
    const loadingText = typeof window.t === 'function' ? window.t('loading') : 'Loading...';
    const spinnerHtml = `<div class="loading-spinner"><i class="fas fa-circle-notch fa-spin"></i><span>${loadingText}</span></div>`;
    if (bestGrid) bestGrid.innerHTML = `<div class="loading-spinner" style="grid-column: 1 / -1;"><i class="fas fa-circle-notch fa-spin"></i><span>${loadingText}</span></div>`;
    if (tableBody) tableBody.innerHTML = `<tr><td colspan="20" style="text-align:center;padding:2rem;">${spinnerHtml}</td></tr>`;

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
                    <p>${getStudentYearLabel(sp.student)}</p>
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
            const safeTitle = (task.title || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
            taskCells.push(`<td data-task-title="${safeTitle}"><span class="task-status ${statusClass}">${statusIcon}</span></td>`);
        }
        
        const trophyIcon = isTopPerformer ? '<span class="completion-trophy">🏆</span>' : '';
        
        const yearLabel = getStudentYearLabel(student);
        rows.push(`
            <tr class="${isTopPerformer ? 'top-performer' : ''}">
                <td class="sticky-col student-col">
                    <div class="student-cell">
                        <div class="student-avatar-small">${initial}</div>
                        <div class="student-name-info">
                            <h4>${student.name}</h4>
                            <p class="desktop-only">${student.studentId || 'N/A'}</p>
                            <p class="mobile-student-meta">${yearLabel}<br><strong class="completion-cell ${completionClass}">${sp.percentage}%${trophyIcon}</strong></p>
                        </div>
                    </div>
                </td>
                <td class="sticky-col info-col">
                    <div class="info-cell">
                        <span class="info-badge">${yearLabel}</span>
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
    if (confirm('⚠️ ' + _t('confirm_reset_sample_data'))) {
        try {
            // Clear data using the storage adapter (works for both localStorage and Firebase)
            await dataManager.storage.clear();
            alert('✅ ' + _t('alert_sample_data_reset'));
            location.reload();
        } catch (error) {
            console.error('Error resetting data:', error);
            alert('❌ ' + _t('alert_error_resetting_data'));
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
        `<span class="task-deadline"><i class="fas fa-calendar-alt"></i> ${typeof formatDateDisplay === 'function' ? formatDateDisplay(task.deadline) : new Date(task.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>` : 
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
        alert('❌ ' + _t('alert_task_not_found'));
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
        const isChecked = assignedStudentIds.some(sid => String(sid) === String(student.id));
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
    ).map(cb => cb.value);
    
    if (selectedStudents.length === 0) {
        alert('❌ ' + _t('alert_select_one_student_task'));
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
        alert('✅ ' + _t('alert_task_updated'));
        closeEditTaskModal();
        await loadAllTasks();
        await updateDashboard();
    } else {
        alert('❌ ' + _t('alert_task_update_failed'));
    }
}

// Handle Delete Task
async function handleDeleteTask(taskId) {
    const task = await dataManager.getTaskById(taskId);
    if (!task) return;
    
    const confirmMsg = '⚠️ ' + _t('confirm_delete_task', { title: task.title, count: task.assignedTo.length });
    
    if (confirm(confirmMsg)) {
        await dataManager.deleteTask(taskId);
        alert('✅ ' + _t('alert_task_deleted'));
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

