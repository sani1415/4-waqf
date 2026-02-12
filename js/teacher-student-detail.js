// Teacher Student Detail Page JavaScript

function getLoadingSpinnerHtml() {
    const loadingText = typeof window.t === 'function' ? window.t('loading') : 'Loading...';
    return `<div class="loading-spinner"><i class="fas fa-circle-notch fa-spin"></i><span>${loadingText}</span></div>`;
}

function _t(key, params) {
    return typeof window.t === 'function' ? window.t(key, params) : key;
}

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
    if (typeof isTeacherLoggedIn === 'function' && !isTeacherLoggedIn()) {
        window.location.href = '/index.html';
        return;
    }
    initializeStudentDetail();
    setupMobileMenu();
}

// Initialize Student Detail Page
async function initializeStudentDetail() {
    // Get student ID from URL parameter or sessionStorage
    const urlParams = new URLSearchParams(window.location.search);
    const studentId = urlParams.get('studentId') || sessionStorage.getItem('viewStudentId');

    if (!studentId) {
        alert(_t('no_student_selected'));
        window.location.href = '/pages/teacher-dashboard.html';
        return;
    }

    currentStudent = await dataManager.getStudentById(studentId);

    if (!currentStudent) {
        alert(_t('student_not_found'));
        window.location.href = '/pages/teacher-dashboard.html';
        return;
    }

    // Show loading, hide main content
    const loader = document.getElementById('studentDetailLoader');
    const main = document.getElementById('studentDetailMain');
    if (loader) loader.style.display = 'flex';
    if (main) main.style.opacity = '0.5';

    // Store in sessionStorage for page refresh
    sessionStorage.setItem('viewStudentId', studentId);

    // Load all student data
    loadStudentProfile();
    loadStudentProfileInfo();
    await loadStudentStats();
    await loadStudentTasks();
    displayStudentNotes();
    
    // Setup form handlers
    const editForm = document.getElementById('editStudentForm');
    if (editForm) editForm.addEventListener('submit', handleUpdateStudent);
    const addNoteForm = document.getElementById('addNoteForm');
    if (addNoteForm) addNoteForm.addEventListener('submit', handleAddNote);
    const editNoteFormEl = document.getElementById('editNoteForm');
    if (editNoteFormEl) editNoteFormEl.addEventListener('submit', handleEditNote);
    
    // Initialize new tabbed interface
    await initializeTasksTab();
    await loadStudentExams();
    await loadMessagesTab();
    setupMessageFormTab();

    // Hide loading, show main content
    if (loader) loader.style.display = 'none';
    if (main) main.style.opacity = '1';
    console.log('✅ New tabbed interface initialized');
}

// Load Student Profile
function loadStudentProfile() {
    const initial = currentStudent.name.charAt(0).toUpperCase();
    
    document.getElementById('studentAvatar').textContent = initial;
    document.getElementById('studentName').textContent = currentStudent.name;
    document.getElementById('studentEmail').textContent = currentStudent.email || 'No email provided';
}

// Load Student Profile Info Section
function loadStudentProfileInfo() {
    // Format date of birth
    let formattedDOB = '-';
    if (currentStudent.dateOfBirth) {
        const dob = new Date(currentStudent.dateOfBirth);
        formattedDOB = dob.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    }
    
    // Format enrollment date
    let formattedEnrollment = '-';
    let memberSince = '-';
    if (currentStudent.enrollmentDate) {
        const enrollment = new Date(currentStudent.enrollmentDate);
        formattedEnrollment = enrollment.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        
        // Calculate member since
        const now = new Date();
        const diffTime = Math.abs(now - enrollment);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const diffMonths = Math.floor(diffDays / 30);
        const diffYears = Math.floor(diffMonths / 12);
        
        if (diffYears > 0) {
            memberSince = `${diffYears} year${diffYears > 1 ? 's' : ''}`;
        } else if (diffMonths > 0) {
            memberSince = `${diffMonths} month${diffMonths > 1 ? 's' : ''}`;
        } else {
            memberSince = `${diffDays} day${diffDays > 1 ? 's' : ''}`;
        }
    }
    
    // Populate profile info
    document.getElementById('profileStudentId').textContent = currentStudent.studentId || '-';
    const loginIdEl = document.getElementById('profileLoginId');
    if (loginIdEl) loginIdEl.textContent = currentStudent.studentId || '-';
    const pinSetAtEl = document.getElementById('profilePinSetAt');
    if (pinSetAtEl) {
        if (currentStudent.pinSetAt) {
            const d = new Date(currentStudent.pinSetAt);
            pinSetAtEl.textContent = d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        } else pinSetAtEl.textContent = '-';
    }
    const pinSetByEl = document.getElementById('profilePinSetBy');
    if (pinSetByEl) pinSetByEl.textContent = (currentStudent.pinSetBy === 'teacher' ? _t('teacher') : (currentStudent.pinSetBy === 'student' ? _t('student') : '-'));
    document.getElementById('profileDateOfBirth').textContent = formattedDOB;
    const yearNum = dataManager.getStudentYear(currentStudent.enrollmentDate);
    const yearKeys = ['', 'first_year', 'second_year', 'third_year', 'fourth_year', 'fifth_year', 'sixth_year', 'seventh_year', 'eighth_year', 'ninth_year', 'tenth_year'];
    const yearKey = yearKeys[yearNum] || ('year_' + yearNum);
    const profileYearEl = document.getElementById('profileYear');
    if (profileYearEl) profileYearEl.textContent = (yearKey && typeof _t === 'function' ? _t(yearKey) : null) || ('Year ' + yearNum);
    const profileAdmissionEl = document.getElementById('profileAdmissionDate');
    if (profileAdmissionEl) profileAdmissionEl.textContent = currentStudent.enrollmentDate ? new Date(currentStudent.enrollmentDate).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : '-';
    document.getElementById('profilePhone').textContent = currentStudent.phone || '-';
    document.getElementById('profileEmail').textContent = currentStudent.email || '-';
    document.getElementById('profileParentName').textContent = currentStudent.parentName || '-';
    document.getElementById('profileParentPhone').textContent = currentStudent.parentPhone || '-';
    document.getElementById('profileParentEmail').textContent = currentStudent.parentEmail || '-';
    const fwEl = document.getElementById('profileFatherWork'); if (fwEl) fwEl.textContent = currentStudent.fatherWork || '-';
    const distEl = document.getElementById('profileDistrict'); if (distEl) distEl.textContent = currentStudent.district || '-';
    const upaEl = document.getElementById('profileUpazila'); if (upaEl) upaEl.textContent = currentStudent.upazila || '-';
    const addrEl = document.getElementById('profileAddress'); if (addrEl) addrEl.textContent = currentStudent.address || '-';
    document.getElementById('profileEnrollmentDate').textContent = formattedEnrollment;
    document.getElementById('profileMemberSince').textContent = memberSince;
}

