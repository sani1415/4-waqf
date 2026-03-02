'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStudents, useTasks } from '@/hooks/useFirestore';
import { useTranslation } from '@/hooks/useTranslation';
import '@/styles/spreadsheet.css';

export default function TaskSheet() {
  const router = useRouter();
  const { t, lang, changeLang } = useTranslation();
  
  const { data: students, loading: studentsLoading } = useStudents();
  const { data: tasks, loading: tasksLoading, updateItem: updateTask } = useTasks();
  
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [authenticated, setAuthenticated] = useState(false);

  // Get daily tasks only
  const dailyTasks = tasks.filter((t: any) => t.type === 'daily');
  const today = new Date().toISOString().split('T')[0];
  const isEditable = selectedDate === today;

  // Check if task is completed for the selected date
  const isCompletedOnDate = (task: any, studentId: string) => {
    return task.completedBy?.[studentId]?.date === selectedDate;
  };

  // Get completion count for a student
  const getCompletionCount = (studentId: string) => {
    const assignedTasks = dailyTasks.filter((t: any) => t.assignedTo?.includes(studentId));
    const completedTasks = assignedTasks.filter((t: any) => isCompletedOnDate(t, studentId));
    return { completed: completedTasks.length, total: assignedTasks.length };
  };

  const handleStudentClick = (student: any) => {
    if (!isEditable) return;
    setSelectedStudent(student);
    setShowPinModal(true);
    setPin('');
    setPinError('');
    setAuthenticated(false);
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedStudent) return;
    
    const storedPin = (selectedStudent.pin || '').toString().trim();
    const inputPin = (pin || '').toString().trim();
    
    if (storedPin && inputPin && storedPin === inputPin) {
      setAuthenticated(true);
      setPinError('');
    } else {
      setPinError(t('invalid_pin'));
    }
  };

  const handleTaskToggle = async (task: any) => {
    if (!selectedStudent || !authenticated || !isEditable) return;
    
    const studentId = selectedStudent.id;
    const completedBy = { ...(task.completedBy || {}) };
    
    if (isCompletedOnDate(task, studentId)) {
      delete completedBy[studentId];
    } else {
      completedBy[studentId] = {
        date: selectedDate,
        completedAt: new Date().toISOString()
      };
    }

    await updateTask(task.id, { completedBy });
  };

  const closeModal = () => {
    setShowPinModal(false);
    setSelectedStudent(null);
    setPin('');
    setPinError('');
    setAuthenticated(false);
  };

  const changeDate = (days: number) => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + days);
    setSelectedDate(date.toISOString().split('T')[0]);
    closeModal();
  };

  const loading = studentsLoading || tasksLoading;

  // Get tasks assigned to selected student
  const studentTasks = selectedStudent 
    ? dailyTasks.filter((t: any) => t.assignedTo?.includes(selectedStudent.id))
    : [];

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (dateStr === today) return t('today');
    return date.toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="task-sheet-container">
      <header className="task-sheet-header">
        <a href="/" className="back-btn" onClick={(e) => { e.preventDefault(); router.push('/'); }}>
          <i className="fas fa-arrow-left"></i> <span>{t('back')}</span>
        </a>
        <div className="header-right">
          <div className="lang-switcher lang-switcher-compact" aria-label="Language">
            <button 
              type="button" 
              className={`lang-btn ${lang === 'en' ? 'active' : ''}`}
              onClick={() => changeLang('en')}
            >
              EN
            </button>
            <button 
              type="button" 
              className={`lang-btn ${lang === 'bn' ? 'active' : ''}`}
              onClick={() => changeLang('bn')}
            >
              বাং
            </button>
          </div>
        </div>
      </header>

      <div className="task-sheet-main">
        <div className="sheet-title-area">
          <h1><i className="fas fa-table"></i> <span>{t('task_sheet_title')}</span></h1>
          <p className="sheet-subtitle">{t('task_sheet_subtitle')}</p>
        </div>

        <div className="spreadsheet-area">
          <div className="sheet-date-bar">
            <button 
              type="button" 
              className="date-nav-btn" 
              title="Previous day"
              onClick={() => changeDate(-1)}
            >
              <i className="fas fa-chevron-left"></i>
            </button>
            <div className="date-display-wrap">
              <span className="date-display">{formatDate(selectedDate)}</span>
              <input 
                type="date" 
                className="date-picker-input" 
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                aria-label="Select date"
              />
            </div>
            <button 
              type="button" 
              className="date-nav-btn" 
              title="Next day"
              onClick={() => changeDate(1)}
            >
              <i className="fas fa-chevron-right"></i>
            </button>
            <span className={`date-mode-badge ${isEditable ? '' : 'readonly'}`}>
              <span>{isEditable ? t('editable') : t('readonly')}</span>
            </span>
          </div>

          {loading ? (
            <div className="sheet-loading">
              <i className="fas fa-circle-notch fa-spin"></i> <span>{t('loading')}</span>
            </div>
          ) : dailyTasks.length === 0 ? (
            <div className="sheet-empty">
              <i className="fas fa-clipboard-list"></i>
              <h3>{t('no_tasks_yet')}</h3>
              <p>{t('task_sheet_empty_hint')}</p>
            </div>
          ) : (
            <>
              <p className="sheet-tap-hint">{t('task_sheet_tap_hint')}</p>
              <div className="sheet-table-wrap">
                <div className="sheet-scroll">
                  <table className="task-sheet-table">
                    <thead>
                      <tr>
                        <th className="student-col">{t('student')}</th>
                        {dailyTasks.map((task: any) => (
                          <th key={task.id} className="task-col" title={task.title}>
                            {task.title}
                          </th>
                        ))}
                        <th className="total-col">{t('total')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((student: any) => {
                        const { completed, total } = getCompletionCount(student.id);
                        const isUnlocked = authenticated && selectedStudent?.id === student.id;
                        
                        return (
                          <tr 
                            key={student.id} 
                            className={`student-row ${isUnlocked ? 'unlocked' : ''}`}
                            onClick={() => !isUnlocked && handleStudentClick(student)}
                          >
                            <td className="student-name-cell">
                              <span className="student-name">{student.name}</span>
                              {isUnlocked && <i className="fas fa-unlock unlock-icon"></i>}
                            </td>
                            {dailyTasks.map((task: any) => {
                              const isAssigned = task.assignedTo?.includes(student.id);
                              const isComplete = isCompletedOnDate(task, student.id);
                              
                              return (
                                <td 
                                  key={task.id} 
                                  className={`task-cell ${!isAssigned ? 'not-assigned' : ''} ${isComplete ? 'completed' : ''}`}
                                  onClick={(e) => {
                                    if (isUnlocked && isAssigned && isEditable) {
                                      e.stopPropagation();
                                      handleTaskToggle(task);
                                    }
                                  }}
                                >
                                  {isAssigned ? (
                                    isComplete ? (
                                      <i className="fas fa-check-circle"></i>
                                    ) : (
                                      <i className="far fa-circle"></i>
                                    )
                                  ) : (
                                    <span className="dash">-</span>
                                  )}
                                </td>
                              );
                            })}
                            <td className="total-cell">
                              <span className={`total-count ${completed === total && total > 0 ? 'all-done' : ''}`}>
                                {completed}/{total}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* PIN Modal */}
      {showPinModal && selectedStudent && !authenticated && (
        <div className="pin-modal-overlay" onClick={(e) => e.target === e.currentTarget && closeModal()}>
          <div className="pin-modal">
            <h2><span>{t('enter_pin')}</span> - <span>{selectedStudent.name}</span></h2>
            <p className="pin-hint">{t('pin_to_unlock')}</p>
            <form onSubmit={handlePinSubmit}>
              <input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={8}
                placeholder="••••"
                autoComplete="off"
                autoFocus
                aria-label="PIN"
              />
              {pinError && <p className="pin-error">{pinError}</p>}
              <div className="pin-modal-actions">
                <button type="button" className="btn-cancel" onClick={closeModal}>
                  {t('cancel')}
                </button>
                <button type="submit" className="btn-confirm">
                  <i className="fas fa-unlock"></i> <span>{t('unlock')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
