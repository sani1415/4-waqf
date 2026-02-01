# Product Requirements Document (PRD)
# Waqf Task Manager — Native Android Application

**Version:** 1.0  
**Date:** November 2024  
**Status:** Draft  
**Source Application:** Web-based Task Management System (Waqf)

---

## 1. Executive Summary

This document defines the product requirements for building a **native Android application** that replicates all features of the existing Waqf Task Management web application. The Android app will provide a fully native experience—using Material Design, native components, offline support, push notifications, and platform-specific optimizations—while maintaining full feature parity with the web version.

**Key Objectives:**
- Feature parity with the web application
- Native Android UX following Material Design 3
- Firebase backend compatibility (shared data with web app)
- Offline-first architecture where applicable
- Optimized for mobile workflows (teacher & student)

---

## 2. Product Overview

### 2.1 Purpose
The Waqf Task Manager Android app enables teachers to manage students, assign tasks, conduct exams, and communicate—and enables students to view tasks, complete daily routines, take exams, and chat with teachers. It is designed for Islamic educational institutions (Waqf) but is broadly applicable to any task-based learning environment.

### 2.2 Target Users
| Role | Description | Primary Device |
|------|-------------|----------------|
| **Teacher** | Manages students, tasks, exams; monitors progress; communicates | Tablet / Phone |
| **Student** | Views tasks, marks completion, takes exams, chats | Phone / Tablet |

### 2.3 Success Criteria
- All web app features available in native form
- Sub-second navigation and fluid animations
- Works offline for viewing/caching; syncs when online
- Firebase data shared seamlessly with web app
- App store ready (Play Store policies compliant)

---

## 3. User Roles & Entry Points

### 3.1 Role Selection (Landing)
- **Single screen** with two cards: **Teacher** and **Student**
- Tapping a role navigates to the appropriate flow
- No login required initially (role-based access only; authentication can be added later)

### 3.2 Teacher Flow
```
Landing → Teacher Dashboard
   ├── Dashboard (stats, student progress)
   ├── Manage Tasks (create/view one-time & daily tasks)
   ├── Students (list, add, edit, delete)
   ├── Daily Tasks Overview (table by date)
   ├── Exams (create, view, results, pending reviews)
   ├── Messages (conversation list)
   └── Analytics (completion rates, distribution)
```

### 3.3 Student Flow
```
Landing → Student List (search, select) → Student Dashboard
   ├── Daily Tasks (mark complete)
   ├── One-time Tasks (mark complete)
   ├── Exams (take assigned exams)
   └── Chat (message teacher)
```

---

## 4. Feature Inventory (Web App → Android)

### 4.1 Teacher Features

| # | Feature | Web Location | Android Equivalent | Priority |
|---|---------|--------------|-------------------|----------|
| 1 | **Dashboard** – Stats (students, tasks, completed, pending) | teacher-dashboard.html | Home screen with stat cards | P0 |
| 2 | **Student progress list** – Quick view per student | teacher-dashboard.html | RecyclerView / LazyColumn | P0 |
| 3 | **Create Task** – Title, description, type (one-time/daily), assign, deadline | teacher-dashboard.html | Form screen / Bottom sheet | P0 |
| 4 | **View All Tasks** – Filter (all/one-time/daily), list with actions | teacher-dashboard.html | List screen with filters | P0 |
| 5 | **Manage Students** – Add, edit, delete, view detail | teacher-dashboard.html, teacher-student-detail.html | CRUD screens | P0 |
| 6 | **Daily Overview** – Date selector, best performers, completion table | teacher-dashboard.html, teacher-daily-overview.html | Overview screen | P0 |
| 7 | **Exams** – Create exam (title, subject, questions, time limit, passing %, assign, deadline) | teacher-exams.html | Exam creation wizard | P0 |
| 8 | **View Exams** – List all quizzes | teacher-exams.html | Exam list screen | P0 |
| 9 | **Exam Results & Analytics** – Per-quiz results, scores | teacher-exams.html | Results screen | P0 |
| 10 | **Pending Reviews** – Grade short answer/essay/file upload | teacher-exams.html | Grading screen | P0 |
| 11 | **Messages** – Conversation list, unread badge | teacher-messages.html | Chat list screen | P0 |
| 12 | **Chat** – 1:1 with student (send/receive) | teacher-chat.html | Chat screen | P0 |
| 13 | **Analytics** – Completion rate, task distribution | teacher-dashboard.html | Analytics screen | P1 |
| 14 | **Student Detail** – Profile, notes, quick actions | teacher-student-detail.html | Student profile screen | P0 |
| 15 | **Back to Home** – Return to role selection | Sidebar | Navigation / Back | P0 |

### 4.2 Student Features

