'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { jsPDF } from 'jspdf';
import { useAuth } from '@/lib/auth-context';
import {
  useStudents,
  useTasks,
  useMessages,
  useSubmittedDocuments,
  useQuizzes,
  useQuizResults
} from '@/hooks/useFirestore';
import { useTranslation } from '@/hooks/useTranslation';
import { storage } from '@/lib/firebase';
import StudentSidebar from '@/components/student/StudentSidebar';
import type { MessageCategory } from '@/lib/types';
import '@/styles/student.css';
import '@/styles/messaging.css';
type SubmittedDocumentLike = {
  id: string;
  studentId: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  uploadedAt?: string;
  fileUrl?: string;
  downloadURL?: string;
  forReview?: boolean;
  markedForReview?: boolean;
  category?: MessageCategory;
};

type UploadDraft = {
  files: File[];
  title: string;
};

type SingleImageChoice = {
  file: File;
  title: string;
};

function normalizeTaskType(type: string) {
  return type === 'one-time' ? 'onetime' : type;
}

function formatFileSize(bytes?: number) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

import {
  formatDateDisplay,
  formatDateDisplayDayOnly,
  formatDateDisplayShort,
  getUseHijri,
  setUseHijri as setUseHijriPreference
} from '@/lib/date-format';

function formatShortDate(iso?: string, useHijri?: boolean) {
  if (!iso) return '';
  return formatDateDisplayShort(iso, useHijri) || new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function getLastDays(days: number) {
  return Array.from({ length: days }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (days - 1 - index));
    return date;
  });
}

const STUDENT_SECTIONS = ['today', 'tasks', 'exams', 'messages', 'records', 'profile'] as const;

function StudentDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isLoggedIn, role, studentId, currentStudent, logout, isLoading: authLoading } = useAuth();
  const { t, lang, changeLang } = useTranslation();

  const { data: students, updateItem: updateStudent } = useStudents();
  const { data: tasks, loading: tasksLoading, updateItem: updateTask } = useTasks();
  const { data: messages, loading: messagesLoading, addItem: addMessage, updateItem: updateMessage } = useMessages();

  const {
    data: submittedDocumentsData,
    loading: documentsLoading,
    addItem: addSubmittedDocument,
    updateItem: updateSubmittedDocument,
    deleteItem: deleteSubmittedDocument
  } = useSubmittedDocuments();

  const { data: quizzes } = useQuizzes();
  const { data: quizResults } = useQuizResults();

  const submittedDocuments = (submittedDocumentsData as SubmittedDocumentLike[]) || [];

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const sectionFromUrl = searchParams.get('section');
  const validSection = sectionFromUrl === 'documents' ? 'messages' : (sectionFromUrl && STUDENT_SECTIONS.includes(sectionFromUrl as any) ? sectionFromUrl : 'today');
  const [activeSection, setActiveSection] = useState(validSection);

  useEffect(() => {
    if (sectionFromUrl === 'documents') {
      setActiveSection('messages');
      setFilterByCategory('documents_only');
    } else if (sectionFromUrl && STUDENT_SECTIONS.includes(sectionFromUrl as any)) {
      setActiveSection(sectionFromUrl);
      if (sectionFromUrl === 'messages') setFilterByCategory('all');
    }
  }, [sectionFromUrl]);
  const [useHijri, setUseHijri] = useState(false);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [changePinCurrent, setChangePinCurrent] = useState('');
  const [changePinNew, setChangePinNew] = useState('');
  const [changePinConfirm, setChangePinConfirm] = useState('');
  const [changePinSubmitting, setChangePinSubmitting] = useState(false);
  const [messageTabInput, setMessageTabInput] = useState('');
  const [messageTabCategory, setMessageTabCategory] = useState<MessageCategory>('general');
  const [filterByCategory, setFilterByCategory] = useState<MessageCategory | 'all' | 'documents_only'>('all');
  const [documentUploadCategory, setDocumentUploadCategory] = useState<MessageCategory | ''>('');
  const [uploadDraft, setUploadDraft] = useState<UploadDraft | null>(null);
  const [singleImageChoice, setSingleImageChoice] = useState<SingleImageChoice | null>(null);
  const [uploadDialogError, setUploadDialogError] = useState('');
  const [showMessageActions, setShowMessageActions] = useState(false);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const messageTabTextareaRef = useRef<HTMLTextAreaElement>(null);
  const studentDocumentFileInputRef = useRef<HTMLInputElement>(null);
  const studentAdditionalImagesInputRef = useRef<HTMLInputElement>(null);
  const MIN_INPUT_ROWS = 1;
  const EXPANDED_ROWS = 4; /* WhatsApp-style: expand when focused */
  const MAX_INPUT_ROWS = 6;
  const [showDayDetails, setShowDayDetails] = useState(false);
  const [dayDetailsDate, setDayDetailsDate] = useState<string | null>(null);
  const [showOverviewCalendar, setShowOverviewCalendar] = useState(false);

  useEffect(() => {
    setUseHijri(getUseHijri());
  }, []);

  const toggleDateFormat = () => {
    const next = !useHijri;
    setUseHijri(next);
    setUseHijriPreference(next);
  };

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString(lang === 'bn' ? 'bn-BD' : 'en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const getMessageDateLabel = (timestamp: string) => {
    const d = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return t('today');
    if (d.toDateString() === yesterday.toDateString()) return t('yesterday');
    return formatDateDisplay(d.toISOString(), {}, useHijri);
  };

  const sendMessageFromTab = async () => {
    const text = messageTabInput.trim();
    if (!text || !studentId) return;
    await addMessage({
      studentId,
      sender: 'student',
      text,
      timestamp: new Date().toISOString(),
      read: false,
      category: messageTabCategory,
      messageType: 'text'
    });
    setMessageTabInput('');
    setMessageTabCategory('general');
    setShowMessageActions(false);
    if (messageTabTextareaRef.current) messageTabTextareaRef.current.rows = MIN_INPUT_ROWS;
  };

  const handleMessageTabInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value;
    setMessageTabInput(v);
    const ta = e.target;
    ta.rows = MIN_INPUT_ROWS;
    if (!v.trim()) return;
    const lineHeight = typeof getComputedStyle !== 'undefined' && getComputedStyle(ta).lineHeight ? parseInt(getComputedStyle(ta).lineHeight, 10) : 24;
    const rows = Math.min(MAX_INPUT_ROWS, Math.max(EXPANDED_ROWS, Math.ceil(ta.scrollHeight / lineHeight)));
    ta.rows = rows;
  };

  const handleMessageTabInputFocus = () => {
    const ta = messageTabTextareaRef.current;
    if (ta && !messageTabInput.trim()) ta.rows = EXPANDED_ROWS;
  };

  const handleMessageTabInputBlur = () => {
    const ta = messageTabTextareaRef.current;
    if (ta && !messageTabInput.trim()) ta.rows = MIN_INPUT_ROWS;
  };

  const MESSAGE_CATEGORIES: MessageCategory[] = ['general', 'question', 'fortnight_report'];
  const getCategoryLabel = (cat: MessageCategory | undefined) => cat ? t('msg_category_' + cat) : t('msg_category_general');
  const isImageFile = (file: File) => file.type.startsWith('image/');

  const getBaseFileName = (name: string) => name.replace(/\.[^.]+$/, '').trim();

  const buildNamedFileName = (title: string, file: File, forcePdf = false) => {
    const cleaned = title.trim().replace(/[\\/:*?"<>|]/g, ' ').replace(/\s+/g, ' ').trim();
    const extension = forcePdf
      ? 'pdf'
      : (() => {
          const parts = file.name.split('.');
          return parts.length > 1 ? parts.pop() || '' : '';
        })();
    return extension ? `${cleaned}.${extension}` : cleaned;
  };

  const readFileAsDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });

  const loadImageDimensions = (src: string) =>
    new Promise<{ width: number; height: number }>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve({ width: image.naturalWidth || image.width, height: image.naturalHeight || image.height });
      image.onerror = () => reject(new Error('Failed to load image'));
      image.src = src;
    });

  const createPdfFromImages = async (files: File[], title: string) => {
    const pdf = new jsPDF({ unit: 'pt', format: 'a4' });

    for (let index = 0; index < files.length; index += 1) {
      const dataUrl = await readFileAsDataUrl(files[index]);
      const { width, height } = await loadImageDimensions(dataUrl);
      const imageFormat = files[index].type.includes('png') ? 'PNG' : 'JPEG';
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const scale = Math.min(pageWidth / width, pageHeight / height);
      const renderWidth = width * scale;
      const renderHeight = height * scale;
      const x = (pageWidth - renderWidth) / 2;
      const y = (pageHeight - renderHeight) / 2;

      if (index > 0) pdf.addPage();
      pdf.addImage(dataUrl, imageFormat, x, y, renderWidth, renderHeight, undefined, 'FAST');
    }

    const blob = pdf.output('blob');
    return new File([blob], `${title.trim()}.pdf`, { type: 'application/pdf' });
  };

  const resetUploadDraft = () => {
    setUploadDraft(null);
    setSingleImageChoice(null);
    setUploadDialogError('');
  };

  const handleDocumentPickerChange = (fileList?: FileList | null) => {
    const files = Array.from(fileList || []);
    if (files.length === 0) return;
    const defaultTitle =
      files.length === 1
        ? getBaseFileName(files[0].name) || 'document'
        : `${getBaseFileName(files[0].name) || 'submission'} pages`;
    if (files.length === 1 && isImageFile(files[0])) {
      setSingleImageChoice({ file: files[0], title: defaultTitle });
      setUploadDraft(null);
    } else {
      setUploadDraft({ files, title: defaultTitle });
      setSingleImageChoice(null);
    }
    setUploadDialogError('');
  };

  const handleAdditionalImagesChange = (fileList?: FileList | null) => {
    if (!singleImageChoice) return;
    const extraFiles = Array.from(fileList || []).filter(isImageFile);
    if (extraFiles.length === 0) return;
    setUploadDraft({
      files: [singleImageChoice.file, ...extraFiles],
      title: `${singleImageChoice.title} pages`,
    });
    setSingleImageChoice(null);
    setUploadDialogError('');
  };

  const chooseSingleImageUpload = () => {
    if (!singleImageChoice) return;
    setUploadDraft({ files: [singleImageChoice.file], title: singleImageChoice.title });
    setSingleImageChoice(null);
    setUploadDialogError('');
  };

  const chooseMultiImageUpload = () => {
    if (!singleImageChoice) return;
    studentAdditionalImagesInputRef.current?.click();
  };

  const handleMessageCategoryPick = (category: MessageCategory) => {
    setMessageTabCategory(category);
    setShowMessageActions(false);
  };

  const applyMessageFilter = (value: MessageCategory | 'all' | 'documents_only') => {
    setFilterByCategory(value);
    setShowFilterMenu(false);
  };

  const student = currentStudent || students.find((s: any) => s.id === studentId);

  useEffect(() => {
    if (!authLoading && (!isLoggedIn || role !== 'student')) {
      router.push('/');
    }
  }, [authLoading, isLoggedIn, role, router]);

  const myTasks = tasks
    .filter((task: any) => task.assignedTo?.includes(studentId))
    .map((task: any) => ({ ...task, type: normalizeTaskType(task.type) }));

  const dailyTasks = myTasks.filter((task: any) => task.type === 'daily');
  const oneTimeTasks = myTasks.filter((task: any) => task.type === 'onetime');

  const today = new Date().toISOString().split('T')[0];

  const isTaskCompletedOnDate = (task: any, dateString: string) => {
    if (!studentId) return false;
    if (task.type === 'daily') {
      return task.completedBy?.[studentId]?.date === dateString;
    }
    return Boolean(task.completedBy?.[studentId]);
  };

  const isCompletedToday = (task: any) => isTaskCompletedOnDate(task, today);

  const unreadMessages = messages.filter(
    (m: any) => m.studentId === studentId && m.sender === 'teacher' && !m.read
  ).length;

  const myMessages = useMemo(() => {
    return (messages as any[])
      .filter((m: any) => m.studentId === studentId)
      .sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }, [messages, studentId]);

  const messagesTabEndRef = useRef<HTMLDivElement>(null);
  const overviewStripRef = useRef<HTMLDivElement>(null);
  const lastOverviewCellRef = useRef<HTMLButtonElement>(null);
  const hasOpenedMessagesTabRef = useRef(false);

  useEffect(() => {
    if (activeSection !== 'today') return;
    const scrollToToday = () => {
      lastOverviewCellRef.current?.scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'end' });
    };
    scrollToToday();
    const t1 = setTimeout(scrollToToday, 150);
    const t2 = setTimeout(scrollToToday, 400);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [activeSection]);

  useEffect(() => {
    if (activeSection === 'messages' && studentId) {
      (messages as any[])
        .filter((m: any) => m.studentId === studentId && m.sender === 'teacher' && !m.read)
        .forEach((m: any) => updateMessage(m.id, { read: true }));
    }
  }, [activeSection, studentId, messages, updateMessage]);

  const myDocuments = useMemo(() => {
    return submittedDocuments
      .filter((doc) => String(doc.studentId) === String(studentId))
      .sort((a, b) => new Date(b.uploadedAt || 0).getTime() - new Date(a.uploadedAt || 0).getTime());
  }, [studentId, submittedDocuments]);

  const combinedTimeline = useMemo(() => {
    if (!studentId) return [];
    return [
      ...myMessages.map((m: any) => ({ type: 'message' as const, ...m, _sort: m.timestamp })),
      ...myDocuments.map((d: SubmittedDocumentLike) => ({ type: 'document' as const, ...d, _sort: d.uploadedAt || '' })),
    ].sort((a, b) => new Date(a._sort).getTime() - new Date(b._sort).getTime());
  }, [studentId, myMessages, myDocuments]);

  const displayedTimeline = useMemo(() => {
    if (filterByCategory === 'all') return combinedTimeline;
    if (filterByCategory === 'documents_only') return combinedTimeline.filter((i) => i.type === 'document');
    return combinedTimeline.filter((i) => (i.category ?? 'general') === filterByCategory);
  }, [combinedTimeline, filterByCategory]);

  useEffect(() => {
    if (activeSection !== 'messages') {
      hasOpenedMessagesTabRef.current = false;
    }
  }, [activeSection]);

  useEffect(() => {
    if (activeSection !== 'messages' || !messagesTabEndRef.current) return;
    messagesTabEndRef.current?.scrollIntoView({
      behavior: hasOpenedMessagesTabRef.current ? 'smooth' : 'auto',
      block: 'end',
    });
    hasOpenedMessagesTabRef.current = true;
  }, [activeSection, displayedTimeline]);

  const myQuizResults = useMemo(() => {
    return quizResults.filter((result: any) => String(result.studentId) === String(studentId));
  }, [quizResults, studentId]);

  const examAverage = myQuizResults.length
    ? Math.round(myQuizResults.reduce((sum: number, result: any) => sum + (result.percentage || 0), 0) / myQuizResults.length)
    : 0;

  const passedQuizzes = myQuizResults.filter((result: any) => result.passed).length;

  const getDailyCompletionForDate = (dateString: string) => {
    if (dailyTasks.length === 0) return 0;
    const completed = dailyTasks.filter((task: any) => task.completedBy?.[studentId!]?.date === dateString).length;
    return Math.round((completed / dailyTasks.length) * 100);
  };

  const getDayDetailsForDate = (dateString: string) => {
    const total = dailyTasks.length;
    const taskList = dailyTasks.map((task: any) => ({
      title: task.title,
      completed: task.completedBy?.[studentId!]?.date === dateString
    }));
    const completed = taskList.filter((t) => t.completed).length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { percentage, completed, total, tasks: taskList };
  };

  const openDayDetails = (dateStr: string) => {
    setDayDetailsDate(dateStr);
    setShowDayDetails(true);
  };

  const overviewDates = getLastDays(30);
  const averageCompletion = overviewDates.length
    ? Math.round(overviewDates.reduce((sum, date) => sum + getDailyCompletionForDate(date.toISOString().split('T')[0]), 0) / overviewDates.length)
    : 0;

  const lastSevenDays = getLastDays(7).map((date) => date.toISOString().split('T')[0]);

  const handleTaskToggle = async (task: any) => {
    if (!studentId) return;

    const completedBy = { ...(task.completedBy || {}) };

    if (isCompletedToday(task)) {
      delete completedBy[studentId];
    } else {
      completedBy[studentId] = {
        date: today,
        completedAt: new Date().toISOString()
      };
    }

    await updateTask(task.id, { completedBy });
  };

  const handleDocumentUpload = async (file?: File, categoryOverride?: MessageCategory | '') => {
    if (!file || !studentId) return;
    const category = categoryOverride ?? documentUploadCategory;
    if (!category) {
      alert(t('select_document_category'));
      return;
    }

    setUploadingDocument(true);

    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const path = `documents/${studentId}/${Date.now()}_${safeName}`;
      const fileRef = ref(storage, path);
      await uploadBytes(fileRef, file);
      const fileUrl = await getDownloadURL(fileRef);

      await addSubmittedDocument({
        studentId,
        studentName: student?.name || '',
        fileName: file.name,
        title: getBaseFileName(file.name),
        fileType: file.type || '',
        mimeType: file.type || '',
        fileSize: file.size,
        fileUrl,
        downloadURL: fileUrl,
        forReview: false,
        markedForReview: false,
        category,
        uploadedAt: new Date().toISOString()
      });
    } catch (error) {
      alert(t('upload_failed'));
    } finally {
      setUploadingDocument(false);
    }
  };

  const confirmDocumentUpload = async () => {
    if (!uploadDraft) {
      setUploadDialogError(t('upload_choose_file_first'));
      return;
    }

    const title = uploadDraft.title.trim();
    if (!title) {
      setUploadDialogError(t('upload_title_required'));
      return;
    }

    const files = uploadDraft.files;
    const allImages = files.every(isImageFile);
    if (files.length > 1 && !allImages) {
      setUploadDialogError(t('upload_dialog_invalid_mix'));
      return;
    }

    try {
      let uploadFile: File;
      if (files.length > 1 && allImages) {
        uploadFile = await createPdfFromImages(files, title);
      } else {
        const sourceFile = files[0];
        uploadFile = new File([sourceFile], buildNamedFileName(title, sourceFile), {
          type: sourceFile.type || undefined,
          lastModified: sourceFile.lastModified,
        });
      }

      await handleDocumentUpload(uploadFile, messageTabCategory);
      resetUploadDraft();
    } catch (error) {
      setUploadDialogError(t('upload_failed'));
    }
  };

  const handleToggleDocumentReview = async (doc: SubmittedDocumentLike, checked: boolean) => {
    await updateSubmittedDocument(doc.id, {
      forReview: checked,
      markedForReview: checked
    });
  };

  const handleRemoveDocument = async (docId: string) => {
    if (!confirm(t('confirm_remove_document'))) {
      return;
    }
    await deleteSubmittedDocument(docId);
  };

  const handleChangePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId || !student) return;
    const currentPin = changePinCurrent.trim();
    const newPin = changePinNew.trim();
    const confirmPin = changePinConfirm.trim();
    if (newPin.length < 4 || newPin.length > 8) {
      alert(t('alert_pin_required') || 'Please enter a 4–8 digit PIN.');
      return;
    }
    if (newPin !== confirmPin) {
      alert(t('alert_pin_mismatch') || 'New PIN and confirmation do not match.');
      return;
    }
    const storedPin = (student.pin ?? '').toString().trim() || '1234';
    if (currentPin !== storedPin) {
      alert(t('alert_wrong_current_pin') || 'Current PIN is incorrect.');
      return;
    }
    setChangePinSubmitting(true);
    try {
      await updateStudent(student.id, {
        pin: newPin,
        pinSetAt: new Date().toISOString(),
        pinSetBy: 'student'
      });
      setChangePinCurrent('');
      setChangePinNew('');
      setChangePinConfirm('');
      alert(t('alert_pin_updated') || 'PIN updated successfully!');
    } catch {
      alert(t('login_error') || 'Failed to update PIN.');
    } finally {
      setChangePinSubmitting(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  const handleSectionChange = (section: string) => {
    setActiveSection(section);
    setSidebarOpen(false);
    const url = `/student/dashboard${section === 'today' ? '' : `?section=${section}`}`;
    if (typeof window !== 'undefined' && window.location.pathname === '/student/dashboard') {
      window.history.replaceState(null, '', url);
    }
  };

  if (authLoading) {
    return <div className="loading-state"><i className="fas fa-spinner fa-spin"></i></div>;
  }

  if (!isLoggedIn || role !== 'student') {
    return null;
  }

  const loading = tasksLoading || messagesLoading || documentsLoading;

  return (
    <div className="student-dashboard-container">
      <div className={`sidebar-backdrop ${sidebarOpen ? 'active' : ''}`} onClick={() => setSidebarOpen(false)} aria-hidden="true"></div>

      <StudentSidebar
        activeSection={activeSection}
        onSectionChange={handleSectionChange}
        unreadMessages={unreadMessages}
        t={t}
        lang={lang}
        onLangChange={changeLang}
        studentName={student?.name || 'Student'}
        studentEmail={student?.email}
        isOpen={sidebarOpen}
      />

      <main className="student-main-content">
        <header className="student-header">
          <button className="mobile-menu-btn" onClick={toggleSidebar}>
            <i className="fas fa-bars"></i>
          </button>
          <h1 id="studentNameHeader">
            {activeSection === 'today' && `${t('marhaba')}, ${student?.name?.trim() || 'Student'}!`}
            {activeSection === 'tasks' && t('student_nav_tasks')}
            {activeSection === 'exams' && t('student_nav_exams')}
            {activeSection === 'messages' && t('messages_and_documents')}
            {activeSection === 'records' && t('tab_records')}
            {activeSection === 'profile' && t('student_nav_profile')}
          </h1>

          <div className="student-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div className="lang-switcher lang-switcher-compact lang-switcher-header" aria-label="Language">
              <button
                type="button"
                className={`lang-btn ${lang === 'en' ? 'active' : ''}`}
                onClick={() => changeLang('en')}
                title="English"
              >
                EN
              </button>
              <button
                type="button"
                className={`lang-btn ${lang === 'bn' ? 'active' : ''}`}
                onClick={() => changeLang('bn')}
                title={t('lang_bengali')}
              >
                {t('lang_short_bn')}
              </button>
            </div>

            <div className="date-format-toggle">
              <button
                type="button"
                className={`date-format-btn ${useHijri ? 'active' : ''}`}
                onClick={toggleDateFormat}
                title="Toggle date format: Hijri (Islamic) / Gregorian"
                aria-label="Toggle date format"
              >
                Date {useHijri ? 'Hijri' : 'Greg'}
              </button>
            </div>

            <a
              href="#"
              className="btn-secondary btn-logout-header"
              onClick={(e) => {
                e.preventDefault();
                handleLogout();
              }}
            >
              <i className="fas fa-sign-out-alt"></i>
              <span>{t('logout')}</span>
            </a>
          </div>
        </header>

        <div className="tab-wrap-student student-content">
          <input type="radio" name="student-tab" id="tab-today" checked={activeSection === 'today'} readOnly />
          <input type="radio" name="student-tab" id="tab-tasks" checked={activeSection === 'tasks'} readOnly />
          <input type="radio" name="student-tab" id="tab-exams" checked={activeSection === 'exams'} readOnly />
          <input type="radio" name="student-tab" id="tab-messages" checked={activeSection === 'messages'} readOnly />
          <input type="radio" name="student-tab" id="tab-records" checked={activeSection === 'records'} readOnly />
          <input type="radio" name="student-tab" id="tab-profile" checked={activeSection === 'profile'} readOnly />

          <div className="tab-labels-student tab-labels-desktop">
            <label htmlFor="tab-today" className="student-tab-label" onClick={() => handleSectionChange('today')}>
              <i className="fas fa-calendar-day"></i>
              <span>{t('today')}</span>
            </label>
            <label htmlFor="tab-tasks" className="student-tab-label" onClick={() => handleSectionChange('tasks')}>
              <i className="fas fa-clipboard-list"></i>
              <span>{t('tasks')}</span>
            </label>
            <label htmlFor="tab-exams" className="student-tab-label" onClick={() => handleSectionChange('exams')}>
              <i className="fas fa-graduation-cap"></i>
              <span>{t('nav_exams')}</span>
            </label>
            <label htmlFor="tab-messages" className="student-tab-label" onClick={() => handleSectionChange('messages')}>
              <i className="fas fa-comments"></i>
              <span>{t('messages_and_documents')}</span>
              {unreadMessages > 0 && <span id="msgUnreadDot" className="tab-unread-dot" style={{ display: 'block' }}></span>}
            </label>
            <label htmlFor="tab-records" className="student-tab-label" onClick={() => handleSectionChange('records')}>
              <i className="fas fa-history"></i>
              <span>{t('tab_records')}</span>
            </label>
            <label htmlFor="tab-profile" className="student-tab-label" onClick={() => handleSectionChange('profile')}>
              <i className="fas fa-user"></i>
              <span>{t('profile')}</span>
            </label>
          </div>

          <div className="panels-student">
          {activeSection === 'today' && (
            <section className="panel-student panel-today">
              <div className="stat-cards-row">
                <div className="stat-card stat-card-daily">
                  <div className="stat-card-header">
                    <i className="fas fa-calendar-day"></i>
                    <span>{t('tab_daily')}</span>
                  </div>
                  <div className="stat-card-percentage">
                    {dailyTasks.length > 0
                      ? Math.round((dailyTasks.filter((task: any) => isCompletedToday(task)).length / dailyTasks.length) * 100)
                      : 0}%
                  </div>
                  <div className="stat-card-progress">
                    <div
                      className="stat-card-progress-fill daily-fill"
                      style={{
                        width: `${dailyTasks.length > 0
                          ? Math.round((dailyTasks.filter((task: any) => isCompletedToday(task)).length / dailyTasks.length) * 100)
                          : 0}%`
                      }}
                    ></div>
                  </div>
                  <div className="stat-card-detail">
                    <i className="fas fa-check"></i>
                    <span>
                      <strong>{dailyTasks.filter((task: any) => isCompletedToday(task)).length}</strong>/{dailyTasks.length}
                    </span>
                    <span className="stat-label">{t('todays_completion')}</span>
                  </div>
                </div>

                <div className="stat-card stat-card-onetime">
                  <div className="stat-card-header">
                    <i className="fas fa-tasks"></i>
                    <span>{t('category_onetime')}</span>
                  </div>
                  <div className="stat-card-percentage">
                    {oneTimeTasks.length > 0
                      ? Math.round((oneTimeTasks.filter((task: any) => isCompletedToday(task)).length / oneTimeTasks.length) * 100)
                      : 0}%
                  </div>
                  <div className="stat-card-progress">
                    <div
                      className="stat-card-progress-fill onetime-fill"
                      style={{
                        width: `${oneTimeTasks.length > 0
                          ? Math.round((oneTimeTasks.filter((task: any) => isCompletedToday(task)).length / oneTimeTasks.length) * 100)
                          : 0}%`
                      }}
                    ></div>
                  </div>
                  <div className="stat-card-detail">
                    <i className="fas fa-check-double"></i>
                    <span>
                      <strong>{oneTimeTasks.filter((task: any) => isCompletedToday(task)).length}</strong>/{oneTimeTasks.length}
                    </span>
                    <span className="stat-label">{t('overall_completion')}</span>
                  </div>
                </div>

                <div className="stat-card stat-card-exam">
                  <div className="stat-card-header">
                    <i className="fas fa-graduation-cap"></i>
                    <span>{t('nav_exams')}</span>
                  </div>
                  <div className="stat-card-percentage">{examAverage}%</div>
                  <div className="stat-card-progress">
                    <div className="stat-card-progress-fill exam-fill" style={{ width: `${examAverage}%` }}></div>
                  </div>
                  <div className="stat-card-detail">
                    <i className="fas fa-trophy"></i>
                    <span><strong>{passedQuizzes}</strong>/{myQuizResults.length}</span>
                    <span className="stat-label">{t('passed_quizzes')}</span>
                  </div>
                </div>
              </div>

              <div className="overview-compact-card" id="overviewSection">
                <div
                  className="overview-compact-header"
                  id="overviewHeader"
                  role="button"
                  tabIndex={0}
                  aria-label="View full calendar"
                  onClick={() => setShowOverviewCalendar(true)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setShowOverviewCalendar(true); } }}
                >
                  <i className="fas fa-chart-line"></i>
                  <span>{t('overall_overview')}</span>
                  <span className="overview-since" id="overviewSince">
                    {student?.enrollmentDate ? `${t('since')} ${formatDateDisplay(student.enrollmentDate, {}, useHijri)}` : ''}
                  </span>
                  <span className="overview-avg" id="overviewAvgPct">{averageCompletion}% {t('avg')}</span>
                </div>
                <div
                  ref={overviewStripRef}
                  className="overview-compact-strip"
                  id="overviewStrip"
                  role="button"
                  tabIndex={0}
                  aria-label="View full calendar"
                  onClick={(e) => { if (!(e.target as HTMLElement).closest('.overview-cell')) setShowOverviewCalendar(true); }}
                  onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && !(e.target as HTMLElement).closest('.overview-cell')) { e.preventDefault(); setShowOverviewCalendar(true); } }}
                >
                  <div className="overview-strip-cells" id="overviewHistoryScroll">
                    {overviewDates.map((date, index) => {
                      const dateStr = date.toISOString().split('T')[0];
                      const pct = getDailyCompletionForDate(dateStr);
                      const isToday = dateStr === today;
                      const colorClass = pct >= 80 ? 'ov-green' : pct >= 40 ? 'ov-yellow' : 'ov-red';
                      const isLast = index === overviewDates.length - 1;

                      return (
                        <button
                          key={dateStr}
                          ref={isLast ? lastOverviewCellRef : undefined}
                          type="button"
                          className={`overview-cell ${colorClass} ${isToday ? 'today' : ''}`}
                          title={formatDateDisplay(date, {}, useHijri)}
                          onClick={(e) => { e.stopPropagation(); openDayDetails(dateStr); }}
                        >
                          <span className="overview-cell-date">{formatDateDisplayDayOnly(date, useHijri)}</span>
                          <span className="overview-cell-pct">{pct}%</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="tasks-section daily-tasks-section">
                <div className="section-title">
                  <i className="fas fa-calendar-day"></i>
                  <span>{t('todays_daily_tasks')}</span>
                  <span className="today-date" id="todayDate">{formatDateDisplay(new Date(), { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }, useHijri)}</span>
                </div>
                <div className="tasks-list daily-tasks-list">
                  {loading ? (
                    <p className="empty-state">{t('loading')}</p>
                  ) : dailyTasks.length === 0 ? (
                    <p className="empty-state">{t('no_daily_tasks')}</p>
                  ) : (
                    dailyTasks.map((task: any) => (
                      <div
                        key={task.id}
                        className={`task-card ${isCompletedToday(task) ? 'completed' : ''}`}
                        onClick={() => handleTaskToggle(task)}
                      >
                        <div className="task-checkbox">
                          {isCompletedToday(task) ? (
                            <i className="fas fa-check-circle"></i>
                          ) : (
                            <i className="far fa-circle"></i>
                          )}
                        </div>
                        <div className="task-content">
                          <h3>{task.title}</h3>
                          {task.description && <p>{task.description}</p>}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </section>
          )}

          {activeSection === 'tasks' && (
            <section className="panel-student panel-tasks tasks-section">
              <div className="tasks-section" style={{ marginBottom: '2rem' }}>
                <div className="section-title">
                  <i className="fas fa-clipboard-list"></i>
                  <span>{t('pending_tasks')}</span>
                </div>
                {loading ? (
                  <p className="empty-state">{t('loading')}</p>
                ) : (() => {
                  const pending = myTasks.filter((task: any) => !(task.type === 'daily' ? isCompletedToday(task) : (studentId && task.completedBy?.[studentId])));
                  if (pending.length === 0) return <p className="empty-state">{t('no_pending_tasks')}</p>;
                  return (
                    <div className="tasks-list">
                      {pending.map((task: any) => (
                        <div
                          key={task.id}
                          className="task-card"
                          onClick={() => handleTaskToggle(task)}
                        >
                          <div className="task-checkbox">
                            <i className="far fa-circle"></i>
                          </div>
                          <div className="task-content">
                            <h3>{task.title}</h3>
                            {task.description && <p>{task.description}</p>}
                            {task.deadline && (
                              <span className="task-deadline">
                                <i className="fas fa-clock"></i> {task.deadline}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
              <div className="tasks-section">
                <div className="section-title">
                  <i className="fas fa-check-circle"></i>
                  <span>{t('completed_tasks')}</span>
                </div>
                {(() => {
                  const completed = myTasks.filter((task: any) => task.type === 'daily' ? isCompletedToday(task) : (studentId && task.completedBy?.[studentId]));
                  if (completed.length === 0) return <p className="empty-state">{t('no_completed_tasks')}</p>;
                  return (
                    <div className="tasks-list">
                      {completed.map((task: any) => (
                        <div key={task.id} className="task-card completed">
                          <div className="task-checkbox">
                            <i className="fas fa-check-circle"></i>
                          </div>
                          <div className="task-content">
                            <h3>{task.title}</h3>
                            {task.description && <p>{task.description}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </section>
          )}

          {activeSection === 'exams' && (
            <section className="panel-student panel-exams exams-section">
              <div className="tasks-section" style={{ marginBottom: '2rem' }}>
                <div className="section-title">
                  <i className="fas fa-clipboard-check"></i>
                  <span>{t('available_quizzes')}</span>
                </div>
                <div className="quizzes-list-student">
                  {(() => {
                    const completedQuizIds = new Set(myQuizResults.map((r: any) => r.quizId));
                    const available = (quizzes || []).filter((q: any) => q.assignedTo?.includes(studentId) && !completedQuizIds.has(q.id));
                    if (available.length === 0) {
                      return <p className="empty-state">{t('no_available_exams')}</p>;
                    }
                    return available.map((quiz: any) => (
                      <div key={quiz.id} className="quiz-card-student">
                        <div className="quiz-card-student-info">
                          <h4>{quiz.title}</h4>
                          {quiz.subject && <span className="quiz-subject">{quiz.subject}</span>}
                          {quiz.timeLimit && <span><i className="fas fa-clock"></i> {quiz.timeLimit} min</span>}
                        </div>
                        <button type="button" className="btn-primary btn-sm" onClick={() => router.push('/student/exams')}>
                          <i className="fas fa-play"></i> {t('take_exam')}
                        </button>
                      </div>
                    ));
                  })()}
                </div>
              </div>
              <div className="tasks-section">
                <div className="section-title">
                  <i className="fas fa-trophy"></i>
                  <span>{t('completed_quizzes')}</span>
                </div>
                <div className="quizzes-list-student">
                  {myQuizResults.length === 0 ? (
                    <p className="empty-state">{t('no_completed_exams')}</p>
                  ) : (
                    myQuizResults.map((result: any) => {
                      const quiz = (quizzes || []).find((q: any) => q.id === result.quizId);
                      return (
                        <div key={result.id} className={`quiz-card-student result ${result.passed ? 'passed' : 'failed'}`}>
                          <div className="quiz-card-student-info">
                            <h4>{quiz?.title || t('unknown_quiz')}</h4>
                            <span className="result-date">{formatDateDisplay(result.submittedAt, {}, useHijri)}</span>
                          </div>
                          <div className="quiz-score-badge">
                            <span className="percentage">{result.percentage}%</span>
                            <span className="raw">{result.score}/{result.totalMarks}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
              <button className="btn-secondary" onClick={() => router.push('/student/exams')} style={{ marginTop: '1rem' }}>
                <i className="fas fa-external-link-alt"></i> {t('view_all')} {t('exams')}
              </button>
            </section>
          )}

          {activeSection === 'messages' && (
            <section className="panel-student panel-messages panel-messages-documents">
              <div className="student-messages-toolbar" data-testid="student-message-category-filter">
                <span className="student-messages-toolbar-label">
                  {filterByCategory === 'all'
                    ? t('all_categories')
                    : filterByCategory === 'documents_only'
                      ? (t('documents_only') || 'Documents')
                      : getCategoryLabel(filterByCategory)}
                </span>
                <div className="message-filter-menu-wrap">
                  <button
                    type="button"
                    className={`message-filter-menu-btn ${filterByCategory !== 'all' ? 'active' : ''}`}
                    onClick={() => setShowFilterMenu((prev) => !prev)}
                    aria-label={t('filter_by_category')}
                  >
                    <i className="fas fa-bars"></i>
                  </button>
                  {showFilterMenu && (
                    <div className="message-filter-menu-popover">
                      <button
                        type="button"
                        className={`message-filter-menu-item ${filterByCategory === 'all' ? 'active' : ''}`}
                        onClick={() => applyMessageFilter('all')}
                      >
                        {t('all_categories')}
                      </button>
                      {MESSAGE_CATEGORIES.map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          className={`message-filter-menu-item ${filterByCategory === cat ? 'active' : ''}`}
                          onClick={() => applyMessageFilter(cat)}
                        >
                          {getCategoryLabel(cat)}
                        </button>
                      ))}
                      <button
                        type="button"
                        className={`message-filter-menu-item ${filterByCategory === 'documents_only' ? 'active' : ''}`}
                        onClick={() => applyMessageFilter('documents_only')}
                      >
                        {t('documents_only') || 'Documents'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="messages-tab-area" id="messagesTabArea">
                {messagesLoading || documentsLoading ? (
                  <div className="loading-state">
                    <i className="fas fa-spinner fa-spin"></i>
                    <p>{t('loading')}</p>
                  </div>
                ) : combinedTimeline.length === 0 ? (
                  <div className="no-messages-placeholder">
                    <i className="fas fa-comments"></i>
                    <p>{t('no_messages_yet')}</p>
                    <span>{t('send_message_to_teacher')}</span>
                  </div>
                ) : displayedTimeline.length === 0 ? (
                  <div className="no-messages-placeholder">
                    <i className="fas fa-filter"></i>
                    <p>{t('no_messages_yet')}</p>
                    <span>{t('filter_by_category')}</span>
                  </div>
                ) : (
                  <>
                    {filterByCategory !== 'all' ? (
                      <div className="timeline-filter-indicator" title={filterByCategory === 'documents_only' ? (t('documents_only') || 'Documents') : getCategoryLabel(filterByCategory)}>
                        <i className="fas fa-filter"></i>
                        <span>{filterByCategory === 'documents_only' ? (t('documents_only') || 'Documents') : getCategoryLabel(filterByCategory)}</span>
                      </div>
                    ) : null}
                    {displayedTimeline.map((item: any, idx: number) => {
                      if (item.type === 'document') {
                        const fileUrl = item.fileUrl || item.downloadURL;
                        const cat = (item.category ?? 'general') as MessageCategory;
                        return (
                          <div key={`doc-${item.id}`} className="student-doc-bubble-wrap">
                            <div
                              className="msg-bubble sent student-doc-bubble"
                              role={fileUrl ? 'link' : undefined}
                              onClick={() => fileUrl && window.open(fileUrl, '_blank')}
                              title={fileUrl ? t('download') : t('no_file_url')}
                            >
                              <span className="student-doc-bubble-icon"><i className="fas fa-file-alt"></i></span>
                              <div className="student-doc-bubble-body">
                                <span className="student-doc-bubble-name">{item.fileName || 'document'}</span>
                                {cat !== 'general' && (
                                  <span className="message-category-badge student-doc-category" title={getCategoryLabel(cat)}>{getCategoryLabel(cat)}</span>
                                )}
                                <span className="student-doc-bubble-time">{item.uploadedAt ? formatMessageTime(item.uploadedAt) : ''}</span>
                              </div>
                              {fileUrl && <span className="student-doc-bubble-dl"><i className="fas fa-download"></i></span>}
                            </div>
                          </div>
                        );
                      }
                      const prev = displayedTimeline[idx - 1];
                      const prevSort = prev ? (prev.timestamp || (prev as any).uploadedAt) : '';
                      const prevDateKey = prevSort ? new Date(prevSort).toISOString().slice(0, 10) : '';
                      const thisDateKey = new Date(item.timestamp).toISOString().slice(0, 10);
                      const showDateSep = prevDateKey !== thisDateKey;
                      const isSent = String(item.sender || '').toLowerCase() === 'student';
                      const cat = (item.category ?? 'general') as MessageCategory;
                      return (
                        <div key={item.id}>
                          {showDateSep && (
                            <div className="msg-date-sep">{getMessageDateLabel(item.timestamp)}</div>
                          )}
                          <div className={`msg-bubble ${isSent ? 'sent' : 'received'}`}>
                            {cat !== 'general' && (
                              <span className="message-category-badge" title={getCategoryLabel(cat)}>{getCategoryLabel(cat)}</span>
                            )}
                            <div className="msg-text">{(item.text ?? item.message ?? '').toString()}</div>
                            <div className="msg-time">{formatMessageTime(item.timestamp)}</div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesTabEndRef} />
                  </>
                )}
              </div>

              <div className="messages-tab-input message-input-single-box">
                {showMessageActions && (
                  <div className="student-message-actions-tray">
                    <div className="student-message-actions-title">{t('message_category')}</div>
                    <div className="student-message-actions-categories">
                      {MESSAGE_CATEGORIES.map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          className={`student-message-category-chip ${messageTabCategory === cat ? 'active' : ''}`}
                          onClick={() => handleMessageCategoryPick(cat)}
                        >
                          {getCategoryLabel(cat)}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      className="student-message-upload-trigger"
                      onClick={() => {
                        setShowMessageActions(false);
                        studentDocumentFileInputRef.current?.click();
                      }}
                      disabled={uploadingDocument}
                    >
                      <i className="fas fa-file-upload"></i>
                      <span>{t('upload_document') || 'Upload document'}</span>
                    </button>
                  </div>
                )}
                <div className="message-input-single-box-inner">
                  <textarea
                    ref={messageTabTextareaRef}
                    className="prototype-textarea message-input-text-in-box"
                    id="messageInputTab"
                    placeholder={t('type_message')}
                    value={messageTabInput}
                    onChange={handleMessageTabInputChange}
                    onFocus={handleMessageTabInputFocus}
                    onBlur={handleMessageTabInputBlur}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessageFromTab();
                      }
                    }}
                    rows={MIN_INPUT_ROWS}
                    aria-label={t('type_message')}
                    data-testid="student-dashboard-message-input"
                  />
                  <button
                    type="button"
                    className={`btn-primary message-action-btn-in-box ${showMessageActions || messageTabCategory !== 'general' ? 'active' : ''}`}
                    onClick={() => setShowMessageActions((prev) => !prev)}
                    disabled={uploadingDocument}
                    title={t('message_category')}
                  >
                    <i className="fas fa-plus"></i>
                  </button>
                  <button
                    id="messageSendBtnTab"
                    type="button"
                    className="btn-primary message-action-btn-in-box"
                    onClick={() => sendMessageFromTab()}
                    disabled={!messageTabInput.trim()}
                    title={t('send')}
                    aria-label={t('send')}
                  >
                    <i className="fas fa-paper-plane"></i>
                  </button>
                </div>
                <div className="student-file-input-wrapper" aria-hidden>
                  <input
                    ref={studentDocumentFileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif"
                    multiple
                    className="student-dashboard-file-input"
                    aria-label="Choose file"
                    onChange={(e) => {
                      handleDocumentPickerChange(e.target.files);
                      e.currentTarget.value = '';
                    }}
                  />
                  <input
                    ref={studentAdditionalImagesInputRef}
                    type="file"
                    accept=".jpg,.jpeg,.png,.gif"
                    multiple
                    className="student-dashboard-file-input"
                    aria-label="Choose additional images"
                    onChange={(e) => {
                      handleAdditionalImagesChange(e.target.files);
                      e.currentTarget.value = '';
                    }}
                  />
                </div>
              </div>
            </section>
          )}
          {singleImageChoice && (
            <div className="student-upload-overlay" onClick={() => resetUploadDraft()}>
              <div className="student-upload-modal student-upload-choice-modal" onClick={(e) => e.stopPropagation()}>
                <div className="student-upload-modal-header">
                  <h3>{t('upload_image_choice_title')}</h3>
                  <button type="button" className="student-upload-close" onClick={() => resetUploadDraft()} aria-label={t('cancel')}>
                    <i className="fas fa-times"></i>
                  </button>
                </div>
                <p className="student-upload-hint">{t('upload_image_choice_hint')}</p>
                <div className="student-upload-summary">
                  <strong>{t('upload_dialog_selected_file')}</strong>
                  <span>{singleImageChoice.file.name}</span>
                </div>
                <div className="student-upload-actions student-upload-actions-stacked">
                  <button type="button" className="btn-primary student-upload-confirm" onClick={chooseSingleImageUpload}>
                    <i className="fas fa-image"></i>
                    <span>{t('upload_image_choice_single')}</span>
                  </button>
                  <button type="button" className="btn-secondary student-upload-cancel" onClick={chooseMultiImageUpload}>
                    <i className="fas fa-file-pdf"></i>
                    <span>{t('upload_image_choice_multi')}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
          {uploadDraft && (
            <div className="student-upload-overlay" onClick={() => resetUploadDraft()}>
              <div className="student-upload-modal" onClick={(e) => e.stopPropagation()}>
                <div className="student-upload-modal-header">
                  <h3>{t('upload_dialog_title')}</h3>
                  <button type="button" className="student-upload-close" onClick={() => resetUploadDraft()} aria-label={t('cancel')}>
                    <i className="fas fa-times"></i>
                  </button>
                </div>
                <p className="student-upload-hint">
                  {uploadDraft.files.length > 1 && uploadDraft.files.every((file) => file.type.startsWith('image/'))
                    ? t('upload_dialog_hint_multi_image')
                    : t('upload_dialog_hint_single')}
                </p>
                <div className="student-upload-summary">
                  <strong>
                    {uploadDraft.files.length > 1 ? t('upload_dialog_selected_files') : t('upload_dialog_selected_file')}
                  </strong>
                  <span>
                    {uploadDraft.files.length > 1
                      ? `${uploadDraft.files.length} ${t('upload_dialog_files_selected')}`
                      : uploadDraft.files[0]?.name}
                  </span>
                </div>
                <div className="student-upload-files-list">
                  {uploadDraft.files.map((file, index) => (
                    <div key={`${file.name}-${index}`} className="student-upload-file-chip">
                      <i className={`fas ${file.type.startsWith('image/') ? 'fa-image' : 'fa-file-alt'}`}></i>
                      <span>{file.name}</span>
                    </div>
                  ))}
                </div>
                <div className="login-form-group">
                  <label htmlFor="studentUploadTitle">{t('upload_title_label')}</label>
                  <input
                    id="studentUploadTitle"
                    type="text"
                    value={uploadDraft.title}
                    onChange={(e) => {
                      setUploadDraft((current) => current ? { ...current, title: e.target.value } : current);
                      if (uploadDialogError) setUploadDialogError('');
                    }}
                    placeholder={t('upload_title_placeholder')}
                    autoFocus
                  />
                </div>
                {uploadDialogError ? (
                  <p className="login-error" style={{ display: 'block' }}>
                    {uploadDialogError}
                  </p>
                ) : null}
                <div className="student-upload-actions">
                  <button type="button" className="btn-secondary student-upload-cancel" onClick={() => resetUploadDraft()}>
                    {t('cancel')}
                  </button>
                  <button
                    type="button"
                    className="btn-primary student-upload-confirm"
                    onClick={() => void confirmDocumentUpload()}
                    disabled={uploadingDocument}
                  >
                    <i className="fas fa-file-upload"></i>
                    <span>
                      {uploadingDocument
                        ? t('uploading')
                        : uploadDraft.files.length > 1 && uploadDraft.files.every((file) => file.type.startsWith('image/'))
                          ? t('upload_dialog_convert_pdf')
                          : t('upload_dialog_keep_original')}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}
          {activeSection === 'records' && (
            <section className="panel-student panel-records" aria-label={t('tab_records')}>
              <div className="records-container">
                <header className="records-page-header">
                  <h2 className="records-page-title">
                    <i className="fas fa-clipboard-list"></i>
                    <span>{t('tab_records')}</span>
                  </h2>
                  <p className="records-page-subtitle">{t('records_subtitle')}</p>
                </header>

                <div className="records-section records-section-exams">
                  <div className="records-section-header">
                    <i className="fas fa-graduation-cap"></i>
                    <span>{t('exam_history')}</span>
                    {myQuizResults.length > 0 && (
                      <span className="records-section-count">{myQuizResults.length}</span>
                    )}
                  </div>

                  {myQuizResults.length === 0 ? (
                    <div className="records-empty records-empty-exams">
                      <i className="fas fa-file-alt"></i>
                      <p>{t('no_exam_records')}</p>
                      <span className="records-empty-hint">{t('no_exam_records_hint')}</span>
                    </div>
                  ) : (
                    <div className="records-exam-list">
                      {myQuizResults
                        .slice()
                        .sort((a: any, b: any) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
                        .map((result: any) => {
                          const quiz = quizzes.find((item: any) => item.id === result.quizId);
                          const status = result.passed ? 'passed' : 'failed';
                          const pendingReview = (result as any).status === 'pending_review';
                          const timeTaken = (result as any).timeTaken;
                          const pct = result.percentage ?? 0;
                          return (
                            <article key={result.id} className="record-exam-card">
                              <div className="record-exam-card-header">
                                <span className="record-exam-title">{quiz?.title || t('unknown_quiz')}</span>
                                <time className="record-exam-date" dateTime={result.submittedAt}>
                                  {formatShortDate(result.submittedAt, useHijri)}
                                </time>
                              </div>
                              <div className="record-exam-card-body">
                                <div className="record-exam-score-row">
                                  <span className="record-exam-score-value" aria-label={`Score: ${pct}%`}>
                                    <span className={`record-score ${status}`}>{pct}%</span>
                                    <span className="record-score-fraction">{result.score ?? 0}/{result.totalMarks ?? 0}</span>
                                  </span>
                                  <span className={`record-badge ${pendingReview ? 'pending' : status}`}>
                                    {pendingReview ? t('pending_review') : (result.passed ? t('passed') : t('failed'))}
                                  </span>
                                </div>
                                {pct < 100 && (
                                  <div className="record-exam-score-bar" role="presentation">
                                    <div className="record-exam-score-fill" style={{ width: `${Math.min(100, pct)}%` }} data-status={status} />
                                  </div>
                                )}
                                {timeTaken != null && (
                                  <p className="record-exam-meta">
                                    <i className="fas fa-clock"></i>
                                    <span>{typeof timeTaken === 'number' ? `${Math.floor(timeTaken / 60)}m ${timeTaken % 60}s` : timeTaken}</span>
                                  </p>
                                )}
                              </div>
                            </article>
                          );
                        })}
                    </div>
                  )}
                </div>

                <div className="records-section records-section-daily">
                  <div className="records-section-header">
                    <i className="fas fa-calendar-check"></i>
                    <span>{t('daily_completion_history')}</span>
                  </div>

                  {dailyTasks.length === 0 ? (
                    <div className="records-empty records-empty-daily">
                      <i className="fas fa-calendar-day"></i>
                      <p>{t('no_daily_records')}</p>
                      <span className="records-empty-hint">{t('no_daily_records_hint')}</span>
                    </div>
                  ) : (
                    <div className="records-daily-wrap">
                      <div className="records-daily-header-row">
                        <span className="records-daily-header-task">{t('task')}</span>
                        <div className="records-daily-header-days" aria-hidden="true">
                          {lastSevenDays.map((dateString) => {
                            const labelDate = new Date(dateString + 'T12:00:00');
                            const dayName = labelDate.toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-US', { weekday: 'short' });
                            return (
                              <span key={dateString} className="records-daily-day-label" title={formatDateDisplay(labelDate, {}, useHijri)}>
                                {dayName}
                              </span>
                            );
                          })}
                        </div>
                        <span className="records-daily-header-done">{t('done')}</span>
                      </div>
                      {dailyTasks.map((task: any) => {
                        const completedCount = lastSevenDays.filter(
                          (d) => task.completedBy?.[studentId!]?.date === d
                        ).length;
                        return (
                          <div key={task.id} className="record-daily-row">
                            <div className="record-daily-task-name" title={task.title}>{task.title}</div>
                            <div className="record-daily-cells">
                              {lastSevenDays.map((dateString) => {
                                const completed = task.completedBy?.[studentId!]?.date === dateString;
                                const labelDate = new Date(dateString + 'T12:00:00');
                                return (
                                  <span
                                    key={`${task.id}-${dateString}`}
                                    className={`record-day-cell ${completed ? 'completed' : ''}`}
                                    title={formatDateDisplay(labelDate, {}, useHijri)}
                                    aria-label={completed ? t('completed') : t('not_completed')}
                                  >
                                    {completed ? <i className="fas fa-check"></i> : '—'}
                                  </span>
                                );
                              })}
                            </div>
                            <span className="record-daily-count">{completedCount}/7</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

          {activeSection === 'profile' && (
            <section className="panel-student panel-profile profile-section">
              <h3 className="profile-section-title">
                <i className="fas fa-user-circle"></i> <span>{t('student_information')}</span>
              </h3>
              {student && (
                <>
                <div className="profile-info-grid profile-info-student">
                  <div className="profile-info-card">
                    <h4><i className="fas fa-id-card"></i> <span>{t('basic_details')}</span></h4>
                    <div className="profile-info-row">
                      <span className="profile-info-label">{t('student_id')}</span>
                      <span className="profile-info-value">{student.studentId}</span>
                    </div>
                    <div className="profile-info-row">
                      <span className="profile-info-label">{t('date_of_birth')}</span>
                      <span className="profile-info-value">{student.dateOfBirth ? formatDateDisplay(student.dateOfBirth, {}, useHijri) : '-'}</span>
                    </div>
                    <div className="profile-info-row">
                      <span className="profile-info-label">{t('year')}</span>
                      <span className="profile-info-value">{student.enrollmentDate ? (() => {
                        const adm = new Date(student.enrollmentDate);
                        const now = new Date();
                        return `Year ${Math.max(1, now.getFullYear() - adm.getFullYear() + 1)}`;
                      })() : '-'}</span>
                    </div>
                    <div className="profile-info-row">
                      <span className="profile-info-label">{t('admission_date')}</span>
                      <span className="profile-info-value">{student.enrollmentDate ? formatDateDisplay(student.enrollmentDate, {}, useHijri) : '-'}</span>
                    </div>
                  </div>
                  <div className="profile-info-card">
                    <h4><i className="fas fa-address-book"></i> <span>{t('contact_details')}</span></h4>
                    <div className="profile-info-row">
                      <span className="profile-info-label">{t('phone')}</span>
                      <span className="profile-info-value">{student.phone || '-'}</span>
                    </div>
                    <div className="profile-info-row">
                      <span className="profile-info-label">{t('email')}</span>
                      <span className="profile-info-value">{student.email || '-'}</span>
                    </div>
                  </div>
                  <div className="profile-info-card">
                    <h4><i className="fas fa-users"></i> <span>{t('parent_guardian_info')}</span></h4>
                    <div className="profile-info-row">
                      <span className="profile-info-label">{t('name')}</span>
                      <span className="profile-info-value">{(student as any).parentName || '-'}</span>
                    </div>
                    <div className="profile-info-row">
                      <span className="profile-info-label">{t('phone')}</span>
                      <span className="profile-info-value">{(student as any).parentPhone || '-'}</span>
                    </div>
                    <div className="profile-info-row">
                      <span className="profile-info-label">{t('email')}</span>
                      <span className="profile-info-value">{(student as any).parentEmail || '-'}</span>
                    </div>
                    <div className="profile-info-row">
                      <span className="profile-info-label">{t('father_work')}</span>
                      <span className="profile-info-value">{(student as any).fatherWork || '-'}</span>
                    </div>
                  </div>
                  <div className="profile-info-card">
                    <h4><i className="fas fa-map-marker-alt"></i> <span>{t('address')}</span></h4>
                    <div className="profile-info-row">
                      <span className="profile-info-label">{t('district')}</span>
                      <span className="profile-info-value">{(student as any).district || '-'}</span>
                    </div>
                    <div className="profile-info-row">
                      <span className="profile-info-label">{t('upazila')}</span>
                      <span className="profile-info-value">{(student as any).upazila || '-'}</span>
                    </div>
                    <div className="profile-info-row">
                      <span className="profile-info-label">{t('detail_address')}</span>
                      <span className="profile-info-value">{student.address || '-'}</span>
                    </div>
                  </div>
                </div>

                {/* Change PIN Section – match old app */}
                <div className="student-profile-section" style={{ marginTop: '1.5rem' }}>
                  <h3 className="profile-section-title">
                    <i className="fas fa-key"></i> <span>{t('change_pin')}</span>
                  </h3>
                  <form className="change-pin-form" onSubmit={handleChangePin}>
                    <div className="form-group">
                      <label htmlFor="changePinCurrent">
                        <span>{t('old_pin')}</span> <span className="required">*</span>
                      </label>
                      <input
                        type="password"
                        id="changePinCurrent"
                        minLength={4}
                        maxLength={8}
                        value={changePinCurrent}
                        onChange={(e) => setChangePinCurrent(e.target.value)}
                        placeholder={t('placeholder_pin')}
                        autoComplete="current-password"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="changePinNew">
                        <span>{t('new_pin')}</span> <span className="required">*</span>
                      </label>
                      <input
                        type="password"
                        id="changePinNew"
                        minLength={4}
                        maxLength={8}
                        value={changePinNew}
                        onChange={(e) => setChangePinNew(e.target.value)}
                        placeholder={t('placeholder_pin')}
                        autoComplete="new-password"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="changePinConfirm">
                        <span>{t('confirm_pin')}</span> <span className="required">*</span>
                      </label>
                      <input
                        type="password"
                        id="changePinConfirm"
                        minLength={4}
                        maxLength={8}
                        value={changePinConfirm}
                        onChange={(e) => setChangePinConfirm(e.target.value)}
                        placeholder={t('placeholder_pin')}
                        autoComplete="new-password"
                        required
                      />
                    </div>
                    <button type="submit" className="btn-primary" disabled={changePinSubmitting}>
                      <i className="fas fa-save"></i> <span>{t('change_pin')}</span>
                    </button>
                  </form>
                </div>
                </>
              )}
            </section>
          )}
        </div>


        </div>
        <div className="student-bottom-nav-wrapper bottom-nav-wrapper">
          <div className="bottom-nav-fade bottom-nav-fade-left" id="studentNavFadeLeft">
            <i className="fas fa-chevron-left"></i>
          </div>
          <nav id="studentBottomNav" className="bottom-nav" aria-label="Student navigation">
            <button
              className={`bottom-nav-item ${activeSection === 'today' ? 'active' : ''}`}
              onClick={() => handleSectionChange('today')}
            >
              <i className="fas fa-calendar-day"></i>
              <span>{t('today')}</span>
            </button>
            <button
              className={`bottom-nav-item ${activeSection === 'tasks' ? 'active' : ''}`}
              onClick={() => handleSectionChange('tasks')}
            >
              <i className="fas fa-clipboard-list"></i>
              <span>{t('tasks')}</span>
            </button>
            <button
              className={`bottom-nav-item ${activeSection === 'exams' ? 'active' : ''}`}
              onClick={() => router.push('/student/exams')}
            >
              <i className="fas fa-graduation-cap"></i>
              <span>{t('exams')}</span>
            </button>
            <button
              className={`bottom-nav-item ${activeSection === 'messages' ? 'active' : ''}`}
              onClick={() => handleSectionChange('messages')}
            >
              <i className="fas fa-comments"></i>
              <span>{t('messages_and_documents')}</span>
              {unreadMessages > 0 && <span id="msgUnreadDotNav" className="nav-unread-dot" style={{ display: 'block' }}></span>}
            </button>
            <button
              className={`bottom-nav-item ${activeSection === 'records' ? 'active' : ''}`}
              onClick={() => handleSectionChange('records')}
            >
              <i className="fas fa-history"></i>
              <span>{t('tab_records')}</span>
            </button>
            <button
              className={`bottom-nav-item ${activeSection === 'profile' ? 'active' : ''}`}
              onClick={() => handleSectionChange('profile')}
            >
              <i className="fas fa-user"></i>
              <span>{t('profile')}</span>
            </button>
          </nav>
          <div className="bottom-nav-fade bottom-nav-fade-right" id="studentNavFadeRight">
            <i className="fas fa-chevron-right"></i>
          </div>
        </div>
      </main>

      {/* Day details modal (when clicking a date in overview) */}
      {showDayDetails && dayDetailsDate && (() => {
        const details = getDayDetailsForDate(dayDetailsDate);
        const dateObj = new Date(dayDetailsDate + 'T12:00:00');
        const formattedDate = formatDateDisplay(dateObj.toISOString(), { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }, useHijri);
        return (
          <div className="day-details-overlay" role="dialog" aria-modal="true" onClick={() => setShowDayDetails(false)}>
            <div className="day-details-modal" onClick={(e) => e.stopPropagation()}>
              <div className="day-details-header">
                <h2 id="dayDetailsTitle">{formattedDate}</h2>
                <button type="button" className="day-details-close" aria-label="Close" onClick={() => setShowDayDetails(false)}>
                  <i className="fas fa-times"></i>
                </button>
              </div>
              <div className="day-details-body">
                <div className="day-details-summary">
                  <span className="day-details-pct">{details.percentage}%</span> {t('completed')}: <strong>{details.completed}</strong> {t('of')} <strong>{details.total}</strong> {t('daily_tasks')}
                </div>
                <ul className="day-details-tasks">
                  {details.tasks.length === 0 ? (
                    <li className="day-details-empty">{t('no_daily_tasks')}</li>
                  ) : (
                    details.tasks.map((t, i) => (
                      <li key={i} className={`day-details-task ${t.completed ? 'completed' : ''}`}>
                        <i className={`fas ${t.completed ? 'fa-check-circle' : 'fa-circle'}`}></i>
                        <span>{t.title}</span>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Full overview calendar modal (header / strip background click) */}
      {showOverviewCalendar && (
        <div className="overview-calendar-overlay" role="dialog" aria-modal="true" onClick={() => setShowOverviewCalendar(false)}>
          <div className="overview-calendar-modal" onClick={(e) => e.stopPropagation()}>
            <div className="overview-calendar-modal-header">
              <h2 id="overviewCalendarTitle">{t('overall_overview')}</h2>
              <button type="button" className="overview-calendar-close" aria-label="Close" onClick={() => setShowOverviewCalendar(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="overview-calendar-modal-body" id="overviewCalendarBody">
              {(() => {
                const monthYear = (d: Date) => formatDateDisplay(d.toISOString(), { month: 'long', year: '2-digit' }, useHijri);
                const byMonth: { monthKey: string; dates: Date[] }[] = [];
                let current: { monthKey: string; dates: Date[] } | null = null;
                overviewDates.forEach((date) => {
                  const monthKey = monthYear(date);
                  if (!current || current.monthKey !== monthKey) {
                    current = { monthKey, dates: [] };
                    byMonth.push(current);
                  }
                  current.dates.push(date);
                });
                return byMonth.map((group) => (
                  <div key={group.monthKey} className="overview-cal-month">
                    <div className="overview-cal-month-header">{group.monthKey}</div>
                    <div className="overview-cal-grid">
                      {group.dates.map((date) => {
                        const dateStr = date.toISOString().split('T')[0];
                        const pct = getDailyCompletionForDate(dateStr);
                        const colorClass = pct >= 80 ? 'ov-green' : pct >= 40 ? 'ov-yellow' : 'ov-red';
                        return (
                          <button
                            key={dateStr}
                            type="button"
                            className={`overview-cal-cell ${colorClass}`}
                            title={formatDateDisplay(date, {}, useHijri)}
                            onClick={() => { openDayDetails(dateStr); setShowOverviewCalendar(false); }}
                          >
                            <span className="overview-cell-date">{formatDateDisplayDayOnly(date, useHijri)}</span>
                            <span className="overview-cell-pct">{pct}%</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ));
              })()}
            </div>
            <div className="overview-calendar-legend">
              <span><span className="legend-dot ov-red"></span> 0%</span>
              <span><span className="legend-dot ov-yellow"></span> 1-49%</span>
              <span><span className="legend-dot ov-orange"></span> 50-69%</span>
              <span><span className="legend-dot ov-sky"></span> 70-99%</span>
              <span><span className="legend-dot ov-green"></span> 100%</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function StudentDashboard() {
  return (
    <Suspense fallback={<div className="loading-state"><i className="fas fa-spinner fa-spin"></i></div>}>
      <StudentDashboardContent />
    </Suspense>
  );
}







