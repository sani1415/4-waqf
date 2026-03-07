'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useQuizzes, useQuizResults, useStudents, useMessages } from '@/hooks/useFirestore';
import { useTranslation } from '@/hooks/useTranslation';
import TeacherPageShell from '@/components/teacher/TeacherPageShell';
import { formatDateDisplay, formatDateTimeDisplay, getUseHijri } from '@/lib/date-format';
import '@/styles/teacher.css';
import '@/styles/exams.css';
interface Question {
  id: string;
  type: 'multiple_choice' | 'true_false' | 'fill_blank' | 'short_answer' | 'essay' | 'file_upload';
  text: string;
  options?: string[];
  correctAnswer?: string | string[];
  marks: number;
  uploadInstructions?: string;
}

export default function TeacherExams() {
  const router = useRouter();
  const { isLoggedIn, role, isLoading: authLoading } = useAuth();
  const { t, lang, changeLang } = useTranslation();
  const [dateFormatKey, setDateFormatKey] = useState(0);
  useEffect(() => {
    const onFormatChange = () => setDateFormatKey((k) => k + 1);
    window.addEventListener('waqf-date-format-changed', onFormatChange);
    return () => window.removeEventListener('waqf-date-format-changed', onFormatChange);
  }, []);
  const useHijri = getUseHijri();

  const { data: quizzes, loading: quizzesLoading, addItem: addQuiz, deleteItem: deleteQuiz } = useQuizzes();
  const { data: quizResults } = useQuizResults();
  const { data: students } = useStudents();
  const { data: messages } = useMessages();
  
  const [activeTab, setActiveTab] = useState<'all' | 'create' | 'results' | 'pending'>('create');
  
  // Create quiz form state
  const [quizTitle, setQuizTitle] = useState('');
  const [quizSubject, setQuizSubject] = useState('');
  const [quizDescription, setQuizDescription] = useState('');
  const [timeLimit, setTimeLimit] = useState('30');
  const [passPercentage, setPassPercentage] = useState('60');
  const [quizDeadline, setQuizDeadline] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [assignedStudents, setAssignedStudents] = useState<string[]>([]);
  const [assignToAll, setAssignToAll] = useState(false);
  const [selectedQuizId, setSelectedQuizId] = useState<string | null>(null);

  // Redirect if not logged in as teacher
  useEffect(() => {
    if (!authLoading && (!isLoggedIn || role !== 'teacher')) {
      router.push('/');
    }
  }, [isLoggedIn, role, router, authLoading]);

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

  const handleAssignToAllChange = (checked: boolean) => {
    setAssignToAll(checked);
    if (checked) setAssignedStudents((students || []).map((s: any) => s.id));
  };
  const toggleStudentAssignment = (studentId: string, checked: boolean) => {
    if (checked) setAssignedStudents((prev) => (prev.includes(studentId) ? prev : [...prev, studentId]));
    else setAssignedStudents((prev) => prev.filter((id) => id !== studentId));
  };

  // Create quiz
  const handleCreateQuiz = async () => {
    if (!quizTitle.trim()) {
      alert(t('alert_fill_required_fields'));
      return;
    }
    const toAssign = assignToAll ? (students || []).map((s: any) => s.id) : assignedStudents;
    if (!toAssign.length) {
      alert(t('alert_select_one_student'));
      return;
    }

    const quiz = {
      title: quizTitle,
      subject: quizSubject,
      description: quizDescription,
      timeLimit: parseInt(timeLimit) || 30,
      passPercentage: parseInt(passPercentage) || 60,
      deadline: quizDeadline || null,
      questions: questions,
      assignedTo: toAssign,
      createdAt: new Date().toISOString()
    };

    await addQuiz(quiz);
    setQuizTitle('');
    setQuizSubject('');
    setQuizDescription('');
    setTimeLimit('30');
    setPassPercentage('60');
    setQuizDeadline('');
    setQuestions([]);
    setAssignedStudents([]);
    setAssignToAll(false);
    setActiveTab('all');
  };

  // Delete quiz
  const handleDeleteQuiz = async (quizId: string) => {
    const quiz = quizzes.find((q: any) => q.id === quizId);
    const title = quiz?.title ?? '';
    const count = (quiz?.assignedTo?.length ?? 0).toString();
    const msg = (t('confirm_delete_quiz') || '')
      .replace('{{title}}', title)
      .replace('{{count}}', count);
    if (confirm(msg)) {
      await deleteQuiz(quizId);
    }
  };

  // Get results for a quiz (normalize IDs to string for Firestore/localStorage compatibility)
  const getQuizResults = (quizId: string) => {
    const id = String(quizId);
    return (quizResults || []).filter((r: any) => String(r.quizId) === id);
  };

  // Quiz statistics for selected quiz (Results tab)
  const getQuizStatistics = (quizId: string) => {
    const quiz = (quizzes || []).find((q: any) => String(q.id) === String(quizId));
    const results = getQuizResults(quizId);
    const assignedCount = (quiz?.assignedTo || []).length;
    if (results.length === 0) {
      return {
        totalAttempts: 0,
        averagePercentage: 0,
        completionRate: 0,
        passedCount: 0,
        passRate: 0,
        highestScore: 0,
        lowestScore: 0
      };
    }
    const passedCount = results.filter((r: any) => r.passed).length;
    const percentages = results.map((r: any) => r.percentage ?? 0);
    const scores = results.map((r: any) => r.score ?? 0);
    return {
      totalAttempts: results.length,
      averagePercentage: Math.round(percentages.reduce((a: number, b: number) => a + b, 0) / results.length),
      completionRate: assignedCount > 0 ? Math.round((results.length / assignedCount) * 100) : 0,
      passedCount,
      passRate: Math.round((passedCount / results.length) * 100),
      highestScore: scores.length ? Math.max(...scores) : 0,
      lowestScore: scores.length ? Math.min(...scores) : 0
    };
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

  const unreadMessages = messages.filter((m: any) => m.sender === 'student' && !m.read).length;
  if (authLoading) {
    return (
      <TeacherPageShell
        t={t}
        lang={lang}
        onLangChange={changeLang}
        unreadMessages={unreadMessages}
        activeSection="exams"
        activeBottom="exams"
        showTopBar
        topBarTitle={t('exams_title')}
      >
        <div className="exams-container">
          <div className="loading-state">
            <i className="fas fa-spinner fa-spin"></i>
            <p>{t('loading')}</p>
          </div>
        </div>
      </TeacherPageShell>
    );
  }

  if (!isLoggedIn || role !== 'teacher') {
    return null;
  }

  const pendingReviews = getPendingReviews();

  return (
    <TeacherPageShell
      t={t}
      lang={lang}
      onLangChange={changeLang}
      unreadMessages={unreadMessages}
      activeSection="exams"
      activeBottom="exams"
      showTopBar
        topBarTitle={t('exams_title')}
    >
      <div className="exams-container">

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
          <i className="fas fa-clipboard-check"></i>
          <span className="tab-label">{t('pending')}</span>
          {pendingReviews.length > 0 && (
            <span className="pending-badge">{pendingReviews.length}</span>
          )}
        </button>
      </div>

      <div className="exams-content">
        {/* All Exams Tab */}
        {activeTab === 'all' && (
          <div className="all-exams quizzes-list-container">
            <div className="section-header">
              <h2><i className="fas fa-list"></i> {t('all_quizzes')} <span className="count-badge" id="quizCountBadge">{quizzes.length}</span></h2>
            </div>
            {quizzesLoading ? (
              <div className="loading-state">
                <i className="fas fa-spinner fa-spin"></i>
                <p>{t('loading')}</p>
              </div>
            ) : quizzes.length === 0 ? (
              <div className="empty-state" id="noQuizzesMessage">
                <i className="fas fa-graduation-cap"></i>
                <h3>{t('no_quizzes_yet')}</h3>
                <p>{t('no_quizzes_hint')}</p>
                <button className="btn-primary" onClick={() => setActiveTab('create')}>
                  <i className="fas fa-plus"></i> {t('create_exam')}
                </button>
              </div>
            ) : (
              <div id="quizzesList" className="quizzes-grid">
                {quizzes.map((quiz: any) => {
                  const results = getQuizResults(quiz.id);
                  const totalMarks = (quiz.questions || []).reduce((sum: number, q: any) => sum + (q.marks || 1), 0);
                  const assignedCount = (quiz.assignedTo || []).length;
                  const avgScore = results.length > 0
                    ? Math.round(results.reduce((sum: number, r: any) => sum + (r.percentage || 0), 0) / results.length)
                    : 0;
                  const completionRate = assignedCount > 0 ? Math.round((results.length / assignedCount) * 100) : 0;
                  return (
                    <div key={quiz.id} className="quiz-card">
                      <div className="quiz-card-header quiz-header">
                        <h3 className="quiz-title">{quiz.title}</h3>
                        {quiz.subject && <span className="quiz-subject">{quiz.subject}</span>}
                        <div className="quiz-actions">
                          <button
                            type="button"
                            className="btn-quiz-action btn-view-results"
                            onClick={() => { setActiveTab('results'); setSelectedQuizId(quiz.id); }}
                          >
                            <i className="fas fa-chart-line"></i> {t('view_results')}
                          </button>
                          <button
                            type="button"
                            className="btn-quiz-action btn-delete-quiz btn-icon danger"
                            onClick={() => handleDeleteQuiz(quiz.id)}
                            title={t('delete')}
                          >
                            <i className="fas fa-trash"></i> {t('delete')}
                          </button>
                        </div>
                      </div>
                      {quiz.description && <p className="quiz-description">{quiz.description}</p>}
                      <div className="quiz-meta">
                        <div className="quiz-meta-item">
                          <i className="fas fa-question-circle"></i>
                          <span>{quiz.questions?.length || 0} {t('questions')}</span>
                        </div>
                        <div className="quiz-meta-item">
                          <i className="fas fa-star"></i>
                          <span>{totalMarks} {t('total_marks')}</span>
                        </div>
                        <div className="quiz-meta-item">
                          <i className="fas fa-clock"></i>
                          <span>{quiz.timeLimit} {t('minutes_label')}</span>
                        </div>
                        <div className="quiz-meta-item">
                          <i className="fas fa-users"></i>
                          <span>{assignedCount} {t('students_label')}</span>
                        </div>
                        {quiz.deadline && (
                          <div className="quiz-meta-item">
                            <i className="fas fa-calendar"></i>
                            <span>{formatDateDisplay(quiz.deadline, {}, useHijri)}</span>
                          </div>
                        )}
                        <div className="quiz-meta-item">
                          <i className="fas fa-percent"></i>
                          <span>Pass: {quiz.passPercentage ?? quiz.passingPercentage ?? 60}%</span>
                        </div>
                      </div>
                      <div className="quiz-stats">
                        <div className="quiz-stat">
                          <span className="quiz-stat-value">{results.length}</span>
                          <span className="quiz-stat-label">{t('total_attempts')}</span>
                        </div>
                        <div className="quiz-stat">
                          <span className="quiz-stat-value">{completionRate}%</span>
                          <span className="quiz-stat-label">{t('completion_rate')}</span>
                        </div>
                        <div className="quiz-stat">
                          <span className="quiz-stat-value">{results.length > 0 ? avgScore : '-'}%</span>
                          <span className="quiz-stat-label">{t('avg_score')}</span>
                        </div>
                      </div>
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
              <h2><i className="fas fa-plus-circle"></i> <span>{t('new_exam')}</span></h2>
              
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

              <div className="form-row form-row-3">
                <div className="form-group">
                  <label>{t('time_limit_min')} *</label>
                  <input
                    type="number"
                    value={timeLimit}
                    onChange={(e) => setTimeLimit(e.target.value)}
                    placeholder={t('placeholder_time_limit')}
                    min={1}
                    max={180}
                  />
                </div>
                <div className="form-group">
                  <label>{t('pass_pct')} *</label>
                  <input
                    type="number"
                    value={passPercentage}
                    onChange={(e) => setPassPercentage(e.target.value)}
                    placeholder={t('placeholder_pass')}
                    min={0}
                    max={100}
                  />
                </div>
                <div className="form-group">
                  <label>{t('deadline')}</label>
                  <input
                    type="date"
                    value={quizDeadline}
                    onChange={(e) => setQuizDeadline(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>{t('assign_to')} *</label>
                <div className="assign-all-wrapper">
                  <label className="checkbox-item" style={{ background: '#E3F2FD', padding: '0.75rem', borderRadius: '8px' }}>
                    <input
                      type="checkbox"
                      checked={assignToAll}
                      onChange={(e) => handleAssignToAllChange(e.target.checked)}
                    />
                    <span style={{ fontWeight: 600, color: '#1976D2' }}>{t('assign_to_all')}</span>
                  </label>
                </div>
                {!assignToAll && (
                  <div className="checkbox-group quiz-student-checkboxes">
                    {(students || []).map((s: any) => (
                      <label key={s.id} className="checkbox-item">
                        <input
                          type="checkbox"
                          checked={assignedStudents.includes(s.id)}
                          onChange={(e) => toggleStudentAssignment(s.id, e.target.checked)}
                        />
                        <span>{s.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="questions-section">
              <div className="section-header section-header-questions">
                <h3><i className="fas fa-question-circle"></i> {t('questions')}</h3>
                <button type="button" className="btn-add-question" onClick={addQuestion}>
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
                          <option value="multiple_choice">{t('multiple_choice')}</option>
                          <option value="true_false">{t('true_false')}</option>
                          <option value="fill_blank">{t('fill_blank')}</option>
                          <option value="short_answer">{t('short_answer')}</option>
                          <option value="essay">{t('essay')}</option>
                          <option value="file_upload">{t('file_upload')}</option>
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
                            <label>{t('correct_answer')}</label>
                            <input
                              type="text"
                              value={(question.correctAnswer as string) || ''}
                              onChange={(e) => updateQuestion(qIndex, { correctAnswer: e.target.value })}
                              placeholder="Enter the correct answer"
                            />
                          </div>
                        )}

                        {question.type === 'file_upload' && (
                          <div className="question-input-group">
                            <label>{t('upload_instructions') || 'Instructions for Upload'}</label>
                            <textarea
                              rows={2}
                              placeholder="What should students upload? (e.g., diagram, solution, PDF)"
                              value={question.uploadInstructions || ''}
                              onChange={(e) => updateQuestion(qIndex, { uploadInstructions: e.target.value })}
                            />
                            <small style={{ color: '#666', display: 'block', marginTop: '0.5rem' }}>
                              <i className="fas fa-info-circle"></i> This question will require manual grading.
                            </small>
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
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setQuizTitle('');
                  setQuizSubject('');
                  setQuizDescription('');
                  setTimeLimit('30');
                  setPassPercentage('60');
                  setQuizDeadline('');
                  setQuestions([]);
                  setAssignedStudents([]);
                  setAssignToAll(false);
                }}
              >
                <i className="fas fa-times"></i> {t('reset')}
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
          <div className="results-section results-container">
            <div className="section-header">
              <h2><i className="fas fa-chart-line"></i> {t('quiz_results_analytics')}</h2>
            </div>
            {quizzes.length === 0 ? (
              <div className="empty-state" id="noResultsMessage">
                <i className="fas fa-chart-bar"></i>
                <h3>{t('no_results_yet')}</h3>
                <p>{t('no_results_hint')}</p>
              </div>
            ) : (
              <>
                <div className="results-quiz-selector">
                  <label htmlFor="quizResultsSelector">{t('select_quiz_view_results')}</label>
                  <select
                    id="quizResultsSelector"
                    value={selectedQuizId != null ? String(selectedQuizId) : ''}
                    onChange={(e) => {
                      const v = e.target.value;
                      setSelectedQuizId(v === '' ? null : v);
                    }}
                  >
                    <option value="">{t('select_quiz')}</option>
                    {(quizzes || []).map((quiz: any) => (
                      <option key={String(quiz.id)} value={String(quiz.id)}>{quiz.title || t('unknown_quiz')}</option>
                    ))}
                  </select>
                </div>
                <div id="quizResultsDisplay" className="quiz-results-display">
                  {selectedQuizId ? (() => {
                    const sid = String(selectedQuizId);
                    const results = getQuizResults(sid);
                    const stats = getQuizStatistics(sid);
                    const quiz = (quizzes || []).find((q: any) => String(q.id) === sid);
                    if (!quiz) {
                      return <div className="empty-state results-empty"><p>{t('alert_quiz_not_found') || 'Exam not found.'}</p></div>;
                    }
                    if (results.length === 0) {
                      return (
                        <div className="empty-state results-empty">
                          <i className="fas fa-clipboard-list"></i>
                          <h3>{t('no_results_yet')}</h3>
                          <p>{t('no_results_taken_yet') || 'No students have taken this exam yet.'}</p>
                        </div>
                      );
                    }
                    return (
                      <>
                        <div className="analytics-cards">
                          <div className="analytics-card">
                            <span className="analytics-value">{stats.totalAttempts}</span>
                            <span className="analytics-label">{t('total_attempts')}</span>
                          </div>
                          <div className="analytics-card">
                            <span className="analytics-value">{stats.completionRate}%</span>
                            <span className="analytics-label">{t('completion_rate')}</span>
                          </div>
                          <div className="analytics-card">
                            <span className="analytics-value">{stats.averagePercentage}%</span>
                            <span className="analytics-label">{t('avg_score')}</span>
                          </div>
                          <div className="analytics-card">
                            <span className="analytics-value">{stats.passedCount}/{stats.totalAttempts}</span>
                            <span className="analytics-label">{t('pass_rate')}</span>
                          </div>
                          <div className="analytics-card">
                            <span className="analytics-value">{stats.highestScore}</span>
                            <span className="analytics-label">{t('highest_score')}</span>
                          </div>
                          <div className="analytics-card">
                            <span className="analytics-value">{stats.lowestScore}</span>
                            <span className="analytics-label">{t('lowest_score')}</span>
                          </div>
                        </div>
                        <div className="results-table-container">
                          <table className="results-table">
                            <thead>
                              <tr>
                                <th>{t('student_name')}</th>
                                <th>{t('score')}</th>
                                <th>{t('percentage')}</th>
                                <th>{t('status')}</th>
                                <th>{t('time_taken')}</th>
                                <th>{t('submitted_at')}</th>
                                <th>{t('actions')}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {results.map((result: any) => {
                                const timeTaken = result.timeTaken;
                                const minutes = timeTaken != null ? Math.floor(Number(timeTaken) / 60) : 0;
                                const seconds = timeTaken != null ? Number(timeTaken) % 60 : 0;
                                const scoreClass = (result.percentage ?? 0) >= 80 ? 'score-high' : (result.percentage ?? 0) >= 60 ? 'score-medium' : 'score-low';
                                return (
                                  <tr key={result.id}>
                                    <td>{getStudentName(result.studentId)}</td>
                                    <td className={`score-display ${scoreClass}`}>{result.score} / {result.totalMarks}</td>
                                    <td className={scoreClass}>{result.percentage}%</td>
                                    <td>
                                      <span className={`status-badge ${result.passed ? 'status-passed' : 'status-failed'}`}>
                                        {result.passed ? '✅ ' + t('passed') : '❌ ' + t('failed')}
                                      </span>
                                    </td>
                                    <td>{minutes}m {seconds}s</td>
                                    <td>{result.submittedAt ? formatDateTimeDisplay(result.submittedAt, lang, useHijri) : '-'}</td>
                                    <td>
                                      <a href={`/teacher/student?section=students&studentId=${result.studentId}`} className="btn-quiz-action btn-small"><i className="fas fa-user"></i> {t('profile')}</a>
                                      <a href={`/teacher/dashboard?studentId=${result.studentId}#manage-tasks`} className="btn-quiz-action btn-small"><i className="fas fa-tasks"></i> {t('tasks')}</a>
                                      <a href={`/teacher/messages?studentId=${result.studentId}`} className="btn-quiz-action btn-small"><i className="fas fa-comments"></i> {t('chat')}</a>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </>
                    );
                  })() : (
                    <p className="tab-description">{t('select_quiz_view_results')}</p>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* Pending Reviews Tab */}
        {activeTab === 'pending' && (
          <div className="pending-section" id="pendingTab">
            <h2><i className="fas fa-clipboard-check"></i> {t('pending_reviews')}</h2>
            <p className="tab-description">{t('pending_reviews_subjective')}</p>
            {pendingReviews.length === 0 ? (
              <div className="empty-state" id="noPendingMessage">
                <i className="fas fa-check-circle" style={{ color: '#22C55E' }}></i>
                <h3>{t('all_caught_up')}</h3>
                <p>{t('no_pending_hint')}</p>
              </div>
            ) : (
              <div id="pendingReviewsContainer" className="pending-list">
                {pendingReviews.map((result: any) => {
                  const quiz = quizzes.find((q: any) => q.id === result.quizId);
                  const ungradedCount = (result.answers && Array.isArray(result.answers))
                    ? result.answers.filter((a: any) => a.marks == null && !a.autoGraded).length
                    : 1;
                  const studentId = result.studentId;
                  return (
                    <div key={result.id} className="pending-review-card">
                      <div className="pending-review-header">
                        <div>
                          <div className="pending-review-title">{quiz?.title || t('unknown_quiz')}</div>
                          <div className="pending-review-info">
                            <span><i className="fas fa-user"></i> {getStudentName(studentId)}</span>
                            <span><i className="fas fa-calendar"></i> {t('submitted_at')}: {result.submittedAt ? formatDateDisplay(result.submittedAt, {}, useHijri) : '-'}</span>
                            <span><i className="fas fa-clipboard-list"></i> {ungradedCount} {t('questions')} {t('pending')}</span>
                          </div>
                        </div>
                        <div className="pending-review-actions">
                          <a href={`/teacher/student?section=students&studentId=${studentId}`} className="btn-quiz-action btn-small"><i className="fas fa-user"></i> {t('profile')}</a>
                          <a href={`/teacher/dashboard?studentId=${studentId}#manage-tasks`} className="btn-quiz-action btn-small"><i className="fas fa-tasks"></i> {t('tasks')}</a>
                          <a href={`/teacher/messages?studentId=${studentId}`} className="btn-quiz-action btn-small"><i className="fas fa-comments"></i> {t('chat')}</a>
                        </div>
                      </div>
                      <div className="pending-questions-list">
                        {result.answers && Array.isArray(result.answers) ? (
                          result.answers.map((answer: any, index: number) => {
                            if (answer.marks != null || answer.autoGraded) return null;
                            const q = quiz?.questions?.[index];
                            const questionText = (q?.text || q?.question || '').slice(0, 60) + (((q?.text || q?.question)?.length ?? 0) > 60 ? '...' : '');
                            const marks = q?.marks ?? 0;
                            return (
                              <div key={index} className="pending-question-item">
                                <div>
                                  <strong>Q{index + 1}:</strong> {questionText}
                                  <span style={{ color: '#9C27B0', fontWeight: 600, marginLeft: '1rem' }}>({marks} {t('marks_for_question')?.toLowerCase() || 'marks'})</span>
                                </div>
                                <button type="button" className="btn-grade-question" onClick={() => { /* TODO: open grading modal */ }}>
                                  <i className="fas fa-edit"></i> {t('grade_now') || 'Grade Now'}
                                </button>
                              </div>
                            );
                          })
                        ) : (
                          <div className="pending-question-item">
                            <div>{t('grade_answer')}</div>
                            <button type="button" className="btn-grade-question" onClick={() => { /* TODO: open grading modal */ }}>
                              <i className="fas fa-edit"></i> {t('grade_answer')}
                            </button>
                          </div>
                        )}
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
    </TeacherPageShell>
  );
}