| # | Feature | Web Location | Android Equivalent | Priority |
|---|---------|--------------|-------------------|----------|
| 1 | **Student List** – Search, select student | student-list.html | Search + list screen | P0 |
| 2 | **Dashboard** – Daily/one-time progress, exam performance | student-dashboard.html | Dashboard with progress | P0 |
| 3 | **Daily Tasks** – List, mark complete per day | student-dashboard.html | Task list + checkboxes | P0 |
| 4 | **One-time Tasks** – List, mark complete | student-dashboard.html | Task list + checkboxes | P0 |
| 5 | **Take Exam** – MCQ, true/false, fill blank, short answer, essay, file upload | student-exam-take.html | Exam-taking flow | P0 |
| 6 | **Chat** – 1:1 with teacher | student-chat.html | Chat screen | P0 |
| 7 | **Back / Logout** – Return to student list | Sidebar | Navigation | P0 |

### 4.3 Shared / System

| # | Feature | Notes |
|---|---------|------|
| 1 | **Firebase sync** | Real-time data via Firestore |
| 2 | **Offline support** | Cache for read; queue writes when offline |
| 3 | **Push notifications** | New message, new task, exam reminder (future) |

---

## 5. Data Models (Firestore Collections)

Aligned with the web app’s DataManager and Firebase adapter:

| Collection | Key Fields | Notes |
|------------|------------|-------|
| **students** | id, name, email, phone, dateOfBirth, grade, section, studentId, parentName, parentPhone, parentEmail, enrollmentDate, notes[], createdAt, updatedAt | |
| **tasks** | id, title, description, type (one-time/daily), assignedTo[], deadline, completedBy[], dailyCompletions {studentId: [dates]}, createdAt | |
| **messages** | id, studentId, sender (teacher/student), message, timestamp, readBy | |
| **quizzes** | id, title, description, subject, questions[], timeLimit, passingPercentage, assignedTo[], deadline, createdBy, createdAt | |
| **quizResults** | id, quizId, studentId, answers[], score, totalMarks, percentage, status (submitted/pending_review/graded), gradedBy, gradedAt, feedback | |

**Question types:** mcq, true_false, fill_blank, short_answer, essay, file_upload

---

## 6. Technical Architecture (Android)

### 6.1 Recommended Stack
| Layer | Technology |
|-------|------------|
| Language | Kotlin |
| UI | Jetpack Compose (Material 3) |
| Architecture | MVVM + Repository |
| Backend | Firebase (Firestore, Auth optional) |
| DI | Hilt |
| Async | Kotlin Coroutines + Flow |
| Navigation | Compose Navigation |
| Local cache | Room (optional) for offline |

### 6.2 Module Structure
```
app/
├── data/
│   ├── remote/          # Firestore repositories
│   ├── local/           # Room/cache (optional)
│   └── model/           # Data classes
├── domain/
│   └── usecase/         # Business logic
├── presentation/
│   ├── teacher/         # Teacher screens
│   ├── student/         # Student screens
│   └── common/          # Shared UI components
└── di/                  # Hilt modules
```

### 6.3 Firebase Integration
- Use Firestore Android SDK
- Same project/collections as web app
- Real-time listeners for students, tasks, messages, quizzes, quizResults
- Offline persistence enabled in Firestore settings

---

## 7. Screen Specifications (Native Android)

### 7.1 Design Principles
- **Material Design 3** (Material You)
- **Comfortable color palette** (soft blues, purples, greens) matching web
- **Bottom navigation** for main teacher sections (Dashboard, Tasks, Students, Messages, More)
- **Bottom sheet** for create/edit forms where appropriate
- **Swipe gestures** for delete/archive where useful
- **Large touch targets** (min 48dp)
- **Dark/light theme** support

### 7.2 Teacher Screens

| Screen | Layout | Key Components |
|--------|--------|----------------|
| **Landing** | Centered cards | Teacher card, Student card |
| **Teacher Home** | TopAppBar, stat chips, list | Stat cards (4), Student progress RecyclerView |
| **Manage Tasks** | Tabs (Create / View) | Form (Create), Filter chips, Task list (View) |
| **Students** | FAB, list, search | RecyclerView, Student cards, FAB Add |
| **Student Detail** | AppBar, sections, FAB | Profile, Contact, Tasks, Notes, Actions |
| **Daily Overview** | Date picker, table/cards | Date selector, Best performers, Completion list |
| **Exams** | Tabs (Create / All / Results / Pending) | Create wizard, Exam list, Results table, Grading form |
| **Exam Create** | Stepper / wizard | Title, Subject, Questions (add/edit), Settings, Assign |
| **Messages** | List | Chat list with avatar, name, last message, time |
| **Chat** | Messages + input | Message bubbles, TextField, Send FAB |
| **Analytics** | Cards, charts | Completion circle, Task distribution |

### 7.3 Student Screens

| Screen | Layout | Key Components |
|--------|--------|----------------|
| **Student List** | Search, list | SearchBar, Student cards |
| **Student Dashboard** | Sidebar or top tabs | Progress bars, Daily/One-time task lists |
| **Task List** | List with checkboxes | Task items, Checkbox, Completion state |
| **Exam Take** | Full-screen, timer | Question card, Options, Next/Submit, Timer |
| **Exam Result** | Summary card | Score, Pass/Fail, Feedback |
| **Chat** | Same as teacher | Message bubbles, Input |