// Show Edit Student Modal
function showEditStudentModal() {
    // Populate form with current student data
    document.getElementById('editStudentName').value = currentStudent.name || '';
    document.getElementById('editStudentId').value = currentStudent.studentId || '';
    document.getElementById('editDateOfBirth').value = currentStudent.dateOfBirth || '';
    document.getElementById('editStudentPhone').value = currentStudent.phone || '';
    document.getElementById('editStudentEmail').value = currentStudent.email || '';
    document.getElementById('editParentName').value = currentStudent.parentName || '';
    document.getElementById('editParentPhone').value = currentStudent.parentPhone || '';
    document.getElementById('editParentEmail').value = currentStudent.parentEmail || '';
    const editFw = document.getElementById('editFatherWork'); if (editFw) editFw.value = currentStudent.fatherWork || '';
    const editDist = document.getElementById('editDistrict'); if (editDist) editDist.value = currentStudent.district || '';
    const editUpa = document.getElementById('editUpazila'); if (editUpa) editUpa.value = currentStudent.upazila || '';
    const editAddr = document.getElementById('editAddress'); if (editAddr) editAddr.value = currentStudent.address || '';
    document.getElementById('editEnrollmentDate').value = currentStudent.enrollmentDate || '';
    
    // Show modal (override checkbox-modal CSS)
    const el = document.getElementById('editStudentModal');
    if (el) {
        el.style.display = 'block';
        el.style.opacity = '1';
        el.style.pointerEvents = 'auto';
    }
}

// Close Edit Student Modal
function closeEditStudentModal() {
    const el = document.getElementById('editStudentModal');
    if (!el) return;
    el.style.display = 'none';
    el.style.opacity = '';
    el.style.pointerEvents = '';
}

// Show Reset PIN Modal
function showResetPinModal() {
    const el = document.getElementById('resetPinModal');
    if (!el) return;
    const form = document.getElementById('resetPinForm');
    if (form) form.reset();
    el.style.display = 'block';
    el.style.opacity = '1';
    el.style.pointerEvents = 'auto';
}

// Close Reset PIN Modal
function closeResetPinModal() {
    const el = document.getElementById('resetPinModal');
    if (!el) return;
    el.style.display = 'none';
    el.style.opacity = '';
    el.style.pointerEvents = '';
}

// Handle Reset PIN
async function handleResetPin(e) {
    e.preventDefault();
    const newPin = document.getElementById('resetPinNew').value.trim();
    const confirmPin = document.getElementById('resetPinConfirm').value.trim();
    if (newPin.length < 4 || newPin.length > 8) {
        alert('❌ ' + (_t('alert_pin_required') || 'Please enter a 4-6 digit PIN.'));
        return;
    }
    if (newPin !== confirmPin) {
        alert('❌ ' + (_t('alert_pin_mismatch') || 'PINs do not match.'));
        return;
    }
    const sid = currentStudent.id;
    if (!sid) {
        alert('❌ Student ID not found.');
        return;
    }
    try {
        await dataManager.updateStudentPin(sid, newPin, 'teacher');
        currentStudent = await dataManager.getStudentById(currentStudent.id);
        loadStudentProfileInfo();
        closeResetPinModal();
        alert('✅ ' + (_t('alert_pin_updated') || 'PIN updated successfully.'));
    } catch (err) {
        alert('❌ ' + (_t('login_error') || 'Failed to update PIN.'));
    }
}

