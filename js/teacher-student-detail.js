// Teacher Student Detail Page JavaScript

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
    initializeStudentDetail();
    setupMobileMenu();
}

// Initialize Student Detail Page
async function initializeStudentDetail() {
    // Get student ID from URL parameter or sessionStorage
    const urlParams = new URLSearchParams(window.location.search);
    const studentId = urlParams.get('studentId') || sessionStorage.getItem('viewStudentId');

    if (!studentId) {
        alert('No student selected!');
        window.location.href = '/pages/teacher-dashboard.html';
        return;
    }

    currentStudent = await dataManager.getStudentById(parseInt(studentId));

    if (!currentStudent) {
        alert('Student not found!');
        window.location.href = '/pages/teacher-dashboard.html';
        return;
    }

    // Store in sessionStorage for page refresh
    sessionStorage.setItem('viewStudentId', studentId);

    // Load all student data
    loadStudentProfile();
    loadStudentProfileInfo();
    await loadStudentStats();
    await loadStudentTasks();
    displayStudentNotes();
    
    // Setup form handlers
    document.getElementById('editStudentForm').addEventListener('submit', handleUpdateStudent);
    document.getElementById('addNoteForm').addEventListener('submit', handleAddNote);
    document.getElementById('editNoteForm').addEventListener('submit', handleEditNote);
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
    document.getElementById('profileDateOfBirth').textContent = formattedDOB;
    document.getElementById('profileGrade').textContent = currentStudent.grade || '-';
    document.getElementById('profileSection').textContent = currentStudent.section || '-';
    document.getElementById('profilePhone').textContent = currentStudent.phone || '-';
    document.getElementById('profileEmail').textContent = currentStudent.email || '-';
    document.getElementById('profileParentName').textContent = currentStudent.parentName || '-';
    document.getElementById('profileParentPhone').textContent = currentStudent.parentPhone || '-';
    document.getElementById('profileParentEmail').textContent = currentStudent.parentEmail || '-';
    document.getElementById('profileEnrollmentDate').textContent = formattedEnrollment;
    document.getElementById('profileMemberSince').textContent = memberSince;
}

// Show Edit Student Modal
function showEditStudentModal() {
    // Populate form with current student data
    document.getElementById('editStudentName').value = currentStudent.name || '';
    document.getElementById('editStudentId').value = currentStudent.studentId || '';
    document.getElementById('editDateOfBirth').value = currentStudent.dateOfBirth || '';
    document.getElementById('editGrade').value = currentStudent.grade || '';
    document.getElementById('editSection').value = currentStudent.section || '';
    document.getElementById('editStudentPhone').value = currentStudent.phone || '';
    document.getElementById('editStudentEmail').value = currentStudent.email || '';
    document.getElementById('editParentName').value = currentStudent.parentName || '';
    document.getElementById('editParentPhone').value = currentStudent.parentPhone || '';
    document.getElementById('editParentEmail').value = currentStudent.parentEmail || '';
    document.getElementById('editEnrollmentDate').value = currentStudent.enrollmentDate || '';
    
    // Show modal
    document.getElementById('editStudentModal').style.display = 'block';
}

// Close Edit Student Modal
function closeEditStudentModal() {
    document.getElementById('editStudentModal').style.display = 'none';
}

