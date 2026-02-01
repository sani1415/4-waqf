// Student Quiz Taking Logic

let currentQuiz = null;
let currentQuestionIndex = 0;
let studentAnswers = [];
let timerInterval = null;
let timeRemaining = 0; // in seconds
let startTime = null;

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    // Wait for dataManager to be ready before initializing
    if (typeof dataManager !== 'undefined' && dataManager.initialized) {
        initializePage();
    } else {
        window.addEventListener('dataManagerReady', initializePage);
    }
});

// Initialize page after dataManager is ready
async function initializePage() {
    const urlParams = new URLSearchParams(window.location.search);
    const quizId = urlParams.get('quizId');
    const studentId = getStudentId();

    if (!quizId || !studentId) {
        alert('❌ Invalid quiz or student!');
        window.location.href = '/pages/student-dashboard.html';
        return;
    }

    // Check if student already took this quiz
    if (await dataManager.hasStudentTakenQuiz(quizId, studentId)) {
        alert('⚠️ You have already taken this quiz!');
        window.location.href = '/pages/student-dashboard.html';
        return;
    }

    await loadQuiz(quizId);
}

// Get student ID from session
function getStudentId() {
    return parseInt(sessionStorage.getItem('currentStudentId'));
}

// Load quiz
async function loadQuiz(quizId) {
    currentQuiz = await dataManager.getQuizById(parseInt(quizId));
    
    if (!currentQuiz) {
        alert('❌ Quiz not found!');
        window.location.href = '/pages/student-dashboard.html';
        return;
    }
    
    // Initialize answers array
    studentAnswers = new Array(currentQuiz.questions.length).fill(null);
    
    // Load quiz header
    loadQuizHeader();
    
    // Start timer
    startTimer();
    
    // Load first question
    loadQuestion(0);
    
    // Setup progress dots
    setupProgressDots();
}

// Load quiz header
function loadQuizHeader() {
    const totalMarks = currentQuiz.questions.reduce((sum, q) => sum + q.marks, 0);
    
    document.getElementById('quizHeader').innerHTML = `
        <h1 class="quiz-title-header">${currentQuiz.title}</h1>
        ${currentQuiz.description ? `<p style="color: var(--text-secondary); margin-bottom: 1rem;">${currentQuiz.description}</p>` : ''}
        <div class="quiz-meta-header">
            <span><i class="fas fa-question-circle"></i> ${currentQuiz.questions.length} Questions</span>
            <span><i class="fas fa-star"></i> ${totalMarks} Total Marks</span>
            <span><i class="fas fa-percent"></i> ${currentQuiz.passingPercentage}% to Pass</span>
        </div>
    `;
    
    document.getElementById('totalQuestions').textContent = currentQuiz.questions.length;
}

// Start timer
function startTimer() {
    timeRemaining = currentQuiz.timeLimit * 60; // Convert to seconds
    startTime = Date.now();
    
    updateTimerDisplay();
    
    timerInterval = setInterval(() => {
        timeRemaining--;
        updateTimerDisplay();
        
        // Warning when 5 minutes left
        if (timeRemaining === 300) {
            document.getElementById('timerContainer').classList.add('timer-warning');
            alert('⚠️ Only 5 minutes remaining!');
        }
        
        // Auto-submit when time is up
        if (timeRemaining <= 0) {
            clearInterval(timerInterval);
            alert('⏰ Time is up! Quiz will be submitted automatically.');
            submitQuiz();
        }
    }, 1000);
}

// Update timer display
function updateTimerDisplay() {
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    
    const display = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    document.getElementById('timerDisplay').textContent = display;
    
    // Add warning class if less than 2 minutes
    if (timeRemaining <= 120 && !document.getElementById('timerContainer').classList.contains('timer-warning')) {
        document.getElementById('timerContainer').classList.add('timer-warning');
    }
}

// Setup progress dots
function setupProgressDots() {
    const container = document.getElementById('progressDots');
    container.innerHTML = currentQuiz.questions.map((_, index) => 
        `<div class="progress-dot ${index === 0 ? 'current' : ''}" data-index="${index}"></div>`
    ).join('');
}