// Handle Update Student
async function handleUpdateStudent(e) {
    e.preventDefault();
    
    // Get updated data (studentId is readonly - do not allow changing login format)
    const updatedData = {
        name: document.getElementById('editStudentName').value.trim(),
        studentId: currentStudent.studentId || document.getElementById('editStudentId').value.trim(),
        dateOfBirth: document.getElementById('editDateOfBirth').value,
        enrollmentDate: document.getElementById('editEnrollmentDate').value,
        phone: document.getElementById('editStudentPhone').value.trim(),
        email: document.getElementById('editStudentEmail').value.trim(),
        parentName: document.getElementById('editParentName').value.trim(),
        parentPhone: document.getElementById('editParentPhone').value.trim(),
        parentEmail: document.getElementById('editParentEmail').value.trim(),
        fatherWork: (document.getElementById('editFatherWork') && document.getElementById('editFatherWork').value) ? document.getElementById('editFatherWork').value.trim() : '',
        district: (document.getElementById('editDistrict') && document.getElementById('editDistrict').value) ? document.getElementById('editDistrict').value.trim() : '',
        upazila: (document.getElementById('editUpazila') && document.getElementById('editUpazila').value) ? document.getElementById('editUpazila').value.trim() : '',
        address: (document.getElementById('editAddress') && document.getElementById('editAddress').value) ? document.getElementById('editAddress').value.trim() : ''
    };
    
    // Validation (similar to add student)
    if (!updatedData.name) {
        alert('❌ ' + _t('alert_student_name_required'));
        return;
    }
    if (!updatedData.enrollmentDate) {
        alert('❌ ' + _t('alert_enrollment_date_required'));
        return;
    }
    
    // Phone validation
    const phoneRegex = /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/;
    if (updatedData.phone && !phoneRegex.test(updatedData.phone)) {
        alert('❌ ' + _t('alert_invalid_student_phone'));
        return;
    }
    
    if (updatedData.parentPhone && !phoneRegex.test(updatedData.parentPhone)) {
        alert('❌ ' + _t('alert_invalid_parent_phone'));
        return;
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (updatedData.email && !emailRegex.test(updatedData.email)) {
        alert('❌ ' + _t('alert_invalid_student_email'));
        return;
    }
    
    if (updatedData.parentEmail && !emailRegex.test(updatedData.parentEmail)) {
        alert('❌ ' + _t('alert_invalid_parent_email'));
        return;
    }
    
    // Update student profile
    const updated = await dataManager.updateStudentProfile(currentStudent.id, updatedData);
    
    if (updated) {
        currentStudent = updated;
        
        // Refresh displays
        loadStudentProfile();
        loadStudentProfileInfo();
        
        // Close modal
        closeEditStudentModal();
        
        alert('✅ ' + _t('alert_profile_updated'));
    } else {
        alert('❌ ' + _t('alert_profile_update_failed'));
    }
}

// Load Student Stats
async function loadStudentStats() {
    const stats = await dataManager.getStudentStats(currentStudent.id);

    // Update COMPACT daily progress
    const dailyTotal = stats.dailyTotal || 0;
    const dailyCompleted = stats.dailyCompletedToday || 0;
    const dailyPercentage = dailyTotal > 0 ? Math.round((dailyCompleted / dailyTotal) * 100) : 0;
    
    document.getElementById('dailyPercentageCompact').textContent = dailyPercentage + '%';
    document.getElementById('dailyCompletedCompact').textContent = dailyCompleted;
    document.getElementById('dailyTotalCompact').textContent = dailyTotal;
    
    const dailyBar = document.getElementById('dailyProgressCompact');
    if (dailyBar) {
        setTimeout(() => {
            dailyBar.style.width = dailyPercentage + '%';
        }, 100);
    }

    // Update COMPACT one-time progress
    document.getElementById('onetimePercentageCompact').textContent = stats.percentage + '%';
    document.getElementById('onetimeCompletedCompact').textContent = stats.completed;
    document.getElementById('onetimeTotalCompact').textContent = stats.total;
    
    const onetimeBar = document.getElementById('onetimeProgressCompact');
    if (onetimeBar) {
        setTimeout(() => {
            onetimeBar.style.width = stats.percentage + '%';
        }, 100);
    }

    // Update task count badges (if they exist - old structure)
    const pendingBadge = document.getElementById('pendingCountBadge');
    if (pendingBadge) {
        pendingBadge.textContent = stats.pending + (stats.pending === 1 ? ' task' : ' tasks');
    }
    const completedBadge = document.getElementById('completedCountBadge');
    if (completedBadge) {
        completedBadge.textContent = stats.completed + (stats.completed === 1 ? ' task' : ' tasks');
    }
    
    // Update daily tasks badge (if exists - old structure)
    const dailyBadge = document.getElementById('dailyTasksCountBadge');
    if (dailyBadge) {
        dailyBadge.textContent = dailyTotal + (dailyTotal === 1 ? ' task' : ' tasks');
    }

    // Update quiz stats
    const quizStats = await dataManager.getStudentQuizStats(currentStudent.id);
    const quizPercentage = quizStats.averagePercentage ? parseFloat(quizStats.averagePercentage) : 0;
    
    document.getElementById('quizPercentageCompact').textContent = Math.round(quizPercentage) + '%';
    document.getElementById('quizPassedCompact').textContent = quizStats.passedCount;
    document.getElementById('quizTotalCompact').textContent = quizStats.totalQuizzes;
    
    const quizBar = document.getElementById('quizProgressCompact');
    if (quizBar) {
        setTimeout(() => {
            quizBar.style.width = quizPercentage + '%';
        }, 100);
    }
}

// Load Student Tasks
async function loadStudentTasks() {
    // Load daily tasks
    const dailyTasks = await dataManager.getDailyTasksForStudent(currentStudent.id);
    await loadDailyTaskSection('dailyTasksList', dailyTasks);
    
    // Load regular one-time tasks
    const tasks = await dataManager.getRegularTasksForStudent(currentStudent.id);
    
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
    
    // Skip if container doesn't exist (new tabbed layout)
    if (!container) return;

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
                        <i class="fas fa-${task.type === 'one-time' ? 'tasks' : 'calendar-day'}"></i>
                        ${task.type === 'one-time' ? 'One-time Task' : 'Daily Routine'}
                    </span>
                    
                    ${task.deadline ? `
                        <span class="deadline-badge ${deadlineClass}">
                            <i class="fas fa-calendar"></i>
                            Due: ${deadlineDate}
                            ${daysLeft !== null && !isTaskCompleted ? ` (${getDaysLeftText(daysLeft)})` : ''}
                        </span>
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

// Load Daily Task Section
function loadDailyTaskSection(containerId, tasks) {
    const container = document.getElementById(containerId);
    
    // Skip if container doesn't exist (new tabbed layout)
    if (!container) return;

    if (tasks.length === 0) {
        container.innerHTML = '<div class="empty-state-detailed"><i class="fas fa-calendar-check"></i><h3>No daily tasks assigned</h3><p>This student has no daily routine tasks yet.</p></div>';
        return;
    }

    container.innerHTML = tasks.map(task => {
        const isCompletedToday = dataManager.isDailyTaskCompletedToday(task.id, currentStudent.id);
        const streak = dataManager.getDailyTaskStreak(task.id, currentStudent.id);

        return `
            <div class="task-detail-card ${isCompletedToday ? 'completed' : ''} fade-in daily-task-card">
                <div class="task-detail-header">
                    <div class="task-detail-title">
                        <h3>
                            ${task.title}
                            ${streak > 0 ? `<span class="streak-badge-teacher">🔥 ${streak} day${streak > 1 ? 's' : ''}</span>` : ''}
                        </h3>
                        ${task.description ? `<div class="task-detail-description">${task.description}</div>` : ''}
                    </div>
                    <span class="task-status-badge ${isCompletedToday ? 'completed' : 'pending'}">
                        <i class="fas fa-${isCompletedToday ? 'check-circle' : 'clock'}"></i>
                        ${isCompletedToday ? 'Completed Today' : 'Pending Today'}
                    </span>
                </div>
                
                <div class="task-detail-meta">
                    <span class="task-type-badge daily">
                        <i class="fas fa-calendar-day"></i>
                        Daily Routine
                    </span>
                    <div class="meta-item">
                        <i class="fas fa-sync-alt"></i>
                        <span>Repeats every day</span>
                    </div>
                    ${isCompletedToday ? `
                        <div class="meta-item" style="color: var(--success-soft);">
                            <i class="fas fa-check-double"></i>
                            <span>Completed today</span>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
}

// Switch Tabs for Teacher (legacy function - kept for compatibility)
function switchTabTeacher(tabName) {
    // Remove active class from all tabs
    document.querySelectorAll('.compact-tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content-teacher').forEach(content => content.classList.remove('active'));
    
    // Add active class to selected tab (with null checks)
    if (tabName === 'today') {
        const todayTab = document.getElementById('todayTabTeacher');
        const todayContent = document.getElementById('todayTabContentTeacher');
        if (todayTab) todayTab.classList.add('active');
        if (todayContent) todayContent.classList.add('active');
    } else if (tabName === 'allTasks') {
        const allTasksTab = document.getElementById('allTasksTabTeacher');
        const allTasksContent = document.getElementById('allTasksTabContentTeacher');
        if (allTasksTab) allTasksTab.classList.add('active');
        if (allTasksContent) allTasksContent.classList.add('active');
    }
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
    window.location.href = '/pages/teacher-dashboard.html#students';
}

// Assign New Task
function assignNewTask() {
    try {
        if (typeof sessionStorage !== 'undefined' && currentStudent) {
            sessionStorage.setItem('assignTaskStudentId', String(currentStudent.id));
        }
    } catch (e) {
        // ignore
    }
    window.location.href = `/pages/teacher-dashboard.html?studentId=${currentStudent.id}#create-task`;
}

// Setup Mobile Menu
function setupMobileMenu() {
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    
    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', function() {
            sidebar.classList.toggle('active');
            toggleOverlay(sidebar.classList.contains('active'));
        });
    }

    // Bottom nav Menu button - opens sidebar
    const bottomNavMenu = document.getElementById('bottomNavMenu');
    if (bottomNavMenu && sidebar) {
        bottomNavMenu.addEventListener('click', function(e) {
            e.preventDefault();
            sidebar.classList.add('active');
            toggleOverlay(true);
        });
    }

    // Click outside to close on mobile
    document.addEventListener('click', function(e) {
        if (window.innerWidth <= 1024 && sidebar && sidebar.classList.contains('active')) {
            const clickedInsideSidebar = sidebar.contains(e.target);
            const clickedMenuToggle = menuToggle && menuToggle.contains(e.target);
            const clickedBottomNav = document.getElementById('bottomNav') && document.getElementById('bottomNav').contains(e.target);
            if (!clickedInsideSidebar && !clickedMenuToggle && !clickedBottomNav) {
                sidebar.classList.remove('active');
                toggleOverlay(false);
            }
        }
    });
}

