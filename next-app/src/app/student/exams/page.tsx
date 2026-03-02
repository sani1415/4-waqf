'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useQuizzes, useQuizResults } from '@/hooks/useFirestore';
import { useTranslation } from '@/hooks/useTranslation';
import '@/styles/exams.css';

export default function StudentExams() {
  const router = useRouter();
  const { isLoggedIn, role, studentId, logout, isLoading: authLoading } = useAuth();
  const { t, lang, changeLang } = useTranslation();
  
  const { data: quizzes, loading: quizzesLoading } = useQuizzes();
  const { data: quizResults, addItem: addQuizResult } = useQuizResults();
  
  const [activeTab, setActiveTab] = useState<'available' | 'completed' | 'records'>('available');
  const [selectedQuiz, setSelectedQuiz] = useState<any>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect if not logged in as student
  useEffect(() => {
    if (!authLoading && (!isLoggedIn || role !== 'student')) {
      router.push('/');
    }
  }, [isLoggedIn, role, router, authLoading]);

  // Timer for exam
  useEffect(() => {
    if (selectedQuiz && timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            handleSubmitExam();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [selectedQuiz, timeRemaining]);

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  // Get quizzes assigned to this student
  const myQuizzes = quizzes.filter((quiz: any) => 
    quiz.assignedTo?.includes(studentId)
  );

  // Get completed quiz IDs
  const completedQuizIds = quizResults
    .filter((r: any) => r.studentId === studentId)
    .map((r: any) => r.quizId);

  // Available quizzes (not yet taken)
  const availableQuizzes = myQuizzes.filter((quiz: any) => 
    !completedQuizIds.includes(quiz.id)
  );

  // Completed quizzes
  const completedQuizzes = myQuizzes.filter((quiz: any) => 
    completedQuizIds.includes(quiz.id)
  );

  // Get my result for a quiz
  const getMyResult = (quizId: string) => {
    return quizResults.find((r: any) => r.quizId === quizId && r.studentId === studentId);
  };

  // Start exam
  const startExam = (quiz: any) => {
    setSelectedQuiz(quiz);
    setCurrentQuestionIndex(0);
    setAnswers({});
    setTimeRemaining((quiz.timeLimit || 30) * 60);
  };

  // Set answer
  const setAnswer = (questionId: string, value: any) => {
    setAnswers({ ...answers, [questionId]: value });
  };

  // Calculate score
  const calculateScore = (quiz: any, answers: Record<string, any>) => {
    let score = 0;
    let totalMarks = 0;

    quiz.questions?.forEach((question: any) => {
      totalMarks += question.marks || 1;
      const answer = answers[question.id];

      if (question.type === 'multiple_choice' || question.type === 'true_false' || question.type === 'fill_blank') {
        if (answer && answer.toString().toLowerCase().trim() === question.correctAnswer?.toString().toLowerCase().trim()) {
          score += question.marks || 1;
        }
      }
    });

    return { score, totalMarks };
  };

  // Submit exam
  const handleSubmitExam = async () => {
    if (!selectedQuiz || !studentId || isSubmitting) return;

    const unansweredCount = (selectedQuiz.questions || []).filter((q: any) => !answers[q.id]).length;
    
    if (unansweredCount > 0 && timeRemaining > 0) {
      const confirmSubmit = confirm(t('confirm_unanswered_submit').replace('{{count}}', unansweredCount.toString()));
      if (!confirmSubmit) return;
    }

    setIsSubmitting(true);

    try {
      const { score, totalMarks } = calculateScore(selectedQuiz, answers);
      const percentage = totalMarks > 0 ? Math.round((score / totalMarks) * 100) : 0;
      const passed = percentage >= (selectedQuiz.passPercentage || 60);

      await addQuizResult({
        quizId: selectedQuiz.id,
        studentId: studentId,
        answers: answers,
        score: score,
        totalMarks: totalMarks,
        percentage: percentage,
        passed: passed,
        submittedAt: new Date().toISOString(),
        timeTaken: ((selectedQuiz.timeLimit || 30) * 60) - timeRemaining
      });

      setSelectedQuiz(null);
      setAnswers({});
      setActiveTab('completed');
    } catch (error) {
      alert(t('alert_error_submitting'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (authLoading) {
    return <div className="loading-state"><i className="fas fa-spinner fa-spin"></i></div>;
  }

  if (!isLoggedIn || role !== 'student') {
    return null;
  }

  // Taking Exam View
  if (selectedQuiz) {
    const questions = selectedQuiz.questions || [];
    const currentQuestion = questions[currentQuestionIndex];
    const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

    return (
      <div className="exam-taking-container">
        <header className="exam-header">
          <h1>{selectedQuiz.title}</h1>
          <div className={`timer ${timeRemaining < 300 ? 'warning' : ''}`}>
            <i className="fas fa-clock"></i>
            <span>{formatTime(timeRemaining)}</span>
          </div>
        </header>

        <div className="exam-progress">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }}></div>
          </div>
          <span>{currentQuestionIndex + 1} / {questions.length}</span>
        </div>

        {currentQuestion && (
          <div className="question-container">
            <div className="question-text">
              <span className="question-number">Q{currentQuestionIndex + 1}.</span>
              <p>{currentQuestion.text}</p>
              <span className="question-marks">({currentQuestion.marks || 1} marks)</span>
            </div>

            <div className="answer-section">
              {currentQuestion.type === 'multiple_choice' && (
                <div className="options-grid">
                  {(currentQuestion.options || []).map((option: string, index: number) => (
                    <button
                      key={index}
                      className={`option-btn ${answers[currentQuestion.id] === option ? 'selected' : ''}`}
                      onClick={() => setAnswer(currentQuestion.id, option)}
                    >
                      <span className="option-letter">{String.fromCharCode(65 + index)}</span>
                      <span className="option-text">{option}</span>
                    </button>
                  ))}
                </div>
              )}

              {currentQuestion.type === 'true_false' && (
                <div className="options-grid tf-options">
                  <button
                    className={`option-btn ${answers[currentQuestion.id] === 'true' ? 'selected' : ''}`}
                    onClick={() => setAnswer(currentQuestion.id, 'true')}
                  >
                    <i className="fas fa-check"></i> True
                  </button>
                  <button
                    className={`option-btn ${answers[currentQuestion.id] === 'false' ? 'selected' : ''}`}
                    onClick={() => setAnswer(currentQuestion.id, 'false')}
                  >
                    <i className="fas fa-times"></i> False
                  </button>
                </div>
              )}

              {currentQuestion.type === 'fill_blank' && (
                <input
                  type="text"
                  className="fill-blank-input"
                  value={answers[currentQuestion.id] || ''}
                  onChange={(e) => setAnswer(currentQuestion.id, e.target.value)}
                  placeholder="Enter your answer..."
                />
              )}

              {currentQuestion.type === 'short_answer' && (
                <textarea
                  className="short-answer-input"
                  value={answers[currentQuestion.id] || ''}
                  onChange={(e) => setAnswer(currentQuestion.id, e.target.value)}
                  placeholder="Write your answer..."
                  rows={3}
                />
              )}

              {currentQuestion.type === 'essay' && (
                <textarea
                  className="essay-input"
                  value={answers[currentQuestion.id] || ''}
                  onChange={(e) => setAnswer(currentQuestion.id, e.target.value)}
                  placeholder="Write your essay..."
                  rows={8}
                />
              )}
            </div>
          </div>
        )}

        <div className="exam-navigation">
          <button
            className="btn-secondary"
            onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
            disabled={currentQuestionIndex === 0}
          >
            <i className="fas fa-arrow-left"></i> Previous
          </button>
          
          {currentQuestionIndex < questions.length - 1 ? (
            <button
              className="btn-primary"
              onClick={() => setCurrentQuestionIndex(currentQuestionIndex + 1)}
            >
              Next <i className="fas fa-arrow-right"></i>
            </button>
          ) : (
            <button
              className="btn-success"
              onClick={handleSubmitExam}
              disabled={isSubmitting}
            >
              <i className="fas fa-paper-plane"></i> {isSubmitting ? '...' : 'Submit'}
            </button>
          )}
        </div>

        <div className="question-nav-dots">
          {questions.map((_: any, index: number) => (
            <button
              key={index}
              className={`nav-dot ${index === currentQuestionIndex ? 'active' : ''} ${answers[questions[index]?.id] ? 'answered' : ''}`}
              onClick={() => setCurrentQuestionIndex(index)}
            >
              {index + 1}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Main Exams List View
  return (
    <div className="exams-container student-exams">
      <header className="exams-header">
        <button className="back-btn" onClick={() => router.push('/student/dashboard')}>
          <i className="fas fa-arrow-left"></i>
        </button>
        <h1>{t('student_nav_exams')}</h1>
        <div className="header-actions">
          <div className="lang-switcher lang-switcher-compact">
            <button 
              className={`lang-btn ${lang === 'en' ? 'active' : ''}`}
              onClick={() => changeLang('en')}
            >
              EN
            </button>
            <button 
              className={`lang-btn ${lang === 'bn' ? 'active' : ''}`}
              onClick={() => changeLang('bn')}
            >
              বাং
            </button>
          </div>
          <button className="btn-logout-chat" onClick={handleLogout} title={t('logout')}>
            <i className="fas fa-sign-out-alt"></i>
          </button>
        </div>
      </header>

      <div className="quiz-tabs">
        <button 
          type="button"
          className={`quiz-tab-btn ${activeTab === 'available' ? 'active' : ''}`}
          onClick={() => setActiveTab('available')}
          title="Available Quizzes"
        >
          <i className="fas fa-clipboard-check"></i>
          <span className="tab-label">{t('available_quizzes')}</span>
          {availableQuizzes.length > 0 && (
            <span className="badge">{availableQuizzes.length}</span>
          )}
        </button>
        <button 
          type="button"
          className={`quiz-tab-btn ${activeTab === 'completed' ? 'active' : ''}`}
          onClick={() => setActiveTab('completed')}
          title="Completed Quizzes"
        >
          <i className="fas fa-trophy"></i>
          <span className="tab-label">{t('completed_quizzes')}</span>
        </button>
        <button 
          type="button"
          className={`quiz-tab-btn ${activeTab === 'records' ? 'active' : ''}`}
          onClick={() => setActiveTab('records')}
          title="Records"
        >
          <i className="fas fa-history"></i>
          <span className="tab-label">{t('tab_records')}</span>
        </button>
      </div>

      <div className="exams-content">
        {/* Available Exams */}
        {activeTab === 'available' && (
          <div className="available-exams">
            {quizzesLoading ? (
              <div className="loading-state">
                <i className="fas fa-spinner fa-spin"></i>
                <p>{t('loading')}</p>
              </div>
            ) : availableQuizzes.length === 0 ? (
              <div className="empty-state">
                <i className="fas fa-graduation-cap"></i>
                <h3>{t('no_available_exams')}</h3>
              </div>
            ) : (
              <div className="quizzes-list">
                {availableQuizzes.map((quiz: any) => (
                  <div key={quiz.id} className="quiz-card available">
                    <div className="quiz-info">
                      <h3>{quiz.title}</h3>
                      {quiz.subject && <p className="quiz-subject">{quiz.subject}</p>}
                      {quiz.description && <p className="quiz-desc">{quiz.description}</p>}
                      <div className="quiz-meta">
                        <span><i className="fas fa-question-circle"></i> {quiz.questions?.length || 0} questions</span>
                        <span><i className="fas fa-clock"></i> {quiz.timeLimit || 30} min</span>
                        <span><i className="fas fa-percentage"></i> Pass: {quiz.passPercentage || 60}%</span>
                      </div>
                    </div>
                    <button 
                      className="btn-primary start-btn"
                      onClick={() => startExam(quiz)}
                    >
                      <i className="fas fa-play"></i> Start
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Completed Exams */}
        {activeTab === 'completed' && (
          <div className="completed-exams">
            {completedQuizzes.length === 0 ? (
              <div className="empty-state">
                <i className="fas fa-clipboard-check"></i>
                <h3>{t('no_completed_tasks')}</h3>
              </div>
            ) : (
              <div className="quizzes-list">
                {completedQuizzes.map((quiz: any) => {
                  const result = getMyResult(quiz.id);
                  return (
                    <div key={quiz.id} className={`quiz-card completed ${result?.passed ? 'passed' : 'failed'}`}>
                      <div className="quiz-info">
                        <h3>{quiz.title}</h3>
                        {quiz.subject && <p className="quiz-subject">{quiz.subject}</p>}
                      </div>
                      <div className="result-info">
                        <div className="score-circle">
                          <span className="score">{result?.percentage || 0}%</span>
                        </div>
                        <span className={`status ${result?.passed ? 'passed' : 'failed'}`}>
                          {result?.passed ? 'Passed' : 'Failed'}
                        </span>
                        <span className="score-detail">
                          {result?.score}/{result?.totalMarks}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Records Tab */}
        {activeTab === 'records' && (
          <div className="records-section">
            <h2>{t('exam_history')}</h2>
            {quizResults.filter((r: any) => r.studentId === studentId).length === 0 ? (
              <div className="empty-state">
                <i className="fas fa-history"></i>
                <p>{t('no_exam_records')}</p>
              </div>
            ) : (
              <div className="records-list">
                {quizResults
                  .filter((r: any) => r.studentId === studentId)
                  .sort((a: any, b: any) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
                  .map((result: any) => {
                    const quiz = quizzes.find((q: any) => q.id === result.quizId);
                    return (
                      <div key={result.id} className="record-card">
                        <div className="record-info">
                          <h4>{quiz?.title || t('unknown_quiz')}</h4>
                          <span className="record-date">
                            {new Date(result.submittedAt).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="record-score">
                          <span className={`percentage ${result.passed ? 'passed' : 'failed'}`}>
                            {result.percentage}%
                          </span>
                          <span className="raw-score">{result.score}/{result.totalMarks}</span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