// Load question
function loadQuestion(index) {
    currentQuestionIndex = index;
    const question = currentQuiz.questions[index];
    const questionType = question.type || 'mcq'; // Default to MCQ for backward compatibility
    
    let questionHTML = `
        <div class="question-number-badge">Question ${index + 1} of ${currentQuiz.questions.length}</div>
        <div class="question-text">${question.question}</div>
    `;
    
    // Render based on question type
    if (questionType === 'mcq') {
        questionHTML += renderMCQQuestion(question, index);
    } else if (questionType === 'true_false') {
        questionHTML += renderTrueFalseQuestion(question, index);
    } else if (questionType === 'fill_blank') {
        questionHTML += renderFillBlankQuestion(question, index);
    } else if (questionType === 'short_answer') {
        questionHTML += renderShortAnswerQuestion(question, index);
    } else if (questionType === 'essay') {
        questionHTML += renderEssayQuestion(question, index);
    } else if (questionType === 'file_upload') {
        questionHTML += renderFileUploadQuestion(question, index);
    }
    
    document.getElementById('questionContainer').innerHTML = questionHTML;
    
    // Update navigation
    updateNavigation();
    
    // Update progress dots
    updateProgressDots();
    
    // Update question number
    document.getElementById('currentQuestionNum').textContent = index + 1;
}

// Render MCQ question
function renderMCQQuestion(question, index) {
    const letters = ['A', 'B', 'C', 'D'];
    return `
        <div class="options-container">
            ${question.options.map((option, optIndex) => `
                <button class="option-button ${studentAnswers[index] === optIndex ? 'selected' : ''}" 
                        onclick="selectOption(${optIndex})">
                    <span class="option-letter">${letters[optIndex]}</span>
                    <span class="option-text">${option}</span>
                </button>
            `).join('')}
        </div>
    `;
}

// Render True/False question
function renderTrueFalseQuestion(question, index) {
    return `
        <div class="true-false-container">
            <button class="tf-button ${studentAnswers[index] === 0 ? 'selected' : ''}" 
                    onclick="selectOption(0)">
                <i class="fas fa-check-circle"></i>
                <span>True</span>
            </button>
            <button class="tf-button ${studentAnswers[index] === 1 ? 'selected' : ''}" 
                    onclick="selectOption(1)">
                <i class="fas fa-times-circle"></i>
                <span>False</span>
            </button>
        </div>
    `;
}

// Render Fill in the Blank question
function renderFillBlankQuestion(question, index) {
    const currentAnswer = studentAnswers[index] || '';
    return `
        <div class="text-answer-container">
            <input type="text" 
                   class="fill-blank-input" 
                   placeholder="Type your answer here..." 
                   value="${currentAnswer}"
                   oninput="updateTextAnswer(this.value)"
                   autocomplete="off">
            <small style="color: #64748B; margin-top: 0.5rem; display: block;">
                <i class="fas fa-info-circle"></i> Answer is case-insensitive
            </small>
        </div>
    `;
}

// Render Short Answer question
function renderShortAnswerQuestion(question, index) {
    const currentAnswer = studentAnswers[index] || '';
    return `
        <div class="text-answer-container">
            <textarea class="short-answer-textarea" 
                      placeholder="Type your answer here..." 
                      rows="5"
                      oninput="updateTextAnswer(this.value)">${currentAnswer}</textarea>
            <small style="color: #64748B; margin-top: 0.5rem; display: block;">
                <i class="fas fa-info-circle"></i> This answer will be manually graded by your teacher
            </small>
        </div>
    `;
}

