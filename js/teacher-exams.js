// Teacher Quizzes Management

let questionCounter = 0;

// Initialize on page load
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
    loadQuizStudentCheckboxes();
    loadAllQuizzes();
    loadQuizResultsSelector();
    updatePendingCount();
    setupMobileMenu();

    // Add first question by default
    addQuestion();

    // Setup form submission
    document.getElementById('createQuizForm').addEventListener('submit', handleCreateQuiz);
}

// Setup mobile sidebar menu and overlay
function setupMobileMenu() {
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    if (!menuToggle || !sidebar) return;

    menuToggle.addEventListener('click', function() {
        sidebar.classList.toggle('active');
        toggleOverlay(sidebar.classList.contains('active'));
    });

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
            const clickedInsideSidebar = sidebar.contains(e.target) || menuToggle.contains(e.target);
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

/* ===================================
   TAB SWITCHING
   =================================== */

function switchQuizTab(tabName, clickedElement) {
    // Update tab buttons
    document.querySelectorAll('.quiz-tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    // Use the passed element or find by tabName
    if (clickedElement) {
        clickedElement.classList.add('active');
    } else {
        const tabBtn = document.querySelector(`.quiz-tab-btn[onclick*="${tabName}"]`);
        if (tabBtn) tabBtn.classList.add('active');
    }
    
    // Hide all tab contents
    document.querySelectorAll('.quiz-tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // Show selected tab
    if (tabName === 'create') {
        document.getElementById('createQuizTab').classList.add('active');
    } else if (tabName === 'view') {
        document.getElementById('viewQuizzesTab').classList.add('active');
        loadAllQuizzes();
    } else if (tabName === 'results') {
        document.getElementById('resultsTab').classList.add('active');
        loadQuizResultsSelector();
    } else if (tabName === 'pending') {
        document.getElementById('pendingTab').classList.add('active');
        loadPendingReviews();
    }
}

/* ===================================
   CREATE QUIZ FUNCTIONS
   =================================== */

// Load student checkboxes
async function loadQuizStudentCheckboxes() {
    const students = await dataManager.getStudents();
    const container = document.getElementById('quizStudentCheckboxes');
    
    container.innerHTML = students.map(student => `
        <label class="checkbox-item">
            <input type="checkbox" name="quizAssignedStudents" value="${student.id}">
            <span>${student.name}</span>
        </label>
    `).join('');
}

// Handle assign to all checkbox
function handleAssignQuizToAllChange() {
    const assignToAll = document.getElementById('assignQuizToAll');
    const checkboxes = document.querySelectorAll('input[name="quizAssignedStudents"]');
    
    checkboxes.forEach(cb => {
        cb.checked = assignToAll.checked;
        cb.disabled = assignToAll.checked;
    });
}

// Add new question
function addQuestion() {
    questionCounter++;
    const questionId = `question-${questionCounter}`;
    
    const questionHTML = `
        <div class="question-card" id="${questionId}" data-type="mcq">
            <div class="question-header">
                <span class="question-number">Question ${questionCounter}</span>
                <button type="button" class="btn-remove-question" onclick="removeQuestion('${questionId}')">
                    <i class="fas fa-trash"></i> Remove
                </button>
            </div>
            
            <div class="question-input-group">
                <label>Question Type <span class="required">*</span></label>
                <select class="question-type-select" onchange="handleQuestionTypeChange('${questionId}', this.value)" required>
                    <option value="mcq">Multiple Choice</option>
                    <option value="true_false">True / False</option>
                    <option value="fill_blank">Fill in the Blank</option>
                    <option value="short_answer">Short Answer</option>
                    <option value="essay">Essay</option>
                    <option value="file_upload">File Upload</option>
                </select>
            </div>
            
            <div class="question-input-group">
                <label>Question Text <span class="required">*</span></label>
                <textarea class="question-text" rows="3" required placeholder="Enter your question here..."></textarea>
            </div>
            
            <div class="question-type-content" id="content-${questionId}">
                ${getMCQContent(questionId)}
            </div>
            
            <div class="marks-input">
                <label>Marks for this question:</label>
                <input type="number" class="question-marks" min="1" max="100" value="2" required>
            </div>
        </div>
    `;
    
    document.getElementById('questionsContainer').insertAdjacentHTML('beforeend', questionHTML);
}

// Get MCQ question content
function getMCQContent(questionId) {
    return `
        <div class="question-input-group">
            <label>Options <span class="required">*</span></label>
            <div class="options-grid">
                <div class="option-input-wrapper">
                    <input type="radio" name="correct-${questionId}" value="0" required>
                    <input type="text" class="option-text" placeholder="Option A" required>
                </div>
                <div class="option-input-wrapper">
                    <input type="radio" name="correct-${questionId}" value="1" required>
                    <input type="text" class="option-text" placeholder="Option B" required>
                </div>
                <div class="option-input-wrapper">
                    <input type="radio" name="correct-${questionId}" value="2" required>
                    <input type="text" class="option-text" placeholder="Option C" required>
                </div>
                <div class="option-input-wrapper">
                    <input type="radio" name="correct-${questionId}" value="3" required>
                    <input type="text" class="option-text" placeholder="Option D" required>
                </div>
            </div>
            <small style="color: #666; display: block; margin-top: 0.5rem;">
                <i class="fas fa-info-circle"></i> Select the radio button next to the correct answer
            </small>
        </div>
    `;
}

// Get True/False question content
function getTrueFalseContent(questionId) {
    return `
        <div class="question-input-group">
            <label>Correct Answer <span class="required">*</span></label>
            <div class="true-false-options">
                <label class="radio-option">
                    <input type="radio" name="correct-${questionId}" value="0" required>
                    <span class="radio-label"><i class="fas fa-check-circle"></i> True</span>
                </label>
                <label class="radio-option">
                    <input type="radio" name="correct-${questionId}" value="1" required>
                    <span class="radio-label"><i class="fas fa-times-circle"></i> False</span>
                </label>
            </div>
        </div>
    `;
}

// Get Fill in the Blank content
function getFillBlankContent(questionId) {
    return `
        <div class="question-input-group">
            <label>Correct Answer(s) <span class="required">*</span></label>
            <input type="text" class="fill-blank-answer" placeholder="Enter correct answer" required>
            <small style="color: #666; display: block; margin-top: 0.5rem;">
                <i class="fas fa-info-circle"></i> For multiple acceptable answers, separate with commas (e.g., "answer1, answer2")
            </small>
        </div>
    `;
}

// Get Short Answer content
function getShortAnswerContent(questionId) {
    return `
        <div class="question-input-group">
            <label>Expected Answer (Optional - for teacher reference)</label>
            <textarea class="expected-answer" rows="3" placeholder="What answer do you expect? (This is for your reference only)"></textarea>
            <small style="color: #666; display: block; margin-top: 0.5rem;">
                <i class="fas fa-info-circle"></i> This question will require manual grading
            </small>
        </div>
    `;
}

// Get Essay content
function getEssayContent(questionId) {
    return `
        <div class="question-input-group">
            <label>Word Limit (optional)</label>
            <input type="number" class="word-limit" min="50" max="5000" placeholder="e.g., 500">
        </div>
        <div class="question-input-group">
            <label>Grading Rubric (Optional - for teacher reference)</label>
            <textarea class="grading-rubric" rows="3" placeholder="What criteria will you use for grading?"></textarea>
            <small style="color: #666; display: block; margin-top: 0.5rem;">
                <i class="fas fa-info-circle"></i> This question will require manual grading
            </small>
        </div>
    `;
}

// Get File Upload content
function getFileUploadContent(questionId) {
    return `
        <div class="question-input-group">
            <label>Instructions for Upload</label>
            <textarea class="upload-instructions" rows="2" placeholder="What should students upload? (e.g., diagram, solution, PDF)"></textarea>
            <small style="color: #666; display: block; margin-top: 0.5rem;">
                <i class="fas fa-info-circle"></i> This question will require manual grading. Students will upload files during the exam.
            </small>
        </div>
    `;
}

// Handle question type change
function handleQuestionTypeChange(questionId, newType) {
    const card = document.getElementById(questionId);
    const contentDiv = document.getElementById(`content-${questionId}`);
    
    // Update card data attribute
    card.setAttribute('data-type', newType);
    
    // Update content based on type
    let newContent = '';
    switch(newType) {
        case 'mcq':
            newContent = getMCQContent(questionId);
            break;
        case 'true_false':
            newContent = getTrueFalseContent(questionId);
            break;
        case 'fill_blank':
            newContent = getFillBlankContent(questionId);
            break;
        case 'short_answer':
            newContent = getShortAnswerContent(questionId);
            break;
        case 'essay':
            newContent = getEssayContent(questionId);
            break;
        case 'file_upload':
            newContent = getFileUploadContent(questionId);
            break;
    }
    
    contentDiv.innerHTML = newContent;
}

// Remove question
function removeQuestion(questionId) {
    const questionCard = document.getElementById(questionId);
    if (document.querySelectorAll('.question-card').length > 1) {
        questionCard.remove();
        renumberQuestions();
    } else {
        alert('❌ You must have at least one question!');
    }
}

// Renumber questions after removal
function renumberQuestions() {
    const questions = document.querySelectorAll('.question-card');
    questions.forEach((question, index) => {
        const questionNumber = question.querySelector('.question-number');
        questionNumber.textContent = `Question ${index + 1}`;
    });
}

// Handle create quiz submission
async function handleCreateQuiz(e) {
    e.preventDefault();
    
    // Get basic quiz info
    const title = document.getElementById('quizTitle').value.trim();
    const subject = document.getElementById('quizSubject').value.trim();
    const description = document.getElementById('quizDescription').value.trim();
    const timeLimit = parseInt(document.getElementById('timeLimit').value);
    const passingPercentage = parseInt(document.getElementById('passingPercentage').value);
    const deadline = document.getElementById('quizDeadline').value;
    
    // Get assigned students
    const selectedStudents = Array.from(
        document.querySelectorAll('input[name="quizAssignedStudents"]:checked')
    ).map(cb => parseInt(cb.value));
    
    if (selectedStudents.length === 0) {
        alert('❌ Please select at least one student!');
        return;
    }
    
    // Get questions
    const questionCards = document.querySelectorAll('.question-card');
    const questions = [];
    
    for (let i = 0; i < questionCards.length; i++) {
        const card = questionCards[i];
        const questionType = card.getAttribute('data-type');
        const questionText = card.querySelector('.question-text').value.trim();
        const marks = parseInt(card.querySelector('.question-marks').value);
        
        if (!questionText || !marks) {
            alert(`❌ Please complete all required fields for Question ${i + 1}`);
            return;
        }
        
        let questionData = {
            id: i + 1,
            type: questionType,
            question: questionText,
            marks: marks
        };
        
        // Handle different question types
        if (questionType === 'mcq') {
            const options = Array.from(card.querySelectorAll('.option-text')).map(input => input.value.trim());
            const correctAnswer = parseInt(card.querySelector(`input[name="correct-${card.id}"]:checked`)?.value);
            
            if (options.some(opt => !opt) || correctAnswer === undefined) {
                alert(`❌ Please complete all options and select correct answer for Question ${i + 1}`);
                return;
            }
            
            questionData.options = options;
            questionData.correctAnswer = correctAnswer;
            
        } else if (questionType === 'true_false') {
            const correctAnswer = parseInt(card.querySelector(`input[name="correct-${card.id}"]:checked`)?.value);
            
            if (correctAnswer === undefined) {
                alert(`❌ Please select True or False for Question ${i + 1}`);
                return;
            }
            
            questionData.options = ['True', 'False'];
            questionData.correctAnswer = correctAnswer;
            
        } else if (questionType === 'fill_blank') {
            const answerInput = card.querySelector('.fill-blank-answer');
            const answerText = answerInput?.value.trim();
            
            if (!answerText) {
                alert(`❌ Please provide correct answer(s) for Question ${i + 1}`);
                return;
            }
            
            // Split by commas for multiple accepted answers
            const acceptedAnswers = answerText.split(',').map(a => a.trim()).filter(a => a);
            questionData.acceptedAnswers = acceptedAnswers;
            questionData.correctAnswer = acceptedAnswers[0]; // For backward compatibility
            
        } else if (questionType === 'short_answer') {
            const expectedAnswer = card.querySelector('.expected-answer')?.value.trim();
            questionData.expectedAnswer = expectedAnswer || '';
            
        } else if (questionType === 'essay') {
            const wordLimit = card.querySelector('.word-limit')?.value;
            const rubric = card.querySelector('.grading-rubric')?.value.trim();
            
            questionData.wordLimit = wordLimit ? parseInt(wordLimit) : null;
            questionData.gradingRubric = rubric || '';
            
        } else if (questionType === 'file_upload') {
            const instructions = card.querySelector('.upload-instructions')?.value.trim();
            questionData.uploadInstructions = instructions || '';
        }
        
        questions.push(questionData);
    }
    
    // Create quiz object
    const newQuiz = {
        title: title,
        subject: subject,
        description: description,
        questions: questions,
        timeLimit: timeLimit,
        passingPercentage: passingPercentage,
        assignedTo: selectedStudents,
        deadline: deadline || null
    };
    
    // Save quiz
    await dataManager.addQuiz(newQuiz);
    
    alert('✅ Quiz created successfully!');
    resetQuizForm();
    
    // Switch to view tab
    document.querySelectorAll('.quiz-tab-btn')[1].click();
}

// Reset quiz form
function resetQuizForm() {
    document.getElementById('createQuizForm').reset();
    document.getElementById('questionsContainer').innerHTML = '';
    questionCounter = 0;
    addQuestion();
}

/* ===================================
   VIEW QUIZZES FUNCTIONS
   =================================== */

async function loadAllQuizzes() {
    const quizzes = await dataManager.getQuizzes();
    const container = document.getElementById('quizzesList');
    const countBadge = document.getElementById('quizCountBadge');
    const noQuizzesMessage = document.getElementById('noQuizzesMessage');
    
    countBadge.textContent = quizzes.length;
    
    if (quizzes.length === 0) {
        container.innerHTML = '';
        noQuizzesMessage.style.display = 'block';
        return;
    }
    
    noQuizzesMessage.style.display = 'none';
    
    container.innerHTML = await (async () => {
        const cards = [];
        for (const quiz of quizzes) {
            const stats = await dataManager.getQuizStatistics(quiz.id);
        const totalMarks = quiz.questions.reduce((sum, q) => sum + q.marks, 0);
        
            cards.push(`
            <div class="quiz-card">
                <div class="quiz-card-header">
                    <h3 class="quiz-title">${quiz.title}</h3>
                    ${quiz.subject ? `<span class="quiz-subject">${quiz.subject}</span>` : ''}
                </div>
                
                ${quiz.description ? `<p class="quiz-description">${quiz.description}</p>` : ''}
                
                <div class="quiz-meta">
                    <div class="quiz-meta-item">
                        <i class="fas fa-question-circle"></i>
                        <span>${quiz.questions.length} Questions</span>
                    </div>
                    <div class="quiz-meta-item">
                        <i class="fas fa-star"></i>
                        <span>${totalMarks} Marks</span>
                    </div>
                    <div class="quiz-meta-item">
                        <i class="fas fa-clock"></i>
                        <span>${quiz.timeLimit} Minutes</span>
                    </div>
                    <div class="quiz-meta-item">
                        <i class="fas fa-users"></i>
                        <span>${quiz.assignedTo.length} Students</span>
                    </div>
                    ${quiz.deadline ? `
                        <div class="quiz-meta-item">
                            <i class="fas fa-calendar"></i>
                            <span>Due: ${new Date(quiz.deadline).toLocaleDateString()}</span>
                        </div>
                    ` : ''}
                    <div class="quiz-meta-item">
                        <i class="fas fa-percent"></i>
                        <span>Pass: ${quiz.passingPercentage}%</span>
                    </div>
                </div>
                
                <div class="quiz-stats">
                    <div class="quiz-stat">
                        <span class="quiz-stat-value">${stats.totalAttempts}</span>
                        <span class="quiz-stat-label">Attempts</span>
                    </div>
                    <div class="quiz-stat">
                        <span class="quiz-stat-value">${stats.completionRate}%</span>
                        <span class="quiz-stat-label">Completion</span>
                    </div>
                    <div class="quiz-stat">
                        <span class="quiz-stat-value">${stats.averagePercentage}%</span>
                        <span class="quiz-stat-label">Avg Score</span>
                    </div>
                </div>
                
                <div class="quiz-actions">
                    <button class="btn-quiz-action btn-view-results" onclick="viewQuizResults(${quiz.id})">
                        <i class="fas fa-chart-line"></i> View Results
                    </button>
                    <button class="btn-quiz-action btn-delete-quiz" onclick="deleteQuiz(${quiz.id})">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        `);
        }
        return cards.join('');
    })();
}

// View quiz results
function viewQuizResults(quizId) {
    // Switch to results tab
    document.querySelectorAll('.quiz-tab-btn')[2].click();
    
    // Load results for this quiz
    setTimeout(() => {
        const selector = document.getElementById('quizResultsSelector');
        if (selector) {
            selector.value = quizId;
            loadQuizResults(quizId);
        }
    }, 100);
}

// Delete quiz
async function deleteQuiz(quizId) {
    const quiz = await dataManager.getQuizById(quizId);
    if (!quiz) return;
    
    const confirmMsg = `⚠️ Are you sure you want to delete "${quiz.title}"?\n\nThis will remove:\n- The quiz from ${quiz.assignedTo.length} students\n- All student results for this quiz\n\nThis action cannot be undone.`;
    
    if (confirm(confirmMsg)) {
        await dataManager.deleteQuiz(quizId);
        alert('✅ Quiz deleted successfully!');
        loadAllQuizzes();
    }
}

/* ===================================
   RESULTS & ANALYTICS FUNCTIONS
   =================================== */

async function loadQuizResultsSelector() {
    const quizzes = await dataManager.getQuizzes();
    const container = document.getElementById('resultsContent');
    
    if (quizzes.length === 0) {
        container.innerHTML = '';
        document.getElementById('noResultsMessage').style.display = 'block';
        return;
    }
    
    document.getElementById('noResultsMessage').style.display = 'none';
    
    container.innerHTML = `
        <div class="results-quiz-selector">
            <label for="quizResultsSelector">Select a Quiz to View Results:</label>
            <select id="quizResultsSelector" onchange="loadQuizResults(this.value)">
                <option value="">-- Select Quiz --</option>
                ${quizzes.map(quiz => `
                    <option value="${quiz.id}">${quiz.title}</option>
                `).join('')}
            </select>
        </div>
        <div id="quizResultsDisplay"></div>
    `;
}

async function loadQuizResults(quizId) {
    if (!quizId) return;
    
    const quiz = await dataManager.getQuizById(parseInt(quizId));
    const stats = await dataManager.getQuizStatistics(parseInt(quizId));
    const results = await dataManager.getResultsForQuiz(parseInt(quizId));
    const students = await dataManager.getStudents();
    
    const displayContainer = document.getElementById('quizResultsDisplay');
    
    if (!quiz) {
        displayContainer.innerHTML = '<p>Quiz not found</p>';
        return;
    }
    
    // Analytics Cards
    const analyticsHTML = `
        <div class="analytics-cards">
            <div class="analytics-card">
                <span class="analytics-value">${stats.totalAttempts}</span>
                <span class="analytics-label">Total Attempts</span>
            </div>
            <div class="analytics-card">
                <span class="analytics-value">${stats.completionRate}%</span>
                <span class="analytics-label">Completion Rate</span>
            </div>
            <div class="analytics-card">
                <span class="analytics-value">${stats.averagePercentage}%</span>
                <span class="analytics-label">Average Score</span>
            </div>
            <div class="analytics-card">
                <span class="analytics-value">${stats.passedCount}/${stats.totalAttempts}</span>
                <span class="analytics-label">Pass Rate</span>
            </div>
            <div class="analytics-card">
                <span class="analytics-value">${stats.highestScore}</span>
                <span class="analytics-label">Highest Score</span>
            </div>
            <div class="analytics-card">
                <span class="analytics-value">${stats.lowestScore}</span>
                <span class="analytics-label">Lowest Score</span>
            </div>
        </div>
    `;
    
    // Results Table
    let tableHTML = '';
    if (results.length > 0) {
        tableHTML = `
            <div class="results-table-container">
                <table class="results-table">
                    <thead>
                        <tr>
                            <th>Student Name</th>
                            <th>Score</th>
                            <th>Percentage</th>
                            <th>Status</th>
                            <th>Time Taken</th>
                            <th>Submitted At</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${results.map(result => {
                            const student = students.find(s => s.id === result.studentId);
                            const minutes = Math.floor(result.timeTaken / 60);
                            const seconds = result.timeTaken % 60;
                            
                            const scoreClass = result.percentage >= 80 ? 'score-high' : 
                                             result.percentage >= 60 ? 'score-medium' : 'score-low';
                            
                            return `
                                <tr>
                                    <td>${student ? student.name : 'Unknown'}</td>
                                    <td class="score-display ${scoreClass}">${result.score} / ${result.totalMarks}</td>
                                    <td class="${scoreClass}">${result.percentage}%</td>
                                    <td>
                                        <span class="status-badge ${result.passed ? 'status-passed' : 'status-failed'}">
                                            ${result.passed ? '✅ Passed' : '❌ Failed'}
                                        </span>
                                    </td>
                                    <td>${minutes}m ${seconds}s</td>
                                    <td>${new Date(result.submittedAt).toLocaleString()}</td>
                                    <td>
                                        ${student ? `
                                            <button class="btn-quiz-action btn-small" onclick="window.location.href='/pages/teacher-student-detail.html?studentId=${student.id}';">
                                                <i class="fas fa-user"></i> Profile
                                            </button>
                                            <button class="btn-quiz-action btn-small" onclick="window.location.href='/pages/teacher-dashboard.html?studentId=${student.id}#manage-tasks';">
                                                <i class="fas fa-tasks"></i> Tasks
                                            </button>
                                            <button class="btn-quiz-action btn-small" onclick="window.location.href='/pages/teacher-chat.html?studentId=${student.id}';">
                                                <i class="fas fa-comments"></i> Chat
                                            </button>
                                        ` : ''}
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
    } else {
        tableHTML = '<div class="empty-state"><p>No students have taken this quiz yet.</p></div>';
    }
    
    displayContainer.innerHTML = analyticsHTML + tableHTML;
}

/* ===================================
   PENDING REVIEWS & MANUAL GRADING
   =================================== */

// Update pending count badge
async function updatePendingCount() {
    const pendingResults = await dataManager.getPendingGradingResults();
    const count = pendingResults.length;
    const badge = document.getElementById('pendingCount');
    
    if (count > 0) {
        badge.textContent = count;
        badge.style.display = 'inline-block';
    } else {
        badge.style.display = 'none';
    }
}

// Load pending reviews
async function loadPendingReviews() {
    const container = document.getElementById('pendingReviewsContainer');
    const emptyMessage = document.getElementById('noPendingMessage');
    const pendingResults = await dataManager.getPendingGradingResults();
    
    if (pendingResults.length === 0) {
        container.innerHTML = '';
        emptyMessage.style.display = 'flex';
        return;
    }
    
    emptyMessage.style.display = 'none';
    
    // Group by student
    const groupedByStudent = {};
    pendingResults.forEach(result => {
        const studentId = result.studentId;
        if (!groupedByStudent[studentId]) {
            groupedByStudent[studentId] = [];
        }
        groupedByStudent[studentId].push(result);
    });
    
    let html = '';
    
    for (const studentId of Object.keys(groupedByStudent)) {
        const results = groupedByStudent[studentId];
        const student = await dataManager.getStudentById(parseInt(studentId));
        const studentName = student ? student.name : 'Unknown Student';
        for (const result of results) {
            const quiz = await dataManager.getQuizById(result.quizId);
            if (!quiz) continue;
            
            // Get ungraded questions
            const ungradedAnswers = await dataManager.getUngradedAnswers(result.id);
            
            if (ungradedAnswers.length === 0) return;
            
            html += `
                <div class="pending-review-card">
                    <div class="pending-review-header">
                        <div>
                            <div class="pending-review-title">${quiz.title}</div>
                            <div class="pending-review-info">
                                <span><i class="fas fa-user"></i> ${studentName}</span>
                                <span><i class="fas fa-calendar"></i> Submitted: ${new Date(result.submittedAt).toLocaleDateString()}</span>
                                <span><i class="fas fa-clipboard-list"></i> ${ungradedAnswers.length} question(s) pending</span>
                            </div>
                        </div>
                        <div class="pending-review-actions">
                            ${student ? `
                                <button class="btn-quiz-action btn-small" onclick="window.location.href='/pages/teacher-student-detail.html?studentId=${student.id}';">
                                    <i class="fas fa-user"></i> Profile
                                </button>
                                <button class="btn-quiz-action btn-small" onclick="window.location.href='/pages/teacher-dashboard.html?studentId=${student.id}#manage-tasks';">
                                    <i class="fas fa-tasks"></i> Tasks
                                </button>
                                <button class="btn-quiz-action btn-small" onclick="window.location.href='/pages/teacher-chat.html?studentId=${student.id}';">
                                    <i class="fas fa-comments"></i> Chat
                                </button>
                            ` : ''}
                        </div>
                    </div>
                    
                    <div class="pending-questions-list">
                        ${ungradedAnswers.map(answer => {
                            const question = quiz.questions[answer.index];
                            return `
                                <div class="pending-question-item">
                                    <div>
                                        <strong>Q${answer.index + 1}:</strong> ${truncateText(question.question, 60)}
                                        <span style="color: #9C27B0; font-weight: 600; margin-left: 1rem;">(${question.marks} marks)</span>
                                    </div>
                                    <button class="btn-grade-question" onclick="showGradingModal(${result.id}, ${answer.index})">
                                        <i class="fas fa-edit"></i> Grade Now
                                    </button>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
        }
    }
    
    container.innerHTML = html;
    updatePendingCount();
}

// Show grading modal
async function showGradingModal(resultId, questionIndex) {
    const result = (await dataManager.getQuizResults()).find(r => r.id === resultId);
    if (!result) return;
    
    const quiz = await dataManager.getQuizById(result.quizId);
    if (!quiz) return;
    
    const question = quiz.questions[questionIndex];
    const answer = result.answers[questionIndex];
    const student = await dataManager.getStudentById(result.studentId);
    
    let answerDisplay = '';
    
    if (question.type === 'short_answer' || question.type === 'essay') {
        const wordCount = answer.answer ? answer.answer.trim().split(/\s+/).filter(w => w).length : 0;
        answerDisplay = `
            <div class="grading-student-answer">
                <span class="grading-answer-label">Student's Answer:</span>
                <div class="grading-answer-text">${answer.answer || '(No answer provided)'}</div>
                ${question.type === 'essay' ? `<div style="margin-top: 0.5rem; color: #64748B; font-size: 0.9rem;">Word count: ${wordCount}</div>` : ''}
            </div>
        `;
    } else if (question.type === 'file_upload') {
        if (answer.answer && answer.answer.fileName) {
            answerDisplay = `
                <div class="grading-student-answer">
                    <span class="grading-answer-label">Uploaded File:</span>
                    <div class="grading-file-display">
                        <i class="fas fa-file-alt"></i>
                        <div>
                            <div style="font-weight: 600;">${answer.answer.fileName}</div>
                            <div style="font-size: 0.9rem; color: #64748B;">${(answer.answer.fileSize / 1024).toFixed(2)} KB</div>
                        </div>
                    </div>
                </div>
            `;
        } else {
            answerDisplay = `
                <div class="grading-student-answer">
                    <span class="grading-answer-label">Uploaded File:</span>
                    <div class="grading-answer-text">(No file uploaded)</div>
                </div>
            `;
        }
    }
    
    const modalBody = document.getElementById('gradingModalBody');
    modalBody.innerHTML = `
        <div class="grading-question-info">
            <div class="grading-question-text">${question.question}</div>
            <div class="grading-question-meta">
                <span><i class="fas fa-user"></i> ${student.name}</span>
                <span><i class="fas fa-graduation-cap"></i> ${quiz.title}</span>
                <span><i class="fas fa-award"></i> Max Marks: ${question.marks}</span>
            </div>
        </div>
        
        ${answerDisplay}
        
        ${question.expectedAnswer ? `
            <div class="grading-student-answer" style="background: #F0FDF4; border-color: #86EFAC;">
                <span class="grading-answer-label" style="color: #16A34A;">Expected Answer (Reference):</span>
                <div class="grading-answer-text" style="color: #15803D;">${question.expectedAnswer}</div>
            </div>
        ` : ''}
        
        ${question.gradingRubric ? `
            <div class="grading-student-answer" style="background: #FEF3C7; border-color: #FDE047;">
                <span class="grading-answer-label" style="color: #CA8A04;">Grading Rubric:</span>
                <div class="grading-answer-text" style="color: #A16207;">${question.gradingRubric}</div>
            </div>
        ` : ''}
        
        <form class="grading-form" onsubmit="submitGrade(event, ${resultId}, ${questionIndex})">
            <div class="grading-input-group">
                <label>Marks Awarded <span style="color: #EF4444;">*</span></label>
                <input type="number" 
                       id="gradeMarks" 
                       class="grading-marks-input" 
                       min="0" 
                       max="${question.marks}" 
                       step="0.5" 
                       required 
                       placeholder="0">
                <small style="color: #64748B;">Out of ${question.marks} marks</small>
            </div>
            
            <div class="grading-input-group">
                <label>Feedback for Student (Optional)</label>
                <textarea id="gradeFeedback" 
                          class="grading-feedback-textarea" 
                          placeholder="Provide constructive feedback to help the student improve..."></textarea>
            </div>
            
            <div class="grading-actions">
                <button type="button" class="btn-cancel-grade" onclick="closeGradingModal()">Cancel</button>
                <button type="submit" class="btn-submit-grade">
                    <i class="fas fa-check"></i> Submit Grade
                </button>
            </div>
        </form>
    `;
    
    document.getElementById('gradingModal').style.display = 'flex';
}

// Close grading modal
function closeGradingModal() {
    document.getElementById('gradingModal').style.display = 'none';
}

// Submit grade
async function submitGrade(event, resultId, questionIndex) {
    event.preventDefault();
    
    const marks = parseFloat(document.getElementById('gradeMarks').value);
    const feedback = document.getElementById('gradeFeedback').value.trim();
    
    const updatedResult = await dataManager.gradeAnswer(resultId, questionIndex, marks, feedback);
    
    if (!updatedResult) {
        alert('❌ Error grading answer. Please try again.');
        return;
    }
    
    closeGradingModal();
    
    // Check if all questions are now graded
    if (updatedResult.status === 'graded') {
        alert(`✅ All questions graded! Final score: ${updatedResult.score}/${updatedResult.totalMarks} (${updatedResult.percentage}%)`);
    } else {
        alert('✅ Grade submitted successfully!');
    }
    
    // Reload pending reviews
    loadPendingReviews();
    updatePendingCount();
}

// Truncate text helper
function truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

