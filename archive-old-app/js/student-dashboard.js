// Student Dashboard JavaScript

let currentStudent = null;
let overviewHistoryCache = [];

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
    initializeStudentDashboard();
    setupMobileMenu();
    setupTabListeners();
    updateUnreadBadge();
    setupRealtimeMessagesTab();

    // Update unread badge every 5 seconds
    setInterval(() => updateUnreadBadge(), 5000);
}

// Real-time: refresh Messages tab when new messages arrive (teacher reply)
function setupRealtimeMessagesTab() {
    if (typeof dataManager?.subscribeToCollection !== 'function') return;
    dataManager.subscribeToCollection('messages', function() {
        const messagesTab = document.getElementById('tab-messages');
        if (messagesTab && messagesTab.checked && currentStudent) {
            loadMessagesTab();
            updateUnreadBadge();
        }
    });
}

// Setup Tab Listeners for lazy loading
function setupTabListeners() {
    // Listen for exams tab activation to load quizzes
    const examsTab = document.getElementById('tab-exams');
    if (examsTab) {
        examsTab.addEventListener('change', function() {
            if (this.checked) {
                loadStudentQuizzes();
            }
        });
    }
    
    // Listen for messages tab activation to load messages
    const messagesTab = document.getElementById('tab-messages');
    if (messagesTab) {
        messagesTab.addEventListener('change', function() {
            if (this.checked) {
                loadMessagesTab();
                markMessagesAsRead();
            }
        });
    }
    
    // Listen for records tab activation to load records
    const recordsTab = document.getElementById('tab-records');
    if (recordsTab) {
        recordsTab.addEventListener('change', function() {
            if (this.checked) loadRecordsTab();
        });
    }
    
    // Setup message send functionality
    setupMessageSendTab();
}

// Update Unread Badge (desktop tab + bottom nav)
async function updateUnreadBadge() {
    if (!currentStudent) return;
    
    const unreadCount = await dataManager.getUnreadCount(currentStudent.id, 'student');
    const show = unreadCount > 0 ? 'block' : 'none';
    
    const tabDot = document.getElementById('msgUnreadDot');
    if (tabDot) tabDot.style.display = show;
    
    const navDot = document.getElementById('msgUnreadDotNav');
    if (navDot) navDot.style.display = show;
    
    const sidebarDot = document.getElementById('msgUnreadDotSidebar');
    if (sidebarDot) sidebarDot.style.display = show;
}

// Initialize Student Dashboard
async function initializeStudentDashboard() {
    const studentId = typeof getCurrentStudentId === 'function' ? getCurrentStudentId() : sessionStorage.getItem('currentStudentId');
    const loggedIn = typeof isStudentLoggedIn === 'function' ? isStudentLoggedIn() : !!studentId;

    if (!loggedIn || !studentId) {
        window.location.href = '/index.html';
        return;
    }

    currentStudent = await dataManager.getStudentById(studentId);

    if (!currentStudent) {
        alert(typeof window.t === 'function' ? window.t('student_not_found') : 'Student not found!');
        window.location.href = '/pages/student-list.html';
        return;
    }

    // Load student data
    loadStudentProfile();
    await loadStudentStats();
    await loadStudentTasks();
    
    console.log('✅ Student dashboard initialized');
}

// Load Student Profile
function loadStudentProfile() {
    const initial = currentStudent.name.charAt(0).toUpperCase();
    
    // Update profile in sidebar
    const avatar = document.getElementById('studentAvatar');
    if (avatar) avatar.textContent = initial;
    
    const sidebarName = document.getElementById('studentNameSidebar');
    const sidebarRole = document.getElementById('studentRole');
    const headerName = document.getElementById('studentNameHeader');
    
    if (sidebarName) sidebarName.textContent = currentStudent.name;
    if (sidebarRole) sidebarRole.textContent = currentStudent.email || 'Student';
    const greeting = (typeof window.t === 'function' ? window.t('greeting') : null) || 'Marhaba';
    const firstName = (currentStudent.name || '').trim().split(/\s+/)[0] || 'Student';
    if (headerName) headerName.textContent = `${greeting}, ${firstName}!`;

    // Populate Profile tab
    const fmt = (v) => (v && String(v).trim()) ? v : '-';
    const fmtDate = (d) => d ? (typeof formatDateDisplay === 'function' ? formatDateDisplay(d) : new Date(d).toLocaleDateString()) : '-';
    const setProfile = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    setProfile('profileStudentId', fmt(currentStudent.studentId));
    setProfile('profileDateOfBirth', fmtDate(currentStudent.dateOfBirth));
    const yearNum = dataManager && typeof dataManager.getStudentYear === 'function' ? dataManager.getStudentYear(currentStudent.enrollmentDate) : 1;
    const yearKeys = ['', 'first_year', 'second_year', 'third_year', 'fourth_year', 'fifth_year', 'sixth_year', 'seventh_year', 'eighth_year', 'ninth_year', 'tenth_year'];
    const yearKey = yearKeys[yearNum] || ('year_' + yearNum);
    const yearLabel = (yearKey && typeof _t === 'function' ? _t(yearKey) : null) || ('Year ' + yearNum);
    setProfile('profileYear', yearLabel);
    setProfile('profileAdmissionDate', fmtDate(currentStudent.enrollmentDate));
    setProfile('profilePhone', fmt(currentStudent.phone));
    setProfile('profileEmail', fmt(currentStudent.email));
    setProfile('profileParentName', fmt(currentStudent.parentName));
    setProfile('profileParentPhone', fmt(currentStudent.parentPhone));
    setProfile('profileParentEmail', fmt(currentStudent.parentEmail));
    setProfile('profileFatherWork', fmt(currentStudent.fatherWork));
    setProfile('profileDistrict', fmt(currentStudent.district));
    setProfile('profileUpazila', fmt(currentStudent.upazila));
    setProfile('profileAddress', fmt(currentStudent.address));
    setProfile('profileEnrollmentDate', fmtDate(currentStudent.enrollmentDate));
}