// Handle Update Student
async function handleUpdateStudent(e) {
    e.preventDefault();
    
    // Get updated data
    const updatedData = {
        name: document.getElementById('editStudentName').value.trim(),
        studentId: document.getElementById('editStudentId').value.trim(),
        dateOfBirth: document.getElementById('editDateOfBirth').value,
        grade: document.getElementById('editGrade').value,
        section: document.getElementById('editSection').value,
        phone: document.getElementById('editStudentPhone').value.trim(),
        email: document.getElementById('editStudentEmail').value.trim(),
        parentName: document.getElementById('editParentName').value.trim(),
        parentPhone: document.getElementById('editParentPhone').value.trim(),
        parentEmail: document.getElementById('editParentEmail').value.trim(),
        enrollmentDate: document.getElementById('editEnrollmentDate').value
    };
    
    // Validation (similar to add student)
    if (!updatedData.name) {
        alert('❌ Student name is required!');
        return;
    }
    
    // Phone validation
    const phoneRegex = /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/;
    if (updatedData.phone && !phoneRegex.test(updatedData.phone)) {
        alert('❌ Invalid student phone format!');
        return;
    }
    
    if (updatedData.parentPhone && !phoneRegex.test(updatedData.parentPhone)) {
        alert('❌ Invalid parent phone format!');
        return;
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (updatedData.email && !emailRegex.test(updatedData.email)) {
        alert('❌ Invalid student email format!');
        return;
    }
    
    if (updatedData.parentEmail && !emailRegex.test(updatedData.parentEmail)) {
        alert('❌ Invalid parent email format!');
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
        
        alert('✅ Student profile updated successfully!');
    } else {
        alert('❌ Failed to update student profile!');
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

    // Update task count badges
    document.getElementById('pendingCountBadge').textContent = 
        stats.pending + (stats.pending === 1 ? ' task' : ' tasks');
    document.getElementById('completedCountBadge').textContent = 
        stats.completed + (stats.completed === 1 ? ' task' : ' tasks');
    
    // Update daily tasks badge
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

// Switch Tabs for Teacher
function switchTabTeacher(tabName) {
    // Remove active class from all tabs
    document.querySelectorAll('.compact-tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content-teacher').forEach(content => content.classList.remove('active'));
    
    // Add active class to selected tab
    if (tabName === 'today') {
        document.getElementById('todayTabTeacher').classList.add('active');
        document.getElementById('todayTabContentTeacher').classList.add('active');
    } else if (tabName === 'allTasks') {
        document.getElementById('allTasksTabTeacher').classList.add('active');
        document.getElementById('allTasksTabContentTeacher').classList.add('active');
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
    document.getElementById('addNoteModal').style.display = 'block';
}

// Close Add Note Modal
function closeAddNoteModal() {
    document.getElementById('addNoteModal').style.display = 'none';
    document.getElementById('addNoteForm').reset();
}

// Handle Add Note
function handleAddNote(e) {
    e.preventDefault();
    
    const category = document.getElementById('noteCategory').value;
    const noteText = document.getElementById('noteText').value.trim();
    
    if (!category || !noteText) {
        alert('❌ Please fill in all required fields!');
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
        
        alert('✅ Note added successfully!');
    } else {
        alert('❌ Failed to add note!');
    }
}

// Open Edit Note Modal
function openEditNoteModal(noteId) {
    const note = currentStudent.notes.find(n => n.id === noteId);
    
    if (!note) {
        alert('❌ Note not found!');
        return;
    }
    
    // Populate form
    document.getElementById('editNoteId').value = note.id;
    document.getElementById('editNoteCategory').value = note.category;
    document.getElementById('editNoteText').value = note.note;
    
    // Show modal
    document.getElementById('editNoteModal').style.display = 'block';
}

// Close Edit Note Modal
function closeEditNoteModal() {
    document.getElementById('editNoteModal').style.display = 'none';
    document.getElementById('editNoteForm').reset();
}

// Handle Edit Note
function handleEditNote(e) {
    e.preventDefault();
    
    const noteId = parseInt(document.getElementById('editNoteId').value);
    const category = document.getElementById('editNoteCategory').value;
    const noteText = document.getElementById('editNoteText').value.trim();
    
    if (!category || !noteText) {
        alert('❌ Please fill in all required fields!');
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
        
        alert('✅ Note updated successfully!');
    } else {
        alert('❌ Failed to update note!');
    }
}

// Delete Note
function deleteNote(noteId) {
    if (!confirm('⚠️ Are you sure you want to delete this note? This action cannot be undone.')) {
        return;
    }
    
    const success = dataManager.deleteStudentNote(currentStudent.id, noteId);
    
    if (success) {
        // Refresh current student data
        currentStudent = dataManager.getStudentById(currentStudent.id);
        
        // Refresh notes display
        displayStudentNotes();
        
        alert('✅ Note deleted successfully!');
    } else {
        alert('❌ Failed to delete note!');
    }
}

// Helper function to escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