// Render Essay question
function renderEssayQuestion(question, index) {
    const currentAnswer = studentAnswers[index] || '';
    const wordCount = currentAnswer ? currentAnswer.trim().split(/\s+/).filter(w => w).length : 0;
    const wordLimit = question.wordLimit || null;
    
    return `
        <div class="text-answer-container">
            ${wordLimit ? `<div class="word-limit-info">Word Limit: ${wordLimit} words</div>` : ''}
            <textarea class="essay-textarea" 
                      placeholder="Type your essay here..." 
                      rows="12"
                      oninput="updateTextAnswer(this.value)">${currentAnswer}</textarea>
            <div class="word-count-display">
                <span id="wordCount">${wordCount}</span> words
                ${wordLimit ? `<span class="${wordCount > wordLimit ? 'text-danger' : ''}">(max: ${wordLimit})</span>` : ''}
            </div>
            <small style="color: #64748B; margin-top: 0.5rem; display: block;">
                <i class="fas fa-info-circle"></i> This essay will be manually graded by your teacher
            </small>
        </div>
    `;
}

// Render File Upload question
function renderFileUploadQuestion(question, index) {
    const uploadInstructions = question.uploadInstructions || 'Upload your file';
    return `
        <div class="file-upload-container">
            <div class="upload-instructions">${uploadInstructions}</div>
            <div class="file-upload-area" id="fileUploadArea-${index}">
                <i class="fas fa-cloud-upload-alt"></i>
                <p>Click to upload or drag and drop</p>
                <small>PDF, Image, DOC, or any document</small>
                <input type="file" 
                       id="fileInput-${index}" 
                       class="file-input" 
                       onchange="handleFileUpload(event, ${index})"
                       accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif">
            </div>
            <div id="filePreview-${index}" class="file-preview"></div>
            <small style="color: #64748B; margin-top: 0.5rem; display: block;">
                <i class="fas fa-info-circle"></i> This submission will be manually graded by your teacher
            </small>
        </div>
    `;
}

// Select option (for MCQ and True/False)
function selectOption(optionIndex) {
    studentAnswers[currentQuestionIndex] = optionIndex;
    
    // Update UI
    document.querySelectorAll('.option-button, .tf-button').forEach((btn, index) => {
        if (index === optionIndex) {
            btn.classList.add('selected');
        } else {
            btn.classList.remove('selected');
        }
    });
    
    // Update progress dots
    updateProgressDots();
}

// Update text answer (for Fill Blank, Short Answer, Essay)
function updateTextAnswer(value) {
    studentAnswers[currentQuestionIndex] = value;
    
    // Update word count for essays
    const wordCountElem = document.getElementById('wordCount');
    if (wordCountElem) {
        const wordCount = value.trim().split(/\s+/).filter(w => w).length;
        wordCountElem.textContent = wordCount;
    }
    
    // Update progress dots
    updateProgressDots();
}