function _t(key, params) {
    return typeof window.t === 'function' ? window.t(key, params) : key;
}

// Handle Change PIN (student self-service)
async function handleChangePin(e) {
    e.preventDefault();
    const currentPin = document.getElementById('changePinCurrent').value.trim();
    const newPin = document.getElementById('changePinNew').value.trim();
    const confirmPin = document.getElementById('changePinConfirm').value.trim();
    if (newPin.length < 4 || newPin.length > 8) {
        alert('❌ ' + (_t('alert_pin_required') || 'Please enter a 4-6 digit PIN.'));
        return;
    }
    if (newPin !== confirmPin) {
        alert('❌ ' + (_t('alert_pin_mismatch') || 'PINs do not match.'));
        return;
    }
    const storedPin = (currentStudent.pin || '').toString().trim();
    if (currentPin !== storedPin) {
        alert('❌ ' + (_t('alert_wrong_current_pin') || 'Current PIN is incorrect.'));
        return;
    }
    try {
        await dataManager.updateStudentPin(currentStudent.id, newPin, 'student');
        currentStudent = await dataManager.getStudentById(currentStudent.id);
        document.getElementById('changePinForm').reset();
        alert('✅ ' + (_t('alert_pin_updated') || 'PIN updated successfully.'));
    } catch (err) {
        alert('❌ ' + (_t('login_error') || 'Failed to update PIN.'));
    }
}

// Load Student Stats
async function loadStudentStats() {
    const stats = await dataManager.getStudentStats(currentStudent.id);

    // Update daily progress stat card
    updateDailyStatCard(stats);
    
    // Update one-time progress stat card
    updateOnetimeStatCard(stats);
    
    // Update exam stats card
    await updateExamStatCard(currentStudent.id);
}

// Update Daily Stat Card
function updateDailyStatCard(stats) {
    const dailyTotal = stats.dailyTotal || 0;
    const dailyCompleted = stats.dailyCompletedToday || 0;
    const dailyPercentage = dailyTotal > 0 ? Math.round((dailyCompleted / dailyTotal) * 100) : 0;
    
    const percentEl = document.getElementById('dailyPercentageCard');
    const progressEl = document.getElementById('dailyProgressCard');
    const completedEl = document.getElementById('dailyCompletedCard');
    const totalEl = document.getElementById('dailyTotalCard');
    
    if (percentEl) percentEl.textContent = dailyPercentage + '%';
    if (progressEl) {
        setTimeout(() => { progressEl.style.width = dailyPercentage + '%'; }, 100);
    }
    if (completedEl) completedEl.textContent = dailyCompleted;
    if (totalEl) totalEl.textContent = dailyTotal;
}

// Update One-time Stat Card
function updateOnetimeStatCard(stats) {
    const total = stats.total || 0;
    const completed = stats.completed || 0;
    const percentage = stats.percentage || 0;
    
    const percentEl = document.getElementById('onetimePercentageCard');
    const progressEl = document.getElementById('onetimeProgressCard');
    const completedEl = document.getElementById('onetimeCompletedCard');
    const totalEl = document.getElementById('onetimeTotalCard');
    
    if (percentEl) percentEl.textContent = percentage + '%';
    if (progressEl) {
        setTimeout(() => { progressEl.style.width = percentage + '%'; }, 100);
    }
    if (completedEl) completedEl.textContent = completed;
    if (totalEl) totalEl.textContent = total;
}