function toggleOverlay(show) {
    let overlay = document.getElementById('sidebarOverlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'sidebarOverlay';
        overlay.style.cssText = 'position:fixed;inset:0;z-index:1000;background:rgba(0,0,0,0.35);display:none;';
        document.body.appendChild(overlay);
        overlay.addEventListener('click', function() {
            const sidebar = document.getElementById('sidebar');
            if (sidebar) sidebar.classList.remove('active');
            toggleOverlay(false);
        });
    }
    overlay.style.display = show ? 'block' : 'none';
}

/* ===================================
   TEACHER NOTES FUNCTIONS
   =================================== */

// Display Student Notes
function displayStudentNotes() {
    const container = document.getElementById('notesList');
    
    if (!currentStudent.notes || currentStudent.notes.length === 0) {
        container.innerHTML = `
            <div class="no-notes-message">
                <i class="fas fa-clipboard"></i>
                <p>No notes yet. Click "Add Note" to create your first note about this student.</p>
            </div>
        `;
        return;
    }
    
    // Sort notes by date (newest first)
    const sortedNotes = [...currentStudent.notes].sort((a, b) => {
        return new Date(b.date) - new Date(a.date);
    });
    
    container.innerHTML = sortedNotes.map(note => {
        const noteDate = new Date(note.date);
        const formattedDate = noteDate.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        // Format category for CSS class
        const categoryClass = note.category.replace(/\s+/g, '');
        
        // Edited indicator
        const editedText = note.edited ? 
            `<div class="note-edited">
                <i class="fas fa-edit"></i> Edited ${new Date(note.editedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </div>` : '';
        
        return `
            <div class="note-card">
                <div class="note-card-header">
                    <div class="note-meta">
                        <span class="note-category ${categoryClass}">${note.category}</span>
                        <div class="note-date">
                            <i class="fas fa-clock"></i>
                            ${formattedDate}
                        </div>
                    </div>
                    <div class="note-actions">
                        <button class="note-btn edit-btn" onclick="openEditNoteModal(${note.id})" title="Edit Note">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="note-btn delete-btn" onclick="deleteNote(${note.id})" title="Delete Note">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="note-content">${escapeHtml(note.note)}</div>
                ${editedText}
            </div>
        `;
    }).join('');
}

