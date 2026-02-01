// Teacher Daily Overview Page JavaScript

let selectedDate = new Date();

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
    initializeDailyOverview();
    setupMobileMenu();
}

// Initialize Daily Overview Page
function initializeDailyOverview() {
    // Set today as default
    selectToday();
}

// Select Today
async function selectToday() {
    selectedDate = new Date();
    updateDateDisplay();
    updateActiveButton('todayBtn');
    await loadOverviewData();
}

// Select Yesterday
async function selectYesterday() {
    selectedDate = new Date();
    selectedDate.setDate(selectedDate.getDate() - 1);
    updateDateDisplay();
    updateActiveButton('yesterdayBtn');
    await loadOverviewData();
}

// Select Custom Date
async function selectCustomDate() {
    const dateInput = document.getElementById('customDate');
    if (dateInput.value) {
        selectedDate = new Date(dateInput.value);
        updateDateDisplay();
        updateActiveButton(null);
        await loadOverviewData();
    }
}

// Update Date Display
function updateDateDisplay() {
    const displayElement = document.getElementById('selectedDateDisplay');
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    const formattedDate = selectedDate.toLocaleDateString('en-US', options);

    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    if (isSameDay(selectedDate, today)) {
        displayElement.textContent = `Today - ${formattedDate}`;
    } else if (isSameDay(selectedDate, yesterday)) {
        displayElement.textContent = `Yesterday - ${formattedDate}`;
    } else {
        displayElement.textContent = formattedDate;
    }
}

// Update Active Button
function updateActiveButton(buttonId) {
    document.querySelectorAll('.date-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    if (buttonId) {
        document.getElementById(buttonId).classList.add('active');
    }
}

// Load Overview Data
async function loadOverviewData() {
    const students = await dataManager.getStudents();
    const dailyTasks = await getDailyTasks();

    if (students.length === 0 || dailyTasks.length === 0) {
        await showEmptyState();
        return;
    }

    // Calculate student performance
    const studentPerformance = [];
    for (const student of students) {
        let completedCount = 0;
        for (const task of dailyTasks) {
            const isCompleted = await isDailyTaskCompletedForDate(task.id, student.id, getDateString(selectedDate));
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
    updateStatistics(students.length, dailyTasks.length, studentPerformance);

    // Display best performing students
    displayBestStudents(studentPerformance);

    // Build and display table
    await buildOverviewTable(studentPerformance, dailyTasks);
}

// Update Statistics
function updateStatistics(studentCount, taskCount, studentPerformance) {
    document.getElementById('totalStudents').textContent = studentCount;
    document.getElementById('totalTasks').textContent = taskCount;

    // Calculate overall completion
    const totalPossible = studentCount * taskCount;
    const totalCompleted = studentPerformance.reduce((sum, sp) => sum + sp.completed, 0);
    const overallPercentage = totalPossible > 0 ? Math.round((totalCompleted / totalPossible) * 100) : 0;

    document.getElementById('overallCompletion').textContent = overallPercentage + '%';
}

// Display Best Performing Students
function displayBestStudents(studentPerformance) {
    const container = document.getElementById('bestStudentsGrid');

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

// Build Overview Table
async function buildOverviewTable(studentPerformance, dailyTasks) {
    const table = document.getElementById('overviewTable');
    const thead = table.querySelector('thead tr');
    const tbody = document.getElementById('overviewTableBody');

    // Clear existing task columns (keep first 2 and last column)
    while (thead.children.length > 3) {
        thead.removeChild(thead.children[2]);
    }

    // Add task columns
    dailyTasks.forEach(task => {
        const th = document.createElement('th');
        th.innerHTML = `<i class="fas fa-check-circle"></i> ${truncateText(task.title, 20)}`;
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
            const isCompleted = await isDailyTaskCompletedForDate(task.id, student.id, getDateString(selectedDate));
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

// Show Empty State
async function showEmptyState() {
    const tbody = document.getElementById('overviewTableBody');
    const dailyTasks = await getDailyTasks();
    const students = await dataManager.getStudents();

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

    document.getElementById('bestStudentsGrid').innerHTML = '<div class="no-best-students">No data available.</div>';
    document.getElementById('totalStudents').textContent = students.length;
    document.getElementById('totalTasks').textContent = dailyTasks.length;
    document.getElementById('overallCompletion').textContent = '0%';
}

// Helper: Get Daily Tasks
async function getDailyTasks() {
    const tasks = await dataManager.getTasks();
    return tasks.filter(task => task.type === 'daily');
}

// Helper: Check if daily task is completed for specific date
async function isDailyTaskCompletedForDate(taskId, studentId, dateString) {
    const task = await dataManager.getTaskById(taskId);
    if (!task || !task.dailyCompletions) return false;

    const studentCompletions = task.dailyCompletions[studentId] || [];
    return studentCompletions.includes(dateString);
}

// Helper: Get date string in YYYY-MM-DD format
function getDateString(date) {
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
function truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

// Setup Mobile Menu
function setupMobileMenu() {
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');

    if (menuToggle) {
        menuToggle.addEventListener('click', function() {
            sidebar.classList.toggle('active');
            toggleOverlay(sidebar.classList.contains('active'));
        });
    }

    let overlay = document.getElementById('sidebarOverlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'sidebarOverlay';
        overlay.style.cssText = 'position:fixed;inset:0;z-index:1000;background:rgba(0,0,0,0.35);display:none;';
        document.body.appendChild(overlay);
        overlay.addEventListener('click', function() {
            sidebar.classList.remove('active');
            toggleOverlay(false);
        });
    }

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
}

function toggleOverlay(show) {
    const overlay = document.getElementById('sidebarOverlay');
    if (overlay) overlay.style.display = show ? 'block' : 'none';
}