// Update Exam Stat Card
async function updateExamStatCard(studentId) {
    const stats = await dataManager.getStudentQuizStats(studentId);
    const quizzes = await dataManager.getQuizzesForStudent(studentId);
    const taken = stats.totalQuizzes || 0;
    const passed = stats.passedCount || 0;
    const total = quizzes.length || 0;
    const percentage = stats.averagePercentage || 0;
    
    const percentEl = document.getElementById('examPercentageCard');
    const progressEl = document.getElementById('examProgressCard');
    const passedEl = document.getElementById('examPassedCard');
    const totalEl = document.getElementById('examTotalCard');
    
    if (percentEl) percentEl.textContent = percentage + '%';
    if (progressEl) {
        const progressPercent = total > 0 ? Math.round((passed / total) * 100) : 0;
        setTimeout(() => { progressEl.style.width = progressPercent + '%'; }, 100);
    }
    if (passedEl) passedEl.textContent = passed;
    if (totalEl) totalEl.textContent = taken;
}

// Load Student Tasks
async function loadStudentTasks() {
    // Set today's date
    const today = new Date();
    const todayDateElement = document.getElementById('todayDate');
    if (todayDateElement) {
        todayDateElement.textContent = typeof formatDateDisplay === 'function' ? formatDateDisplay(today) : today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    }

    // Load daily tasks
    const dailyContainer = document.getElementById('dailyTasksList');
    if (dailyContainer) {
        dailyContainer.innerHTML = `
            <div class="skeleton-list">
                ${Array.from({length: 3}).map(()=>`<div class="skeleton skeleton-text" style="width:90%"></div>`).join('')}
            </div>`;
    }
    const dailyTasks = await dataManager.getDailyTasksForStudent(currentStudent.id);
    await loadDailyTaskSection('dailyTasksList', dailyTasks);

    // Load overall overview (from admission date)
    await loadCompletionOverview();

    // Load regular tasks
    const pendingContainer = document.getElementById('pendingTasksList');
    const completedContainer = document.getElementById('completedTasksList');
    if (pendingContainer) pendingContainer.innerHTML = `<div class="skeleton-list">${Array.from({length: 3}).map(()=>`<div class=\"skeleton skeleton-text\" style=\"width:95%\"></div>`).join('')}</div>`;
    if (completedContainer) completedContainer.innerHTML = `<div class="skeleton-list">${Array.from({length: 2}).map(()=>`<div class=\"skeleton skeleton-text\" style=\"width:80%\"></div>`).join('')}</div>`;
    const regularTasks = await dataManager.getRegularTasksForStudent(currentStudent.id);
    const isCompletedByMe = (task) => (task.completedBy || []).some(sid => String(sid) === String(currentStudent.id));
    const pendingTasks = regularTasks.filter(task => !isCompletedByMe(task));
    const completedTasks = regularTasks.filter(task => isCompletedByMe(task));

    loadTaskSection('pendingTasksList', pendingTasks, false);
    loadTaskSection('completedTasksList', completedTasks, true);
}