// Show Add Note Modal
function showAddNoteModal() {
    const el = document.getElementById('addNoteModal');
    if (!el) return;
    el.style.display = 'block';
    el.style.opacity = '1';
    el.style.pointerEvents = 'auto';
}

// Close Add Note Modal
function closeAddNoteModal() {
    const el = document.getElementById('addNoteModal');
    if (!el) return;
    el.style.display = 'none';
    el.style.opacity = '';
    el.style.pointerEvents = '';
    const form = document.getElementById('addNoteForm');
    if (form) form.reset();
}

// Handle Add Note
function handleAddNote(e) {
    e.preventDefault();
    
    const category = document.getElementById('noteCategory').value;
    const noteText = document.getElementById('noteText').value.trim();
    
    if (!category || !noteText) {
        alert('❌ ' + _t('alert_fill_required_fields'));
        return;
    }
    
    const newNote = dataManager.addStudentNote(currentStudent.id, {
        category: category,
        note: noteText
    });
    
    if (newNote) {
        // Refresh current student data
        currentStudent = dataManager.getStudentById(currentStudent.id);
        
        // Refresh notes display
        displayStudentNotes();
        
        // Close modal and reset form
        closeAddNoteModal();
        
        alert('✅ ' + _t('alert_note_added'));
    } else {
        alert('❌ ' + _t('alert_note_add_failed'));
    }
}

// Open Edit Note Modal
function openEditNoteModal(noteId) {
    const note = currentStudent.notes.find(n => String(n.id) === String(noteId));
    
    if (!note) {
        alert('❌ ' + _t('alert_note_not_found'));
        return;
    }
    
    // Populate form
    document.getElementById('editNoteId').value = note.id;
    document.getElementById('editNoteCategory').value = note.category;
    document.getElementById('editNoteText').value = note.note;
    
    // Show modal (override checkbox-modal CSS)
    const el = document.getElementById('editNoteModal');
    if (el) {
        el.style.display = 'block';
        el.style.opacity = '1';
        el.style.pointerEvents = 'auto';
    }
}

// Close Edit Note Modal
function closeEditNoteModal() {
    const el = document.getElementById('editNoteModal');
    if (!el) return;
    el.style.display = 'none';
    el.style.opacity = '';
    el.style.pointerEvents = '';
    const form = document.getElementById('editNoteForm');
    if (form) form.reset();
}

// Handle Edit Note
function handleEditNote(e) {
    e.preventDefault();
    
    const noteId = document.getElementById('editNoteId').value;
    const category = document.getElementById('editNoteCategory').value;
    const noteText = document.getElementById('editNoteText').value.trim();
    
    if (!category || !noteText) {
        alert('❌ ' + _t('alert_fill_required_fields'));
        return;
    }
    
    const updated = dataManager.updateStudentNote(currentStudent.id, noteId, {
        category: category,
        note: noteText
    });
    
    if (updated) {
        // Refresh current student data
        currentStudent = dataManager.getStudentById(currentStudent.id);
        
        // Refresh notes display
        displayStudentNotes();
        
        // Close modal
        closeEditNoteModal();
        
        alert('✅ ' + _t('alert_note_updated'));
    } else {
        alert('❌ ' + _t('alert_note_update_failed'));
    }
}

