// Student List Page JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Wait for dataManager to be ready before loading data
    if (typeof dataManager !== 'undefined' && dataManager.initialized) {
        initializePage();
    } else {
        window.addEventListener('dataManagerReady', initializePage);
    }
});

// Initialize page after dataManager is ready
function initializePage() {
    loadStudentList();
    setupSearch();
}

// Load Student List
async function loadStudentList() {
    const container = document.getElementById('studentCards');
    const noStudentsMsg = document.getElementById('noStudentsMessage');
    const students = await dataManager.getStudents();

    if (students.length === 0) {
        container.style.display = 'none';
        noStudentsMsg.style.display = 'block';
        return;
    }

    container.style.display = 'grid';
    noStudentsMsg.style.display = 'none';

    const cards = [];
    for (const student of students) {
        const initial = student.name.charAt(0).toUpperCase();
        const stats = await dataManager.getStudentStats(student.id);

        cards.push(`
            <div class="student-select-card fade-in" onclick="selectStudent(${student.id})">
                <div class="student-card-avatar-large">${initial}</div>
                <h3>${student.name}</h3>
                <p>${stats.completed} of ${stats.total} tasks completed</p>
            </div>
        `);
    }
    container.innerHTML = cards.join('');
}

// Select Student and Navigate to Dashboard
function selectStudent(studentId) {
    // Store selected student ID in sessionStorage
    sessionStorage.setItem('currentStudentId', studentId);
    // Navigate to student dashboard
    window.location.href = '/pages/student-dashboard.html';
}

// Setup Search Functionality
function setupSearch() {
    const searchInput = document.getElementById('searchStudent');
    
    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase().trim();
        const cards = document.querySelectorAll('.student-select-card');

        cards.forEach(card => {
            const studentName = card.querySelector('h3').textContent.toLowerCase();
            if (studentName.includes(searchTerm)) {
                card.style.display = 'block';
                // Add animation
                card.style.animation = 'fadeIn 0.3s ease';
            } else {
                card.style.display = 'none';
            }
        });

        // Check if any cards are visible
        const visibleCards = Array.from(cards).filter(card => 
            card.style.display !== 'none'
        );

        const noStudentsMsg = document.getElementById('noStudentsMessage');
        const container = document.getElementById('studentCards');

        if (visibleCards.length === 0 && searchTerm !== '') {
            container.style.display = 'none';
            noStudentsMsg.style.display = 'block';
            noStudentsMsg.querySelector('h3').textContent = 'No Students Found';
            noStudentsMsg.querySelector('p').textContent = 'No students match your search.';
        } else {
            container.style.display = 'grid';
            noStudentsMsg.style.display = 'none';
        }
    });

    // Focus search on page load
    searchInput.focus();
}