// Load Task Section
function loadTaskSection(containerId, tasks, isCompleted) {
    const container = document.getElementById(containerId);
    if (!container) return;

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
        const isTaskCompleted = (task.completedBy || []).some(sid => String(sid) === String(currentStudent.id));
        const deadlineDate = task.deadline ? (typeof formatDateDisplay === 'function' ? formatDateDisplay(task.deadline) : new Date(task.deadline).toLocaleDateString()) : 'No deadline';
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
                            <span class="task-badge ${task.type}">One-time Task</span>
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
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Color class for percentage: 0=red, 1-49=yellow, 50-69=orange, 70-99=sky, 100=green
function getOverviewColorClass(pct) {
    if (pct >= 100) return 'ov-green';
    if (pct >= 70) return 'ov-sky';
    if (pct >= 50) return 'ov-orange';
    if (pct > 0) return 'ov-yellow';
    return 'ov-red';
}

// Load Overall Completion Overview (date + percentage cells; mobile 10 days, desktop responsive)
async function loadCompletionOverview() {
    const container = document.getElementById('overviewHistoryScroll');
    if (!container || !currentStudent) return;

    const admissionDate = currentStudent.enrollmentDate || currentStudent.admissionDate;
    const startDateStr = admissionDate ? new Date(admissionDate).toISOString().split('T')[0] : null;
    const history = await dataManager.getStudentDailyCompletionRateHistoryFromDate(
        currentStudent.id, startDateStr, 365
    );
    const _t = typeof window.t === 'function' ? window.t : (k) => k;

    const section = document.getElementById('overviewSection');
    if (!history || history.length === 0 || (history[0] && history[0].total === 0)) {
        if (section) section.style.display = 'none';
        return;
    }
    if (section) section.style.display = '';

    // Summary: "Since [date]" + avg%
    const sinceEl = document.getElementById('overviewSince');
    const avgEl = document.getElementById('overviewAvgPct');
    if (sinceEl) {
        const dateToShow = admissionDate || history[0]?.date;
        const fmt = dateToShow
            ? (typeof formatDateDisplay === 'function' ? formatDateDisplay(new Date(dateToShow + (dateToShow.includes('T') ? '' : 'T12:00:00'))) : new Date(dateToShow + (dateToShow.includes('T') ? '' : 'T12:00:00')).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }))
            : '';
        sinceEl.textContent = (_t('since') || 'Since') + ' ' + fmt;
    }
    const totalPct = history.reduce((sum, h) => sum + h.percentage, 0);
    const avgPct = history.length > 0 ? Math.round(totalPct / history.length) : 0;
    if (avgEl) {
        avgEl.textContent = avgPct + '% ' + (_t('avg') || 'avg');
        avgEl.classList.remove('pct-high', 'pct-mid', 'pct-low');
        avgEl.classList.add(avgPct >= 80 ? 'pct-high' : avgPct >= 50 ? 'pct-mid' : 'pct-low');
    }

    // Strip: last 30 days, horizontal scroll when needed
    const dayOnlyFn = typeof formatDateDisplayDayOnly === 'function' ? formatDateDisplayDayOnly : (d) => String(d.getDate());
    const fullDateFn = typeof formatDateDisplay === 'function' ? formatDateDisplay : (d) => d.toLocaleDateString();
    const stripCount = 30;
    const stripDays = history.slice(-stripCount);
    overviewHistoryCache = history;

    let stripHtml = '';
    stripDays.forEach(h => {
        const d = new Date(h.date + 'T12:00:00');
        const dayStr = dayOnlyFn(d);
        const fullDateStr = fullDateFn(d);
        const colorClass = getOverviewColorClass(h.percentage);
        stripHtml += `<div class="overview-cell comp-cell-clickable ${colorClass}" data-date="${h.date}" role="button" tabindex="0" title="${fullDateStr}: ${h.percentage}%">
            <span class="overview-cell-date">${dayStr}</span>
            <span class="overview-cell-pct">${h.percentage}%</span>
        </div>`;
    });
    container.innerHTML = stripHtml;

    container.querySelectorAll('.comp-cell-clickable').forEach(cell => {
        cell.addEventListener('click', (e) => {
            e.stopPropagation();
            showDayDetails(cell.dataset.date);
        });
        cell.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                showDayDetails(cell.dataset.date);
            }
        });
    });

    // Header and strip click -> open calendar modal (strip: except when clicking on cells)
    const openCal = () => openOverviewCalendarModal(overviewHistoryCache);
    const headerEl = document.getElementById('overviewHeader');
    const stripEl = document.getElementById('overviewStrip');
    if (headerEl) {
        headerEl.onclick = () => openCal();
        headerEl.onkeydown = (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openCal();
            }
        };
    }
    if (stripEl) {
        stripEl.onclick = (e) => { if (!e.target.closest('.overview-cell')) openCal(); };
        stripEl.onkeydown = (e) => {
            if ((e.key === 'Enter' || e.key === ' ') && !e.target.closest('.overview-cell')) {
                e.preventDefault();
                openCal();
            }
        };
    }
}

// Open full calendar modal (months with days)
async function openOverviewCalendarModal(history) {
    const overlay = document.getElementById('overviewCalendarOverlay');
    const body = document.getElementById('overviewCalendarBody');
    if (!overlay || !body || !history || history.length === 0) return;

    const monthYearFn = typeof formatDateDisplayMonthYear === 'function' ? formatDateDisplayMonthYear : (d) => d.toLocaleDateString(undefined, { month: 'long', year: '2-digit' });
    const dayOnlyFn = typeof formatDateDisplayDayOnly === 'function' ? formatDateDisplayDayOnly : (d) => String(d.getDate());
    const fullDateFn = typeof formatDateDisplay === 'function' ? formatDateDisplay : (d) => d.toLocaleDateString();

    let lastMonthKey = '';
    let html = '';
    history.forEach(h => {
        const d = new Date(h.date + 'T12:00:00');
        const monthKey = monthYearFn(d);
        if (monthKey !== lastMonthKey) {
            if (lastMonthKey) html += '</div></div>';
            html += `<div class="overview-cal-month"><div class="overview-cal-month-header">${monthKey}</div><div class="overview-cal-grid">`;
            lastMonthKey = monthKey;
        }
        const fullDateStr = fullDateFn(d);
        const colorClass = getOverviewColorClass(h.percentage);
        html += `<div class="overview-cal-cell comp-cell-clickable ${colorClass}" data-date="${h.date}" role="button" tabindex="0" title="${fullDateStr}: ${h.percentage}%">
            <span class="overview-cell-date">${dayOnlyFn(d)}</span>
            <span class="overview-cell-pct">${h.percentage}%</span>
        </div>`;
    });
    if (lastMonthKey) html += '</div></div>';
    body.innerHTML = html;

    body.querySelectorAll('.comp-cell-clickable').forEach(cell => {
        cell.addEventListener('click', () => {
            overlay.style.display = 'none';
            document.body.style.overflow = '';
            showDayDetails(cell.dataset.date);
        });
        cell.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                overlay.style.display = 'none';
                document.body.style.overflow = '';
                showDayDetails(cell.dataset.date);
            }
        });
    });

    overlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    const closeBtn = document.getElementById('overviewCalendarClose');
    const close = () => {
        overlay.style.display = 'none';
        document.body.style.overflow = '';
    };
    if (closeBtn) {
        closeBtn.onclick = close;
    }
    overlay.onclick = (e) => { if (e.target === overlay) close(); };
}