// Delete Note
function deleteNote(noteId) {
    if (!confirm('⚠️ ' + _t('confirm_delete_note'))) {
        return;
    }
    
    const success = dataManager.deleteStudentNote(currentStudent.id, noteId);
    
    if (success) {
        // Refresh current student data
        currentStudent = dataManager.getStudentById(currentStudent.id);
        
        // Refresh notes display
        displayStudentNotes();
        
        alert('✅ ' + _t('alert_note_deleted'));
    } else {
        alert('❌ ' + _t('alert_note_delete_failed'));
    }
}

// Helper function to escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}


// ===================================
// NEW TABBED INTERFACE FUNCTIONS
// ===================================

// Initialize date display and populate calendar
async function initializeTasksTab() {
    console.log('📋 Initializing Tasks Tab...');
    updateCurrentDateDisplay();
    populateDatePicker();
    await populateDailyTasksGrid();
    await populateOnetimeTasksGrid();
}

// Store the currently selected date for the tasks tab
let selectedTasksDate = new Date();

// Update current date display
function updateCurrentDateDisplay() {
    const dateStr = selectedTasksDate.toLocaleDateString('en-US', { 
        weekday: 'short', 
        day: 'numeric', 
        month: 'short', 
        year: 'numeric' 
    });
    const elem = document.getElementById('currentDateDisplay');
    if (elem) {
        const today = new Date();
        const isToday = selectedTasksDate.toDateString() === today.toDateString();
        elem.textContent = dateStr + (isToday ? ' (Today)' : '');
    }
}

// Handle date selection from the date picker
function selectDateFromPicker(dateValue) {
    selectedTasksDate = new Date(dateValue + 'T00:00:00');
    updateCurrentDateDisplay();
    // Refresh the grids with the new date
    populateDailyTasksGrid();
    populateOnetimeTasksGrid();
    console.log('📅 Date changed to:', dateValue);
}

// Populate Date Picker Calendar
function populateDatePicker() {
    console.log('📅 Populating date picker...');
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
    
    const monthElem = document.getElementById('datePickerMonth');
    if (monthElem) {
        monthElem.textContent = monthNames[month] + ' ' + year;
    }
    
    const gridElem = document.getElementById('datePickerGrid');
    if (!gridElem) {
        console.log('⚠️ datePickerGrid element not found');
        return;
    }
    console.log('📅 Found datePickerGrid, populating...');
    
    // Day headers
    const dayHeaders = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    let html = '';
    dayHeaders.forEach(day => {
        html += '<span class="day-head">' + day + '</span>';
    });
    
    // Get first day of month and days in month
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();
    
    // Previous month days
    for (let i = firstDay - 1; i >= 0; i--) {
        html += '<span class="day other">' + (prevMonthDays - i) + '</span>';
    }
    
    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
        const isToday = (d === today.getDate());
        const className = 'day' + (isToday ? ' today' : '');
        const dateValue = year + '-' + String(month + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
        html += '<label for="date-picker-open" class="' + className + '" data-date="' + dateValue + '" onclick="selectDateFromPicker(\'' + dateValue + '\')">' + d + '</label>';
    }
    
    // Next month days
    const totalCells = firstDay + daysInMonth;
    const remainingCells = 7 - (totalCells % 7);
    if (remainingCells < 7) {
        for (let d = 1; d <= remainingCells; d++) {
            html += '<span class="day other">' + d + '</span>';
        }
    }
    
    gridElem.innerHTML = html;
}

// Populate Daily Tasks Grid (7-day view)
async function populateDailyTasksGrid() {
    const tbody = document.getElementById('dailyTasksGridBody');
    if (!tbody) {
        console.log('⚠️ dailyTasksGridBody not found');
        return;
    }
    
    // Get daily tasks for current student
    const dailyTasks = await dataManager.getDailyTasksForStudent(currentStudent.id);
    console.log('📋 Daily tasks loaded:', dailyTasks.length);
    
    if (!dailyTasks || dailyTasks.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: var(--text-secondary); padding: 2rem;">No daily tasks assigned yet.</td></tr>';
        return;
    }
    
    // Get 7 days ending on the selected date (oldest to newest, left to right)
    const days = [];
    const endDate = new Date(selectedTasksDate);
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
        const date = new Date(endDate);
        date.setDate(endDate.getDate() - i);
        days.push(date);
    }
    
    // Build and update header row
    const thead = document.querySelector('#dailyTasksGrid thead tr');
    if (thead) {
        // Keep only the first th (task-col), remove others
        const existingThs = thead.querySelectorAll('th:not(.task-col)');
        existingThs.forEach(th => th.remove());
        
        // Add new date columns
        days.forEach(date => {
            const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
            const dayNum = date.getDate();
            const isToday = date.toDateString() === today.toDateString();
            const th = document.createElement('th');
            th.className = isToday ? 'day-today' : '';
            th.textContent = dayName + ' ' + dayNum;
            thead.appendChild(th);
        });
    }
    
    // Build rows
    let html = '';
    const studentIdStr = currentStudent.id.toString();
    
    dailyTasks.forEach(task => {
        html += '<tr><td class="task-col">' + task.title + '</td>';
        
        // Get completion dates for this student
        const completions = task.dailyCompletions && task.dailyCompletions[studentIdStr] 
            ? task.dailyCompletions[studentIdStr] 
            : [];
        
        days.forEach(date => {
            const dateStr = date.toISOString().split('T')[0];
            const isDone = completions.includes(dateStr);
            const isToday = date.toDateString() === today.toDateString();
            const cellClass = isDone ? 'cell-done' : 'cell-miss';
            const dayClass = isToday ? ' day-today' : '';
            html += '<td class="' + cellClass + dayClass + '">' + (isDone ? '✓' : '—') + '</td>';
        });
        html += '</tr>';
    });
    
    tbody.innerHTML = html;
}