### 7.4 Navigation Patterns
- **Teacher:** Bottom nav (5 items) + drawer for less-used items
- **Student:** Back-stack navigation from list → dashboard → tasks/exam/chat
- **Deep links:** Support `waqf://teacher/dashboard`, `waqf://student/{id}` for notifications

---

## 8. Component-Level Requirements

### 8.1 Task Management
- Create: Title (required), Description, Type (one-time/daily), Assign (multi-select), Deadline (one-time only)
- View: Filter by all/one-time/daily
- Edit/Delete: Swipe or long-press actions
- Assign: Checkbox list “Assign to all” + individual selection

### 8.2 Student Management
- Add: Full form (name, studentId, DOB, grade, section, contact, parent info, enrollment)
- Edit: Same form, pre-filled
- Delete: Confirmation dialog
- Notes: Add/view notes per student

### 8.3 Exam System
- **Question types:** MCQ, True/False, Fill-in-blank, Short answer, Essay, File upload
- **Auto-grade:** MCQ, True/False, Fill-in-blank
- **Manual grade:** Short answer, Essay, File upload (pending review)
- **Timer:** Per-exam time limit with countdown
- **Submission:** Save progress; submit on completion or time-up
- **Results:** View score, pass/fail, per-question feedback

### 8.4 Messaging
- Real-time message sync
- Unread count badge
- Last message preview
- Timestamp formatting (Today, Yesterday, date)

### 8.5 Daily Tasks
- Per-date completion tracking
- “Mark complete” for today
- Best performers (≥80% completion)
- Overview table: Student × Task grid (card layout on mobile)

---

## 9. Non-Functional Requirements

### 9.1 Performance
- Cold start < 2 seconds
- Screen transitions < 300ms
- List scrolling 60fps
- Firestore reads cached for offline

### 9.2 Accessibility
- TalkBack support
- Min 48dp touch targets
- Sufficient color contrast (WCAG AA)
- Content descriptions for icons

### 9.3 Security
- No sensitive data in logs
- HTTPS for all network calls
- ProGuard/R8 obfuscation for release
- (Future) Firebase Auth for teachers/students

### 9.4 Compatibility
- minSdk 24, targetSdk 34
- Phone and tablet layouts
- Portrait primary; landscape supported

---

## 10. Out of Scope (V1)
- Teacher/student authentication (role selection only in V1)
- Parent portal
- Multi-language (English only in V1)
- In-app analytics/crash reporting (can add later)
- Tablet-optimized layouts (phone-first in V1)

---

## 11. Phased Roadmap

| Phase | Scope | Est. Effort |
|-------|-------|-------------|
| **Phase 1** | Landing, Teacher Dashboard, Manage Tasks, Students, Student Detail | 4–6 weeks |
| **Phase 2** | Daily Overview, Messages, Chat | 2–3 weeks |
| **Phase 3** | Exams (create, take, results, grading) | 4–5 weeks |
| **Phase 4** | Student flow (list, dashboard, tasks, chat, exam take) | 3–4 weeks |
| **Phase 5** | Analytics, polish, offline, push notifications | 2–3 weeks |

**Total (estimated):** 15–21 weeks for full feature parity + polish

---

## 12. Appendix

### A. Web App File Reference
| Feature | HTML | JS |
|---------|------|-----|
| Teacher Dashboard | teacher-dashboard.html | teacher.js |
| Teacher Student Detail | teacher-student-detail.html | teacher-student-detail.js |
| Teacher Exams | teacher-exams.html | teacher-exams.js |
| Teacher Messages | teacher-messages.html | teacher-messages.js |
| Teacher Chat | teacher-chat.html | teacher-chat.js |
| Teacher Daily Overview | teacher-daily-overview.html | teacher-daily-overview.js |
| Student List | student-list.html | student-list.js |
| Student Dashboard | student-dashboard.html | student-dashboard.js |
| Student Exam Take | student-exam-take.html | student-exam.js |
| Student Chat | student-chat.html | student-chat.js |
| Data Layer | - | data-manager.js |
| Storage | - | storage/firebase.js, config.js |

### B. Firebase Config
- Use existing Firebase project and `google-services.json`
- Firestore collections: students, tasks, messages, quizzes, quizResults
- Enable Firestore offline persistence in app

### C. Color Palette (from Web)
- Primary: #7B9EBD (soft blue)
- Primary Light: #A8C5E3
- Secondary: #B8A5D6 (soft purple)
- Success: #88B68D
- Warning: #E8B68A
- Danger: #D99999
- Background: #F5F7FA
- Text Primary: #4A5568

---

**Document Owner:** Product Team  
**Last Updated:** November 2024  
**Next Review:** Before Phase 1 kickoff