async function showDayDetails(dateStr) {
    const overlay = document.getElementById('dayDetailsOverlay');
    const titleEl = document.getElementById('dayDetailsTitle');
    const summaryEl = document.getElementById('dayDetailsSummary');
    const tasksEl = document.getElementById('dayDetailsTasks');
    if (!overlay || !currentStudent) return;

    const details = await dataManager.getStudentDailyCompletionDetailsForDate(currentStudent.id, dateStr);
    const d = new Date(dateStr + 'T12:00:00');
    const formattedDate = typeof formatDateDisplay === 'function' ? formatDateDisplay(d) : d.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    titleEl.textContent = formattedDate;
    summaryEl.innerHTML = `<span class="day-details-pct">${details.percentage}%</span> completed: <strong>${details.completed}</strong> of <strong>${details.total}</strong> daily tasks`;

    if (details.tasks.length === 0) {
        tasksEl.innerHTML = '<li class="day-details-empty">No daily tasks assigned for this period.</li>';
    } else {
        tasksEl.innerHTML = details.tasks.map(t => `
            <li class="day-details-task ${t.completed ? 'completed' : ''}">
                <i class="fas ${t.completed ? 'fa-check-circle' : 'fa-circle'}"></i>
                <span>${t.title}</span>
            </li>
        `).join('');
    }

    overlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    const closeBtn = document.getElementById('dayDetailsClose');
    const close = () => {
        overlay.style.display = 'none';
        document.body.style.overflow = '';
    };
    overlay.onclick = (e) => { if (e.target === overlay) close(); };
    if (closeBtn) closeBtn.onclick = close;
}