// Populate One-Time Tasks Grid
async function populateOnetimeTasksGrid() {
    const tbody = document.getElementById('onetimeTasksGridBody');
    if (!tbody) {
        console.log('⚠️ onetimeTasksGridBody not found');
        return;
    }
    
    // Get one-time tasks for current student
    const oneTimeTasks = await dataManager.getRegularTasksForStudent(currentStudent.id);
    console.log('📋 One-time tasks loaded:', oneTimeTasks.length);
    
    if (!oneTimeTasks || oneTimeTasks.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-secondary); padding: 2rem;">No one-time tasks assigned yet.</td></tr>';
        return;
    }
    
    let html = '';
    oneTimeTasks.forEach(task => {
        const assignedDate = task.createdAt ? new Date(task.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '-';
        const dueDate = task.deadline ? new Date(task.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '-';
        
        // Check if this student completed the task
        const isCompleted = task.completedBy && task.completedBy.includes(currentStudent.id);
        const statusColor = isCompleted ? 'var(--success-soft)' : 'var(--text-light)';
        const statusText = isCompleted ? 'Completed' : 'Pending';
        
        // Get completion date if available
        let completedText = '—';
        if (isCompleted && task.completionDates && task.completionDates[currentStudent.id]) {
            completedText = '✓ ' + new Date(task.completionDates[currentStudent.id]).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        } else if (isCompleted) {
            completedText = '✓';
        }
        
        const cellClass = isCompleted ? 'cell-done' : 'cell-miss';
        
        html += '<tr>';
        html += '<td class="task-col">' + task.title + '</td>';
        html += '<td>' + assignedDate + '</td>';
        html += '<td>' + dueDate + '</td>';
        html += '<td><span style="color: ' + statusColor + ';">' + statusText + '</span></td>';
        html += '<td class="' + cellClass + '">' + completedText + '</td>';
        html += '</tr>';
    });
    
    tbody.innerHTML = html;
}

// Load exams for this student
async function loadStudentExams() {
    const container = document.getElementById('examResultsList');
    if (!container) {
        console.log('⚠️ examResultsList not found');
        return;
    }
    
    // Get quiz results for this student
    const quizResults = await dataManager.getResultsForStudent(currentStudent.id);
    console.log('📋 Quiz results loaded:', quizResults ? quizResults.length : 0);
    
    if (!quizResults || quizResults.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 2rem;">No exam attempts yet.</p>';
        return;
    }
    
    let html = '';
    for (let index = 0; index < quizResults.length; index++) {
        const result = quizResults[index];
        // Get the quiz details
        const quiz = await dataManager.getQuizById(result.quizId) || {};
        const passed = result.passed;
        const score = result.percentage || 0;
        const totalQuestions = quiz.questions ? quiz.questions.length : 0;
        const attemptDate = result.submittedAt ? new Date(result.submittedAt).toLocaleDateString('en-US', { 
            day: 'numeric', 
            month: 'short', 
            year: 'numeric' 
        }) : '-';
        const duration = quiz.duration || 0;
        
        const scoreClass = passed ? 'passed' : 'failed';
        const badgeClass = passed ? 'badge passed' : 'badge failed';
        const badgeText = passed ? 'Passed' : 'Failed';
        
        html += '<div class="exam-result-card">';
        html += '<div>';
        html += '<label for="exam-modal-' + index + '" class="exam-name">' + (quiz.title || 'Unnamed Quiz') + '</label>';
        html += '<div class="exam-meta">Attempted ' + attemptDate + ' • ' + totalQuestions + ' questions • ' + duration + ' minutes</div>';
        html += '</div>';
        html += '<div style="display: flex; align-items: center; gap: 0.5rem;">';
        html += '<span class="score ' + scoreClass + '">' + Math.round(score) + '%</span>';
        html += '<span class="' + badgeClass + '">' + badgeText + '</span>';
        html += '</div>';
        html += '</div>';
        
        // Add modal for this exam
        html += createExamDetailModal(result, quiz, index);
    }
    
    container.innerHTML = html;
}

// Create exam detail modal HTML
function createExamDetailModal(result, quiz, index) {
    const score = result.percentage || 0;
    const passed = result.passed;
    const attemptDate = result.submittedAt ? new Date(result.submittedAt).toLocaleDateString('en-US', { 
        day: 'numeric', 
        month: 'short', 
        year: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
    }) : '-';
    const questions = quiz.questions || [];
    const answers = Array.isArray(result.answers) ? result.answers : [];
    
    let html = '<input type="checkbox" id="exam-modal-' + index + '" class="modal-toggle">';
    html += '<label for="exam-modal-' + index + '" class="modal-backdrop"></label>';
    html += '<div class="modal" style="max-width: 680px;">';
    html += '<div class="modal-header">';
    html += '<h3><i class="fas fa-file-alt"></i> ' + (quiz.title || 'Quiz') + ' — Exam Details</h3>';
    html += '<label for="exam-modal-' + index + '" class="modal-close">Close</label>';
    html += '</div>';
    html += '<div class="modal-body">';
    
    // Summary
    html += '<div class="exam-detail-section">';
    html += '<h4>Summary</h4>';
    html += '<div class="row"><span class="l">Student</span><span>' + currentStudent.name + '</span></div>';
    const correctCount = answers.filter(a => a && a.isCorrect).length;
    html += '<div class="row"><span class="l">Score</span><span style="color: ' + (passed ? 'var(--success-soft)' : '#c53030') + '; font-weight: 600;">' + Math.round(score) + '% (' + correctCount + '/' + questions.length + ' correct)</span></div>';
    html += '<div class="row"><span class="l">Attempted</span><span>' + attemptDate + '</span></div>';
    html += '</div>';
    
    // Questions
    if (questions.length > 0 && answers.length > 0) {
        html += '<div class="exam-detail-section">';
        html += '<h4>Questions & Answers</h4>';
        
        questions.slice(0, 5).forEach((q, qIdx) => {
            const answerObj = answers[qIdx] || {};
            const userAnswer = answerObj.studentAnswer || '';
            const correctAnswer = answerObj.correctAnswer || q.correctAnswer || '';
            const isCorrect = answerObj.isCorrect;
            const qClass = isCorrect ? 'correct' : 'incorrect';
            const answerClass = isCorrect ? 'correct' : 'incorrect';
            
            html += '<div class="exam-question ' + qClass + '">';
            html += '<div class="q-text">' + (qIdx + 1) + '. ' + q.question + '</div>';
            html += '<div class="q-answer ' + answerClass + '"><strong>Student answer:</strong> ' + (userAnswer || '(No answer)') + ' ' + (isCorrect ? '✓ Correct' : '✗ Incorrect' + (correctAnswer ? ' (Correct: ' + correctAnswer + ')' : '')) + '</div>';
            html += '</div>';
        });
        
        if (questions.length > 5) {
            html += '<p style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 0.5rem;">+ ' + (questions.length - 5) + ' more questions</p>';
        }
        html += '</div>';
    }
    
    html += '</div></div>';
    return html;
}

// Create Exam for Student
function createExamForStudent() {
    // Store student ID for exam creation
    sessionStorage.setItem('createExamForStudent', currentStudent.id);
    // Redirect to exams page
    window.location.href = '/pages/teacher-exams.html';
}

// Load Messages Tab (Messages with this student)
async function loadMessagesTab() {
    const messagesArea = document.getElementById('messagesArea');
    if (!messagesArea) return;
    
    const messages = await dataManager.getMessagesForStudent(currentStudent.id);
    
    if (!messages || messages.length === 0) {
        const noMsg = (typeof window.t === 'function') ? window.t('no_messages_yet') : 'No messages yet. Start the conversation!';
        const hint = (typeof window.t === 'function') ? window.t('messages_appear_here') : 'Messages with this student will appear here. Use the input below to send a message.';
        messagesArea.innerHTML = '<p style="color: var(--text-light); margin-bottom: 0.5rem;">' + noMsg + '</p><p style="font-size: 0.85rem;">' + hint + '</p>';
        return;
    }
    
    let lastDate = '';
    let messagesHTML = '';
    messages.forEach(function(msg) {
        const messageDate = new Date(msg.timestamp).toLocaleDateString();
        if (messageDate !== lastDate) {
            const sep = (messageDate === new Date().toLocaleDateString()) ? ((typeof window.t === 'function') ? window.t('today') : 'Today') : (messageDate === new Date(Date.now() - 86400000).toLocaleDateString() ? ((typeof window.t === 'function') ? window.t('yesterday') : 'Yesterday') : new Date(msg.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }));
            messagesHTML += '<div class="date-separator" style="font-size: 0.75rem; color: var(--text-secondary); margin: 0.5rem 0;">' + sep + '</div>';
            lastDate = messageDate;
        }
        const isSent = msg.sender === 'teacher';
        const msgClass = isSent ? 'message-sent' : 'message-received';
        const time = new Date(msg.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
        const escaped = String(msg.message || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        messagesHTML += '<div class="message-bubble ' + msgClass + '" style="max-width: 80%; ' + (isSent ? 'margin-left: auto; background: var(--primary-soft); color: white;' : 'margin-right: auto; background: var(--bg-primary);') + ' padding: 0.5rem 0.75rem; border-radius: 12px; margin-bottom: 0.25rem;"><div class="message-text">' + escaped + '</div><div class="message-time" style="font-size: 0.7rem; opacity: 0.9;">' + time + '</div></div>';
    });
    messagesArea.innerHTML = messagesHTML;
    messagesArea.scrollTop = messagesArea.scrollHeight;
}

// Setup Message Form (Send button) in Messages tab
function setupMessageFormTab() {
    const input = document.getElementById('messageInput');
    const btn = document.getElementById('messageSendBtn');
    if (!input || !btn) return;
    
    function sendMsg() {
        const text = input.value.trim();
        if (!text) return;
        dataManager.sendMessage(currentStudent.id, text, 'teacher').then(function() {
            input.value = '';
            loadMessagesTab();
        });
    }
    btn.addEventListener('click', sendMsg);
    input.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') { e.preventDefault(); sendMsg(); }
    });
}

// Note: Tab initialization is now integrated directly in initializeStudentDetail()