// Handle file upload
function handleFileUpload(event, questionIndex) {
    const file = event.target.files[0];
    if (!file) return;
    
    // For now, store file name and create a data URL (in real app, would upload to server)
    const reader = new FileReader();
    reader.onload = function(e) {
        studentAnswers[questionIndex] = {
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
            fileData: e.target.result // Base64 data URL
        };
        
        // Show preview
        const previewDiv = document.getElementById(`filePreview-${questionIndex}`);
        previewDiv.innerHTML = `
            <div class="uploaded-file">
                <i class="fas fa-file"></i>
                <span>${file.name}</span>
                <span class="file-size">(${(file.size / 1024).toFixed(2)} KB)</span>
                <button onclick="removeFile(${questionIndex})" class="btn-remove-file">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        // Update progress dots
        updateProgressDots();
    };
    reader.readAsDataURL(file);
}

// Remove uploaded file
function removeFile(questionIndex) {
    studentAnswers[questionIndex] = null;
    document.getElementById(`filePreview-${questionIndex}`).innerHTML = '';
    document.getElementById(`fileInput-${questionIndex}`).value = '';
    updateProgressDots();
}

// Update progress dots
function updateProgressDots() {
    const dots = document.querySelectorAll('.progress-dot');
    dots.forEach((dot, index) => {
        dot.classList.remove('current');
        
        // Check if question is answered (handle different answer types)
        const answer = studentAnswers[index];
        const isAnswered = answer !== null && answer !== undefined && answer !== '';
        
        if (isAnswered) {
            dot.classList.add('answered');
        } else {
            dot.classList.remove('answered');
        }
        if (index === currentQuestionIndex) {
            dot.classList.add('current');
        }
    });
}

// Update navigation buttons
function updateNavigation() {
    const btnPrev = document.getElementById('btnPrev');
    const btnNext = document.getElementById('btnNext');
    const btnSubmit = document.getElementById('btnSubmit');
    
    // Show/hide previous button
    if (currentQuestionIndex > 0) {
        btnPrev.style.display = 'flex';
    } else {
        btnPrev.style.display = 'none';
    }
    
    // Show submit button on last question
    if (currentQuestionIndex === currentQuiz.questions.length - 1) {
        btnNext.style.display = 'none';
        btnSubmit.style.display = 'flex';
    } else {
        btnNext.style.display = 'flex';
        btnSubmit.style.display = 'none';
    }
}

// Previous question
function previousQuestion() {
    if (currentQuestionIndex > 0) {
        loadQuestion(currentQuestionIndex - 1);
    }
}

// Next question
function nextQuestion() {
    if (currentQuestionIndex < currentQuiz.questions.length - 1) {
        loadQuestion(currentQuestionIndex + 1);
    }
}

// Submit quiz
async function submitQuiz() {
    // Check if all questions are answered
    const unansweredCount = studentAnswers.filter(ans => ans === null).length;
    
    if (unansweredCount > 0) {
        const confirmSubmit = confirm(`⚠️ You have ${unansweredCount} unanswered question${unansweredCount > 1 ? 's' : ''}.\n\nDo you want to submit anyway?`);
        if (!confirmSubmit) {
            return;
        }
    }
    
    // Confirm submission
    const finalConfirm = confirm('📝 Are you sure you want to submit your quiz?\n\nYou cannot change your answers after submission.');
    if (!finalConfirm) {
        return;
    }
    
    // Stop timer
    if (timerInterval) {
        clearInterval(timerInterval);
    }
    
    // Calculate time taken
    const timeTaken = Math.floor((Date.now() - startTime) / 1000); // in seconds
    
    // Submit to dataManager (it will auto-grade)
    const studentId = getStudentId();
    const result = await dataManager.submitQuiz(currentQuiz.id, studentId, studentAnswers, timeTaken);
    
    if (result) {
        // Show result immediately
        showResult(result);
    } else {
        alert('❌ Error submitting quiz!');
        window.location.href = '/pages/student-dashboard.html';
    }
}

// Show result
function showResult(result) {
    const container = document.querySelector('.quiz-taking-container');
    
    const minutes = Math.floor(result.timeTaken / 60);
    const seconds = result.timeTaken % 60;
    
    const correctAnswers = result.answers.filter(a => a.isCorrect).length;
    const wrongAnswers = result.answers.filter(a => !a.isCorrect).length;
    
    // Check if result is pending teacher review
    const isPending = result.status === 'pending_review';
    
    if (isPending) {
        // Show pending review message
        container.innerHTML = `
            <div class="quiz-header" style="text-align: center;">
                <h1 class="quiz-title-header">Exam Submitted Successfully!</h1>
                <p style="color: var(--text-secondary); font-size: 1.1rem;">Your submission is pending teacher review</p>
            </div>
            
            <div class="question-container" style="max-width: 600px; margin: 0 auto;">
                <div style="background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 2rem; border-radius: 12px; margin: 2rem 0;">
                    <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem;">
                        <i class="fas fa-hourglass-half" style="font-size: 2rem; color: #F59E0B;"></i>
                        <h3 style="margin: 0; color: #92400E;">Pending Manual Grading</h3>
                    </div>
                    <p style="color: #78350F; line-height: 1.6; margin: 0;">
                        Your exam contains subjective questions that require manual grading by your teacher. 
                        Your final score and result will be available once the teacher completes the grading process.
                    </p>
                </div>
                
                ${result.score > 0 ? `
                    <div class="quiz-score">
                        <div style="font-size: 3rem; font-weight: 700; color: #9C27B0; margin: 2rem 0;">
                            ${result.percentage}%
                        </div>
                        <div style="font-size: 1.1rem; color: var(--text-secondary); margin-bottom: 1rem;">
                            Partial Score: ${result.score} out of ${result.totalMarks} marks
                        </div>
                        <small style="color: #64748B; display: block;">
                            (Auto-graded questions only. Final score may change after manual grading.)
                        </small>
                    </div>
                ` : `
                    <div style="text-align: center; padding: 2rem; color: #64748B;">
                        <i class="fas fa-clipboard-check" style="font-size: 3rem; margin-bottom: 1rem;"></i>
                        <p>All questions require manual grading. Please wait for your teacher to review your submission.</p>
                    </div>
                `}
                
                <div class="quiz-result-display" style="margin-top: 2rem;">
                    <h3 style="margin-bottom: 1rem; text-align: center;">Submission Details</h3>
                    <div class="quiz-result-details" style="grid-template-columns: 1fr; gap: 1rem;">
                        <div class="quiz-result-item">
                            <span>⏱️ Time Taken:</span>
                            <strong>${minutes}m ${seconds}s</strong>
                        </div>
                        <div class="quiz-result-item">
                            <span>📅 Submitted At:</span>
                            <strong>${new Date(result.submittedAt).toLocaleString()}</strong>
                        </div>
                    </div>
                </div>
                
                <a href="/pages/student-dashboard.html" class="btn-take-quiz" style="margin-top: 2rem; text-decoration: none;">
                    <i class="fas fa-home"></i> Back to Dashboard
                </a>
            </div>
        `;
    } else {
        // Show full result (already graded)
        container.innerHTML = `
            <div class="quiz-header" style="text-align: center;">
                <h1 class="quiz-title-header">Exam Completed!</h1>
                <p style="color: var(--text-secondary); font-size: 1.1rem;">Here are your results</p>
            </div>
            
            <div class="question-container" style="max-width: 600px; margin: 0 auto;">
                <div class="quiz-score">
                    <div style="font-size: 5rem; font-weight: 700; color: #9C27B0; margin: 2rem 0;">
                        ${result.percentage}%
                    </div>
                    <div style="font-size: 1.2rem; color: var(--text-secondary); margin-bottom: 2rem;">
                        ${result.score} out of ${result.totalMarks} marks
                    </div>
                </div>
                
                <div class="quiz-result-status ${result.passed ? 'passed' : 'failed'}" style="font-size: 1.2rem; padding: 1rem;">
                    ${result.passed ? '🎉 Congratulations! You Passed!' : '😞 Sorry, You Did Not Pass'}
                </div>
                
                <div class="quiz-result-display" style="margin-top: 2rem;">
                    <h3 style="margin-bottom: 1rem; text-align: center;">Exam Statistics</h3>
                    <div class="quiz-result-details" style="grid-template-columns: 1fr; gap: 1rem;">
                        <div class="quiz-result-item">
                            <span>✅ Correct Answers:</span>
                            <strong style="color: #4CAF50;">${correctAnswers}</strong>
                        </div>
                        <div class="quiz-result-item">
                            <span>❌ Wrong Answers:</span>
                            <strong style="color: #F44336;">${wrongAnswers}</strong>
                        </div>
                        <div class="quiz-result-item">
                            <span>⏱️ Time Taken:</span>
                            <strong>${minutes}m ${seconds}s</strong>
                        </div>
                        <div class="quiz-result-item">
                            <span>📊 Passing Percentage:</span>
                            <strong>${currentQuiz.passingPercentage}%</strong>
                        </div>
                        <div class="quiz-result-item">
                            <span>📅 Submitted At:</span>
                            <strong>${new Date(result.submittedAt).toLocaleString()}</strong>
                        </div>
                    </div>
                </div>
                
                <a href="/pages/student-dashboard.html" class="btn-take-quiz" style="margin-top: 2rem; text-decoration: none;">
                    <i class="fas fa-home"></i> Back to Dashboard
                </a>
            </div>
        `;
    }
}

// Prevent page reload/close during quiz
window.addEventListener('beforeunload', function (e) {
    if (currentQuiz && timerInterval) {
        e.preventDefault();
        e.returnValue = '';
        return 'Are you sure you want to leave? Your quiz progress will be lost.';
    }
});

