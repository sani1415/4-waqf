'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useQuizzes, useQuizResults, useStudents } from '@/hooks/useFirestore';
import { useTranslation } from '@/hooks/useTranslation';
import '@/styles/exams.css';

interface Question {
  id: string;
  type: 'multiple_choice' | 'true_false' | 'fill_blank' | 'short_answer' | 'essay' | 'file_upload';
  text: string;
  options?: string[];
  correctAnswer?: string | string[];
  marks: number;
}

export default function TeacherExams() {
  const router = useRouter();
  const { isLoggedIn, role, logout, isLoading: authLoading } = useAuth();
  const { t, lang, changeLang } = useTranslation();
  
  const { data: quizzes, loading: quizzesLoading, addItem: addQuiz, deleteItem: deleteQuiz } = useQuizzes();
  const { data: quizResults } = useQuizResults();
  const { data: students } = useStudents();
  
  const [activeTab, setActiveTab] = useState<'all' | 'create' | 'results' | 'pending'>('all');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Create quiz form state
  const [quizTitle, setQuizTitle] = useState('');
  const [quizSubject, setQuizSubject] = useState('');
  const [quizDescription, setQuizDescription] = useState('');
  const [timeLimit, setTimeLimit] = useState('30');
  const [passPercentage, setPassPercentage] = useState('60');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [assignedStudents, setAssignedStudents] = useState<string[]>([]);

  // Redirect if not logged in as teacher
  useEffect(() => {
    if (!authLoading && (!isLoggedIn || role !== 'teacher')) {
      router.push('/');
    }
  }, [isLoggedIn, role, router, authLoading]);

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  // Add a new question
  const addQuestion = () => {
    const newQuestion: Question = {
      id: `q_${Date.now()}`,
      type: 'multiple_choice',
      text: '',
      options: ['', '', '', ''],
      correctAnswer: '',
      marks: 1
    };
    setQuestions([...questions, newQuestion]);
  };

  // Update a question
  const updateQuestion = (index: number, updates: Partial<Question>) => {
    const newQuestions = [...questions];
    newQuestions[index] = { ...newQuestions[index], ...updates };
    setQuestions(newQuestions);
  };

  // Remove a question
  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  // Update question option
  const updateOption = (qIndex: number, oIndex: number, value: string) => {
    const newQuestions = [...questions];
    const options = [...(newQuestions[qIndex].options || [])];
    options[oIndex] = value;
    newQuestions[qIndex].options = options;
    setQuestions(newQuestions);
  };

  // Create quiz
  const handleCreateQuiz = async () => {
    if (!quizTitle.trim()) {
      alert(t('alert_fill_required_fields'));
      return;
    }

    const quiz = {
      title: quizTitle,
      subject: quizSubject,
      description: quizDescription,
      timeLimit: parseInt(timeLimit) || 30,
      passPercentage: parseInt(passPercentage) || 60,
      questions: questions,
      assignedTo: assignedStudents.length > 0 ? assignedStudents : students.map((s: any) => s.id),
      createdAt: new Date().toISOString()
    };

    await addQuiz(quiz);
    
    // Reset form
    setQuizTitle('');
    setQuizSubject('');
    setQuizDescription('');
    setTimeLimit('30');
    setPassPercentage('60');
    setQuestions([]);
    setAssignedStudents([]);
    setActiveTab('all');
  };

  // Delete quiz
  const handleDeleteQuiz = async (quizId: string) => {
    if (confirm(t('confirm_delete_task').replace('{{title}}', '').replace('{{count}}', ''))) {
      await deleteQuiz(quizId);
    }
  };

  // Get results for a quiz
  const getQuizResults = (quizId: string) => {
    return quizResults.filter((r: any) => r.quizId === quizId);
  };

  // Get student name by ID
  const getStudentName = (studentId: string) => {
    const student = students.find((s: any) => s.id === studentId);
    return student?.name || 'Unknown';
  };

  // Get pending reviews (essays, short answers that need grading)
  const getPendingReviews = () => {
    return quizResults.filter((result: any) => {
      const quiz = quizzes.find((q: any) => q.id === result.quizId);
      if (!quiz) return false;
      
      const hasSubjectiveQuestions = quiz.questions?.some((q: Question) => 
        ['short_answer', 'essay', 'file_upload'].includes(q.type)
      );
      
      return hasSubjectiveQuestions && !result.gradedAnswers;
    });
  };

  if (authLoading) {
    return (
      <div className="exams-container">
        <div className="loading-state">
          <i className="fas fa-spinner fa-spin"></i>
          <p>{t('loading')}</p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn || role !== 'teacher') {
    return null;
  }

  const pendingReviews = getPendingReviews();

  return (
    <div className="exams-container">
      <header className="exams-header">
        <button className="back-btn" onClick={() => router.push('/teacher/dashboard')}>
          <i className="fas fa-arrow-left"></i>
        </button>
        <h1>{t('exams_title')}</h1>
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

      <div className="exam-tabs">
        <button 
          type="button"
          className={`quiz-tab-btn ${activeTab === 'create' ? 'active' : ''}`}
          onClick={() => setActiveTab('create')}
          title="Create Exam"
        >
          <i className="fas fa-plus-circle"></i>
          <span className="tab-label">{t('new_exam')}</span>
        </button>
        <button 
          type="button"
          className={`quiz-tab-btn ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => setActiveTab('all')}
          title="All Exams"
        >
          <i className="fas fa-list"></i>
          <span className="tab-label">{t('all_exams')}</span>
        </button>
        <button 
          type="button"
          className={`quiz-tab-btn ${activeTab === 'results' ? 'active' : ''}`}
          onClick={() => setActiveTab('results')}
          title="Results"
        >
          <i className="fas fa-chart-line"></i>
          <span className="tab-label">{t('results')}</span>
        </button>
        <button 
          type="button"
          className={`quiz-tab-btn ${activeTab === 'pending' ? 'active' : ''}`}
          onClick={() => setActiveTab('pending')}
          title="Pending Reviews"
        >
          <i className="fas fa-hourglass-half"></i>
          <span className="tab-label">{t('pending')}</span>
          {pendingReviews.length > 0 && (
            <span className="badge">{pendingReviews.length}</span>
          )}
        </button>
      </div>

      <div className="exams-content">
        {/* All Exams Tab */}
        {activeTab === 'all' && (
          <div className="all-exams">
            {quizzesLoading ? (
              <div className="loading-state">
                <i className="fas fa-spinner fa-spin"></i>
                <p>{t('loading')}</p>
              </div>
            ) : quizzes.length === 0 ? (
              <div className="empty-state">
                <i className="fas fa-graduation-cap"></i>
                <h3>{t('no_quizzes_yet')}</h3>
                <p>{t('no_quizzes_hint')}</p>
                <button className="btn-primary" onClick={() => setActiveTab('create')}>
                  <i className="fas fa-plus"></i> {t('create_exam')}
                </button>
              </div>
            ) : (
              <div className="quizzes-grid">
                {quizzes.map((quiz: any) => {
                  const results = getQuizResults(quiz.id);
                  const avgScore = results.length > 0
                    ? Math.round(results.reduce((sum: number, r: any) => sum + (r.percentage || 0), 0) / results.length)
                    : 0;

                  return (
                    <div key={quiz.id} className="quiz-card">
                      <div className="quiz-header">
                        <h3>{quiz.title}</h3>
                        <div className="quiz-actions">
                          <button 
                            className="btn-icon danger"
                            onClick={() => handleDeleteQuiz(quiz.id)}
                            title={t('delete')}
                          >
                            <i className="fas fa-trash"></i>
                          </button>
                        </div>
                      </div>
                      {quiz.subject && <p className="quiz-subject">{quiz.subject}</p>}
                      <div className="quiz-stats">
                        <span><i className="fas fa-question-circle"></i> {quiz.questions?.length || 0} {t('questions')}</span>
                        <span><i className="fas fa-clock"></i> {quiz.timeLimit} min</span>
                        <span><i className="fas fa-users"></i> {results.length} {t('results')}</span>
                      </div>
                      {results.length > 0 && (
                        <div className="quiz-avg-score">
                          <span>{t('average_score')}: {avgScore}%</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Create Exam Tab */}
        {activeTab === 'create' && (
          <div className="create-exam">
            <div className="form-section">
              <h2>{t('create_new_task')}</h2>
              
              <div className="form-row">
                <div className="form-group">
                  <label>{t('exam_title')} *</label>
                  <input
                    type="text"
                    value={quizTitle}
                    onChange={(e) => setQuizTitle(e.target.value)}
                    placeholder={t('placeholder_exam_title')}
                  />
                </div>
                <div className="form-group">
                  <label>{t('subject')}</label>
                  <input
                    type="text"
                    value={quizSubject}
                    onChange={(e) => setQuizSubject(e.target.value)}
                    placeholder={t('placeholder_subject')}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>{t('task_description')}</label>
                <textarea
                  value={quizDescription}
                  onChange={(e) => setQuizDescription(e.target.value)}
                  placeholder={t('placeholder_brief_description')}
                  rows={2}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>{t('time_limit_min')}</label>
                  <input
                    type="number"
                    value={timeLimit}
                    onChange={(e) => setTimeLimit(e.target.value)}
                    placeholder="30"
                    min="1"
                  />
                </div>
                <div className="form-group">
                  <label>{t('pass_pct')}</label>
                  <input
                    type="number"
                    value={passPercentage}
                    onChange={(e) => setPassPercentage(e.target.value)}
                    placeholder="60"
                    min="0"
                    max="100"
                  />
                </div>
              </div>
            </div>

            <div className="questions-section">
              <div className="section-header">
                <h2>{t('questions')} ({questions.length})</h2>
                <button className="btn-secondary" onClick={addQuestion}>
                  <i className="fas fa-plus"></i> {t('add_question')}
                </button>
              </div>

              {questions.length === 0 ? (
                <div className="empty-questions">
                  <p>{t('no_quizzes_hint')}</p>
                </div>
              ) : (
                <div className="questions-list">
                  {questions.map((question, qIndex) => (
                    <div key={question.id} className="question-card">
                      <div className="question-header">
                        <span className="question-number">Q{qIndex + 1}</span>
                        <select
                          value={question.type}
                          onChange={(e) => updateQuestion(qIndex, { type: e.target.value as Question['type'] })}
                        >
                          <option value="multiple_choice">Multiple Choice</option>
                          <option value="true_false">True/False</option>
                          <option value="fill_blank">Fill in the Blank</option>
                          <option value="short_answer">Short Answer</option>
                          <option value="essay">Essay</option>
                        </select>
                        <input
                          type="number"
                          value={question.marks}
                          onChange={(e) => updateQuestion(qIndex, { marks: parseInt(e.target.value) || 1 })}
                          min="1"
                          className="marks-input"
                          title="Marks"
                        />
                        <button 
                          className="btn-icon danger"
                          onClick={() => removeQuestion(qIndex)}
                        >
                          <i className="fas fa-times"></i>
                        </button>
                      </div>

                      <div className="question-body">
                        <textarea
                          value={question.text}
                          onChange={(e) => updateQuestion(qIndex, { text: e.target.value })}
                          placeholder="Enter question text..."
                          rows={2}
                        />

                        {question.type === 'multiple_choice' && (
                          <div className="options-list">
                            {(question.options || []).map((option, oIndex) => (
                              <div key={oIndex} className="option-item">
                                <input
                                  type="radio"
                                  name={`correct_${question.id}`}
                                  checked={question.correctAnswer === option}
                                  onChange={() => updateQuestion(qIndex, { correctAnswer: option })}
                                />
                                <input
                                  type="text"
                                  value={option}
                                  onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                                  placeholder={`Option ${oIndex + 1}`}
                                />
                              </div>
                            ))}
                          </div>
                        )}

                        {question.type === 'true_false' && (
                          <div className="options-list">
                            <div className="option-item">
                              <input
                                type="radio"
                                name={`correct_${question.id}`}
                                checked={question.correctAnswer === 'true'}
                                onChange={() => updateQuestion(qIndex, { correctAnswer: 'true' })}
                              />
                              <span>True</span>
                            </div>
                            <div className="option-item">
                              <input
                                type="radio"
                                name={`correct_${question.id}`}
                                checked={question.correctAnswer === 'false'}
                                onChange={() => updateQuestion(qIndex, { correctAnswer: 'false' })}
                              />
                              <span>False</span>
                            </div>
                          </div>
                        )}

                        {question.type === 'fill_blank' && (
                          <div className="correct-answer">
                            <label>Correct Answer:</label>
                            <input
                              type="text"
                              value={question.correctAnswer as string || ''}
                              onChange={(e) => updateQuestion(qIndex, { correctAnswer: e.target.value })}
                              placeholder="Enter the correct answer"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="form-actions">
              <button 
                className="btn-secondary"
                onClick={() => {
                  setQuizTitle('');
                  setQuizSubject('');
                  setQuizDescription('');
                  setQuestions([]);
                }}
              >
                {t('reset')}
              </button>
              <button 
                className="btn-primary"
                onClick={handleCreateQuiz}
                disabled={!quizTitle.trim()}
              >
                <i className="fas fa-save"></i> {t('create_quiz')}
              </button>
            </div>
          </div>
        )}

        {/* Results Tab */}
        {activeTab === 'results' && (
          <div className="results-section">
            {quizResults.length === 0 ? (
              <div className="empty-state">
                <i className="fas fa-chart-bar"></i>
                <h3>{t('no_results_yet')}</h3>
                <p>{t('no_results_hint')}</p>
              </div>
            ) : (
              <div className="results-list">
                {quizzes.map((quiz: any) => {
                  const results = getQuizResults(quiz.id);
                  if (results.length === 0) return null;

                  return (
                    <div key={quiz.id} className="quiz-results-card">
                      <h3>{quiz.title}</h3>
                      <table className="results-table">
                        <thead>
                          <tr>
                            <th>{t('student')}</th>
                            <th>Score</th>
                            <th>%</th>
                            <th>{t('date')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {results.map((result: any) => (
                            <tr key={result.id} className={result.passed ? 'passed' : 'failed'}>
                              <td>{getStudentName(result.studentId)}</td>
                              <td>{result.score}/{result.totalMarks}</td>
                              <td>{result.percentage}%</td>
                              <td>{new Date(result.submittedAt).toLocaleDateString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Pending Reviews Tab */}
        {activeTab === 'pending' && (
          <div className="pending-section">
            {pendingReviews.length === 0 ? (
              <div className="empty-state">
                <i className="fas fa-check-circle"></i>
                <h3>{t('all_caught_up')}</h3>
                <p>{t('no_pending_hint')}</p>
              </div>
            ) : (
              <div className="pending-list">
                <p className="pending-hint">{t('pending_reviews_desc')}</p>
                {pendingReviews.map((result: any) => {
                  const quiz = quizzes.find((q: any) => q.id === result.quizId);
                  return (
                    <div key={result.id} className="pending-card">
                      <div className="pending-info">
                        <h4>{quiz?.title || t('unknown_quiz')}</h4>
                        <p>{getStudentName(result.studentId)}</p>
                        <span className="pending-date">
                          {new Date(result.submittedAt).toLocaleDateString()}
                        </span>
                      </div>
                      <button className="btn-primary btn-sm">
                        <i className="fas fa-edit"></i> {t('grade_answer')}
                      </button>
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