// Load Daily Task Section
async function loadDailyTaskSection(containerId, tasks) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (tasks.length === 0) {
        container.innerHTML = `
            <div class="no-tasks">
                <i class="fas fa-calendar-check"></i>
                <p>No daily tasks assigned yet!</p>
            </div>
        `;
        return;
    }

    const items = [];
    for (const task of tasks) {
        const isCompletedToday = await dataManager.isDailyTaskCompletedToday(task.id, currentStudent.id);
        items.push(`
            <div class="task-item daily-task ${isCompletedToday ? 'completed' : ''} fade-in">
                <div class="task-header">
                    <div class="task-checkbox">
                        <input type="checkbox" 
                               id="daily-task-${task.id}" 
                               ${isCompletedToday ? 'checked' : ''}
                               onchange="toggleDailyTask(${task.id})">
                    </div>
                    <div class="task-content">
                        <div class="task-title">
                            ${task.title}
                        </div>
                        ${task.description ? `<div class="task-description">${task.description}</div>` : ''}
                        <div class="task-meta">
                            <div class="task-meta-item task-meta-plain">
                                <i class="fas fa-sync-alt"></i>
                                <span>Repeats every day</span>
                            </div>
                            ${isCompletedToday ? `
                                <div class="task-meta-item" style="color: var(--success-soft);">
                                    <i class="fas fa-check"></i>
                                    <span>Completed today!</span>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `);
    }
    container.innerHTML = items.join('');
}

// Toggle Daily Task Completion
async function toggleDailyTask(taskId) {
    await dataManager.toggleDailyTaskCompletion(taskId, currentStudent.id);
    
    // Reload everything with animation
    setTimeout(async () => {
        await loadStudentStats();
        await loadStudentTasks();
    }, 200);
}

// Toggle Task Completion
async function toggleTask(taskId) {
    await dataManager.toggleTaskCompletion(taskId, currentStudent.id);
    
    // Reload everything with animation
    setTimeout(async () => {
        await loadStudentStats();
        await loadStudentTasks();
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

// Setup Mobile Menu (sidebar is hidden on mobile, no toggle needed)
function setupMobileMenu() {
    // Sidebar is now hidden completely on mobile via CSS
    // No menu toggle needed
}

// Helper: Get current student ID from session
function getStudentId() {
    return sessionStorage.getItem('currentStudentId');
}

// Logout / Go Back
function goBackToList() {
    sessionStorage.removeItem('currentStudentId');
    window.location.href = '/pages/student-list.html';
}

/* ===================================
   MESSAGES TAB FUNCTIONS
   =================================== */

// Load Messages Tab
async function loadMessagesTab() {
    const area = document.getElementById('messagesTabArea');
    if (!area || !currentStudent) return;
    
    const messages = await dataManager.getMessagesForStudent(currentStudent.id);
    
    if (!messages || messages.length === 0) {
        area.innerHTML = `
            <div class="no-messages-placeholder">
                <i class="fas fa-comments"></i>
                <p>No messages yet. Start a conversation with your teacher!</p>
            </div>
        `;
        return;
    }
    
    let lastDate = '';
    let html = '';
    
    const toDateKey = function(d) { return d.toISOString().slice(0, 10); };
    messages.forEach(function(msg) {
        const msgDate = new Date(msg.timestamp);
        const messageDateKey = toDateKey(msgDate);
        
        // Date separator
        if (messageDateKey !== lastDate) {
            const todayKey = toDateKey(new Date());
            const yesterdayKey = toDateKey(new Date(Date.now() - 86400000));
            let dateLabel = typeof formatDateDisplay === 'function' ? formatDateDisplay(msg.timestamp) : msgDate.toLocaleDateString();
            if (messageDateKey === todayKey) dateLabel = (typeof window.t === 'function' ? window.t('today') : null) || 'Today';
            else if (messageDateKey === yesterdayKey) dateLabel = (typeof window.t === 'function' ? window.t('yesterday') : null) || 'Yesterday';
            
            html += '<div class="msg-date-sep">' + dateLabel + '</div>';
            lastDate = messageDateKey;
        }
        
        const isSent = msg.sender === 'student';
        const msgClass = isSent ? 'sent' : 'received';
        const time = new Date(msg.timestamp).toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit', 
            hour12: true 
        });
        const escaped = String(msg.message || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        
        html += '<div class="msg-bubble ' + msgClass + '">';
        html += '<div class="msg-text">' + escaped + '</div>';
        html += '<div class="msg-time">' + time + '</div>';
        html += '</div>';
    });
    
    area.innerHTML = html;
    area.scrollTop = area.scrollHeight;
}

// Setup Message Send for Tab
function setupMessageSendTab() {
    const input = document.getElementById('messageInputTab');
    const btn = document.getElementById('messageSendBtnTab');
    if (!input || !btn) return;
    
    function sendMsg() {
        const text = input.value.trim();
        if (!text || !currentStudent) return;
        
        dataManager.sendMessage(currentStudent.id, text, 'student').then(function() {
            input.value = '';
            loadMessagesTab();
        });
    }
    
    btn.addEventListener('click', sendMsg);
    input.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            sendMsg();
        }
    });
}

/* ===================================
   RECORDS TAB FUNCTIONS
   =================================== */

// Load Records Tab - Exam history and daily task history
async function loadRecordsTab() {
    const area = document.getElementById('recordsTabArea');
    if (!area || !currentStudent) return;

    area.innerHTML = '<div class="skeleton-list" style="padding: 2rem;"><div class="skeleton skeleton-text" style="width: 80%; margin-bottom: 1rem;"></div><div class="skeleton skeleton-text" style="width: 90%;"></div><div class="skeleton skeleton-text" style="width: 70%; margin-top: 1rem;"></div></div>';

    const studentId = currentStudent.id;
    const _t = typeof window.t === 'function' ? window.t : (k) => k;

    // 1. Load exam history
    const allResults = await dataManager.getResultsForStudent(studentId);
    const sortedResults = (allResults || []).sort((a, b) => 
        new Date(b.submittedAt || 0) - new Date(a.submittedAt || 0)
    );

    let examHtml = '';
    if (sortedResults.length === 0) {
        examHtml = `<div class="records-empty"><i class="fas fa-clipboard-list"></i><p>${_t('no_exam_records')}</p></div>`;
    } else {
        examHtml = `<div class="records-section">
            <div class="records-section-title"><i class="fas fa-graduation-cap"></i> <span>${_t('exam_history')}</span></div>
            <div class="records-exam-list">`;
        for (const result of sortedResults) {
            const quiz = await dataManager.getQuizById(result.quizId);
            const quizTitle = quiz ? quiz.title : _t('unknown_quiz');
            const date = result.submittedAt ? (typeof formatDateDisplay === 'function' ? formatDateDisplay(result.submittedAt) : new Date(result.submittedAt).toLocaleDateString(undefined, { dateStyle: 'medium' })) : '—';
            const time = result.submittedAt ? new Date(result.submittedAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : '';
            const pct = result.percentage != null ? result.percentage.toFixed(1) : '—';
            const passed = result.passed === true;
            const pending = result.status === 'pending_review';
            const timeTaken = result.timeTaken != null ? `${Math.floor(result.timeTaken / 60)}m ${result.timeTaken % 60}s` : '';
            examHtml += `
                <div class="record-exam-item ${pending ? 'pending' : ''}">
                    <div class="record-exam-main">
                        <span class="record-exam-title">${quizTitle}</span>
                        <span class="record-exam-date">${date}${time ? ' • ' + time : ''}</span>
                    </div>
                    <div class="record-exam-details">
                        ${pending ? `<span class="record-badge pending">${_t('pending_review')}</span>` : ''}
                        ${!pending && pct !== '—' ? `<span class="record-score ${passed ? 'passed' : 'failed'}">${pct}%</span>` : ''}
                        ${passed && !pending ? `<span class="record-badge passed"><i class="fas fa-check-circle"></i> ${_t('passed')}</span>` : ''}
                        ${!passed && !pending && result.passed === false ? `<span class="record-badge failed"><i class="fas fa-times-circle"></i> ${_t('failed')}</span>` : ''}
                        ${timeTaken ? `<span class="record-time"><i class="fas fa-clock"></i> ${timeTaken}</span>` : ''}
                    </div>
                </div>`;
        }
        examHtml += '</div></div>';
    }

    // 2. Load daily task history (last 7 days)
    const dailyTasks = await dataManager.getDailyTasksForStudent(studentId);
    let dailyHtml = '';
    if (dailyTasks.length === 0) {
        dailyHtml = `<div class="records-empty records-empty-small"><i class="fas fa-calendar-check"></i><p>${_t('no_daily_records')}</p></div>`;
    } else {
        dailyHtml = `<div class="records-section">
            <div class="records-section-title"><i class="fas fa-calendar-day"></i> <span>${_t('daily_completion_history')}</span></div>
            <div class="records-daily-grid">`;
        const dayLabels = [_t('sun'), _t('mon'), _t('tue'), _t('wed'), _t('thu'), _t('fri'), _t('sat')];
        for (const task of dailyTasks) {
            const history = await dataManager.getDailyTaskCompletionHistory(task.id, studentId, 7);
            const completedDates = history.filter(h => h.completed).map(h => h.date);
            dailyHtml += `<div class="record-daily-task">
                <div class="record-daily-title">${task.title}</div>
                <div class="record-daily-days">`;
            history.forEach((h, i) => {
                const d = new Date(h.date);
                const dayLabel = dayLabels[d.getDay()].substring(0, 2);
                const shortDate = d.getDate();
                dailyHtml += `<span class="record-day ${h.completed ? 'completed' : ''}" title="${h.date}">${dayLabel} ${shortDate}</span>`;
            });
            dailyHtml += `</div></div>`;
        }
        dailyHtml += '</div></div>';
    }

    area.innerHTML = `<div class="records-container">${examHtml}${dailyHtml}</div>`;
}

// Mark Messages as Read
async function markMessagesAsRead() {
    if (!currentStudent) return;
    await dataManager.markMessagesAsRead(currentStudent.id, 'student');
    updateUnreadBadge();
}

/* ===================================
   QUIZ FUNCTIONS
   =================================== */

// Load student quizzes
async function loadStudentQuizzes() {
    const studentId = getStudentId();
    if (!studentId) return;
    
    const quizzes = await dataManager.getQuizzesForStudent(studentId);
    // Parallelize hasTaken checks for performance
    const takenFlags = await Promise.all(quizzes.map(q => dataManager.hasStudentTakenQuiz(q.id, studentId)));
    const availableQuizzes = [];
    const completedQuizzes = [];
    quizzes.forEach((quiz, idx) => {
        if (takenFlags[idx]) completedQuizzes.push(quiz); else availableQuizzes.push(quiz);
    });
    
    loadAvailableQuizzes(availableQuizzes);
    await loadCompletedQuizzes(completedQuizzes, studentId);
    await updateExamStatCard(studentId);
}

// Load available quizzes - compact list, expand on click for details
function loadAvailableQuizzes(quizzes) {
    const container = document.getElementById('availableQuizzesList');
    if (!container) return;

    if (quizzes.length === 0) {
        container.innerHTML = `<p class="quiz-list-empty">${typeof window.t === 'function' ? window.t('no_available_exams') : 'No exams available at the moment.'}</p>`;
        return;
    }

    container.innerHTML = quizzes.map(quiz => {
        const totalMarks = quiz.questions.reduce((sum, q) => sum + q.marks, 0);
        const now = new Date();
        const deadline = quiz.deadline ? new Date(quiz.deadline) : null;
        const isOverdue = deadline && now > deadline;

        return `
            <div class="quiz-row-student quiz-available" data-quiz-id="${quiz.id}">
                <div class="quiz-row-header" role="button" tabindex="0">
                    <div class="quiz-row-main">
                        <span class="quiz-row-title">${quiz.title}</span>
                        ${quiz.subject ? `<span class="quiz-row-badge">${quiz.subject}</span>` : ''}
                        <span class="quiz-row-meta">${quiz.questions.length} Q • ${quiz.timeLimit} min</span>
                    </div>
                    <i class="fas fa-chevron-down quiz-row-chevron"></i>
                </div>
                <div class="quiz-row-details">
                    ${quiz.description ? `<p class="quiz-row-desc">${quiz.description}</p>` : ''}
                    <div class="quiz-row-info">
                        <span><i class="fas fa-star"></i> ${totalMarks} Marks</span>
                        <span><i class="fas fa-percent"></i> ${quiz.passingPercentage}% to Pass</span>
                    </div>
                    ${deadline ? `
                        <div class="quiz-deadline-warning quiz-row-deadline">
                            <i class="fas fa-calendar-alt"></i>
                            ${isOverdue ? `⚠️ Deadline passed: ${typeof formatDateDisplay === 'function' ? formatDateDisplay(deadline) : deadline.toLocaleDateString()}` : `Due: ${typeof formatDateDisplay === 'function' ? formatDateDisplay(deadline) : deadline.toLocaleDateString()}`}
                        </div>
                    ` : ''}
                    <a href="/pages/student-exam-take.html?quizId=${quiz.id}" class="btn-take-quiz quiz-row-btn" onclick="event.stopPropagation()">
                        <i class="fas fa-play"></i> Start Exam
                    </a>
                </div>
            </div>
        `;
    }).join('');

    container.querySelectorAll('.quiz-row-header').forEach(el => {
        el.addEventListener('click', () => {
            const row = el.closest('.quiz-row-student');
            if (row) row.classList.toggle('expanded');
        });
    });
}

// Load completed quizzes - compact list, expand on click for details
async function loadCompletedQuizzes(quizzes, studentId) {
    const container = document.getElementById('completedQuizzesList');
    if (!container) return;

    if (quizzes.length === 0) {
        container.innerHTML = `<p class="quiz-list-empty">${typeof window.t === 'function' ? window.t('no_completed_exams') : "You haven't completed any exams yet."}</p>`;
        return;
    }

    const items = [];
    for (const quiz of quizzes) {
        const result = await dataManager.getQuizResult(quiz.id, studentId);
        if (!result) continue;

        const minutes = Math.floor(result.timeTaken / 60);
        const seconds = result.timeTaken % 60;
        const isPending = result.status === 'pending_review';
        const statusLabel = isPending ? '⏳ Pending Review' : (result.passed ? '✅ Passed' : '❌ Failed');
        const statusClass = isPending ? 'pending' : (result.passed ? 'passed' : 'failed');

        items.push(`
            <div class="quiz-row-student quiz-completed ${isPending ? 'pending-review' : ''}" data-quiz-id="${quiz.id}">
                <div class="quiz-row-header" role="button" tabindex="0">
                    <div class="quiz-row-main">
                        <span class="quiz-row-title">${quiz.title}</span>
                        ${quiz.subject ? `<span class="quiz-row-badge">${quiz.subject}</span>` : ''}
                        <span class="quiz-row-score ${statusClass}">${result.percentage}% ${statusLabel}</span>
                    </div>
                    <i class="fas fa-chevron-down quiz-row-chevron"></i>
                </div>
                <div class="quiz-row-details">
                    ${isPending ? `
                        <p class="quiz-row-pending-msg">
                            <i class="fas fa-hourglass-half"></i> This exam is pending teacher review.
                            ${result.score > 0 ? 'Partial score shown (auto-graded questions only).' : 'All questions require manual grading.'}
                        </p>
                    ` : ''}
                    <div class="quiz-result-display quiz-row-result">
                        <div class="quiz-score">
                            <span class="quiz-score-value">${result.percentage}%</span>
                            <span class="quiz-score-label">${result.score} / ${result.totalMarks} marks</span>
                        </div>
                        <div class="quiz-result-details">
                            <div class="quiz-result-item"><span>Time Taken:</span><strong>${minutes}m ${seconds}s</strong></div>
                            <div class="quiz-result-item"><span>Submitted:</span><strong>${typeof formatDateDisplay === 'function' ? formatDateDisplay(result.submittedAt) : new Date(result.submittedAt).toLocaleDateString()}</strong></div>
                        </div>
                    </div>
                    ${result.answers && result.answers.some(a => a.teacherFeedback) ? `
                        <div class="quiz-feedback">
                            <strong><i class="fas fa-comment-dots"></i> Teacher Feedback:</strong>
                            ${result.answers.filter(a => a.teacherFeedback).map((a, idx) => `
                                <div><strong>Q${idx + 1}:</strong> ${a.teacherFeedback}</div>
                            `).join('')}
                        </div>
                    ` : ''}
                </div>
            </div>
        `);
    }
    container.innerHTML = items.join('');

    container.querySelectorAll('.quiz-row-header').forEach(el => {
        el.addEventListener('click', () => {
            const row = el.closest('.quiz-row-student');
            if (row) row.classList.toggle('expanded');
        });
    });
}
