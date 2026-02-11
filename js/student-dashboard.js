// Student Dashboard JavaScript

let currentStudent = null;

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

    // Update unread badge every 5 seconds
    setInterval(() => updateUnreadBadge(), 5000);
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
}

// Initialize Student Dashboard
async function initializeStudentDashboard() {
    // Get current student ID from sessionStorage
    const studentId = sessionStorage.getItem('currentStudentId');

    if (!studentId) {
        // Redirect to student list if no student selected
        window.location.href = '/pages/student-list.html';
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
    if (headerName) headerName.textContent = `Welcome, ${currentStudent.name.split(' ')[0]}!`;
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
        todayDateElement.textContent = today.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
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

    // Load regular tasks
    const pendingContainer = document.getElementById('pendingTasksList');
    const completedContainer = document.getElementById('completedTasksList');
    if (pendingContainer) pendingContainer.innerHTML = `<div class="skeleton-list">${Array.from({length: 3}).map(()=>`<div class=\"skeleton skeleton-text\" style=\"width:95%\"></div>`).join('')}</div>`;
    if (completedContainer) completedContainer.innerHTML = `<div class="skeleton-list">${Array.from({length: 2}).map(()=>`<div class=\"skeleton skeleton-text\" style=\"width:80%\"></div>`).join('')}</div>`;
    const regularTasks = await dataManager.getRegularTasksForStudent(currentStudent.id);
    const pendingTasks = regularTasks.filter(task => 
        !task.completedBy.includes(currentStudent.id)
    );
    const completedTasks = regularTasks.filter(task => 
        task.completedBy.includes(currentStudent.id)
    );

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
        const streak = await dataManager.getDailyTaskStreak(task.id, currentStudent.id);

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
                            ${streak > 0 ? `<span class="streak-badge">🔥 ${streak} day${streak > 1 ? 's' : ''}</span>` : ''}
                        </div>
                        ${task.description ? `<div class="task-description">${task.description}</div>` : ''}
                        <div class="task-meta">
                            <span class="task-badge daily">Daily Routine</span>
                            <div class="task-meta-item">
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
    
    messages.forEach(function(msg) {
        const messageDate = new Date(msg.timestamp).toLocaleDateString();
        
        // Date separator
        if (messageDate !== lastDate) {
            const today = new Date().toLocaleDateString();
            const yesterday = new Date(Date.now() - 86400000).toLocaleDateString();
            let dateLabel = messageDate;
            if (messageDate === today) dateLabel = 'Today';
            else if (messageDate === yesterday) dateLabel = 'Yesterday';
            
            html += '<div class="msg-date-sep">' + dateLabel + '</div>';
            lastDate = messageDate;
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
            const date = result.submittedAt ? new Date(result.submittedAt).toLocaleDateString(undefined, { dateStyle: 'medium' }) : '—';
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

// Load available quizzes
function loadAvailableQuizzes(quizzes) {
    const container = document.getElementById('availableQuizzesList');
    if (!container) return;
    
    if (quizzes.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #666; padding: 2rem;">No quizzes available at the moment.</p>';
        return;
    }
    
    container.innerHTML = quizzes.map(quiz => {
        const totalMarks = quiz.questions.reduce((sum, q) => sum + q.marks, 0);
        const now = new Date();
        const deadline = quiz.deadline ? new Date(quiz.deadline) : null;
        const isOverdue = deadline && now > deadline;
        
        return `
            <div class="quiz-card-student">
                <h3 class="quiz-card-title-student">${quiz.title}</h3>
                ${quiz.subject ? `<span class="quiz-subject-badge">${quiz.subject}</span>` : ''}
                ${quiz.description ? `<p class="quiz-description-student">${quiz.description}</p>` : ''}
                
                <div class="quiz-info-student">
                    <div class="quiz-info-item">
                        <i class="fas fa-question-circle"></i>
                        <span>${quiz.questions.length} Questions</span>
                    </div>
                    <div class="quiz-info-item">
                        <i class="fas fa-star"></i>
                        <span>${totalMarks} Marks</span>
                    </div>
                    <div class="quiz-info-item">
                        <i class="fas fa-clock"></i>
                        <span>${quiz.timeLimit} Minutes</span>
                    </div>
                    <div class="quiz-info-item">
                        <i class="fas fa-percent"></i>
                        <span>${quiz.passingPercentage}% to Pass</span>
                    </div>
                </div>
                
                ${deadline ? `
                    <div class="quiz-deadline-warning">
                        <i class="fas fa-calendar-alt"></i>
                        ${isOverdue ? 
                            `<span>⚠️ Deadline passed: ${deadline.toLocaleDateString()}</span>` : 
                            `<span>Due: ${deadline.toLocaleDateString()}</span>`
                        }
                    </div>
                ` : ''}
                
                <a href="/pages/student-exam-take.html?quizId=${quiz.id}" class="btn-take-quiz">
                    <i class="fas fa-play"></i> Start Exam
                </a>
            </div>
        `;
    }).join('');
}

// Load completed quizzes
async function loadCompletedQuizzes(quizzes, studentId) {
    const container = document.getElementById('completedQuizzesList');
    if (!container) return;
    
    if (quizzes.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #666; padding: 2rem;">You haven\'t completed any quizzes yet.</p>';
        return;
    }
    
    const items = [];
    for (const quiz of quizzes) {
        const result = await dataManager.getQuizResult(quiz.id, studentId);
        if (!result) continue;
        
        const totalMarks = quiz.questions.reduce((sum, q) => sum + q.marks, 0);
        const minutes = Math.floor(result.timeTaken / 60);
        const seconds = result.timeTaken % 60;
        
        const isPending = result.status === 'pending_review';
        
        items.push(`
            <div class="quiz-card-student completed ${isPending ? 'pending-review' : ''}">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <h3 class="quiz-card-title-student">${quiz.title}</h3>
                    ${isPending ? `
                        <span style="background: #FEF3C7; color: #92400E; padding: 0.25rem 0.75rem; border-radius: 12px; font-size: 0.85rem; font-weight: 600;">
                            ⏳ Pending Review
                        </span>
                    ` : ''}
                </div>
                ${quiz.subject ? `<span class="quiz-subject-badge">${quiz.subject}</span>` : ''}
                
                ${isPending ? `
                    <div style="background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 1rem; border-radius: 8px; margin: 1rem 0;">
                        <p style="color: #92400E; margin: 0; font-size: 0.95rem;">
                            <i class="fas fa-hourglass-half"></i> This exam is pending teacher review. 
                            ${result.score > 0 ? 'Partial score shown below (auto-graded questions only).' : 'All questions require manual grading.'}
                        </p>
                    </div>
                ` : ''}
                
                <div class="quiz-result-display">
                    <div class="quiz-score">
                        <span class="quiz-score-value">${result.percentage}%</span>
                        <span class="quiz-score-label">
                            ${isPending && result.score > 0 ? 'Partial: ' : ''}
                            ${result.score} / ${result.totalMarks} marks
                        </span>
                    </div>
                    
                    ${!isPending ? `
                        <div class="quiz-result-status ${result.passed ? 'passed' : 'failed'}">
                            ${result.passed ? '✅ Passed' : '❌ Failed'}
                        </div>
                    ` : ''}
                    
                    <div class="quiz-result-details">
                        <div class="quiz-result-item">
                            <span>Questions:</span>
                            <strong>${quiz.questions.length}</strong>
                        </div>
                        <div class="quiz-result-item">
                            <span>Time Taken:</span>
                            <strong>${minutes}m ${seconds}s</strong>
                        </div>
                        <div class="quiz-result-item">
                            <span>Submitted:</span>
                            <strong>${new Date(result.submittedAt).toLocaleDateString()}</strong>
                        </div>
                        ${!isPending ? `
                            <div class="quiz-result-item">
                                <span>Passing %:</span>
                                <strong>${quiz.passingPercentage}%</strong>
                            </div>
                        ` : ''}
                    </div>
                    
                    ${result.answers && result.answers.some(a => a.teacherFeedback) ? `
                        <div style="background: #E0F2FE; border-left: 4px solid #0284C7; padding: 1rem; border-radius: 8px; margin-top: 1rem;">
                            <div style="font-weight: 600; color: #075985; margin-bottom: 0.5rem;">
                                <i class="fas fa-comment-dots"></i> Teacher Feedback:
                            </div>
                            ${result.answers.filter(a => a.teacherFeedback).map((a, idx) => `
                                <div style="margin-bottom: 0.5rem;">
                                    <strong style="color: #0369A1;">Q${idx + 1}:</strong> 
                                    <span style="color: #0C4A6E;">${a.teacherFeedback}</span>
                                </div>
                            `).join('')}
                        </div>
                    ` : ''}
                </div>
            </div>
        `);
    }
    container.innerHTML = items.join('');
}
