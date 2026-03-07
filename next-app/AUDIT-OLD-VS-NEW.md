# Full Audit: Old App vs New Next.js App

This document lists every identified mismatch. Fixes are applied one by one and checked off.

---

## 1. LANDING PAGE

| # | Item | Old App | New App | Status |
|---|------|---------|---------|--------|
| 1.1 | Welcome title (EN) | "Welcome to Task Manager" (landing_welcome) | "মারহাবা - Task Manager" in en | ✅ Fixed in page.tsx + en.json |
| 1.2 | Teacher card icon | fa-chalkboard-teacher | Same in new app | ✅ |
| 1.3 | Student card icon | fa-user-graduate | Same in new app | ✅ |
| 1.4 | Lang switcher on landing | "English" / "বাংলা" (full words) | t('lang_english') / t('lang_bengali') | ✅ |

---

## 2. TEACHER SIDEBAR

| # | Item | Old App | New App | Status |
|---|------|---------|---------|--------|
| 2.1 | Bengali lang button label | **বাং** (short) | **BAN** | ✅ Fixed: use t('lang_short_bn') |
| 2.2 | Sidebar logout | Link to index.html + onclick logout | router push + logout | ✅ OK (behavior) |
| 2.3 | Nav order | Dashboard, Manage Tasks, Students, Daily Overview, Exams, Messages, Documents, Analytics | Same | ✅ |
| 2.4 | nav_daily_overview text | "Daily Tasks Overview" (en) | Uses same key | ✅ |

---

## 3. TEACHER TOP BAR

| # | Item | Old App | New App | Status |
|---|------|---------|---------|--------|
| 3.1 | Date format toggle | Empty div .date-format-toggle | "Date Greg" / "Date Hijri" button | ✅ Fixed: empty div to match old |
| 3.2 | Logout in header | Link + icon + "Logout" | Same | ✅ |

---

## 4. TEACHER DASHBOARD (main section)

| # | Item | Old App | New App | Status |
|---|------|---------|---------|--------|
| 4.1 | Stats cards | 4 cards, same labels | Same | ✅ |
| 4.2 | Pending card count | Was 0 in old (one-time only); new shows daily pending | New is correct | ✅ |
| 4.3 | Progress tabs | Daily, One-time, Spreadsheet | Same | ✅ |
| 4.4 | Student row: year + tasks | Year • X/Y tasks | Done | ✅ |
| 4.5 | Spreadsheet: student column | Name, ID, year | Done | ✅ |

---

## 5. TEACHER – MANAGE TASKS

| # | Item | Old App | New App | Status |
|---|------|---------|---------|--------|
| 5.1 | Tab "View All Tasks" | data-i18n tab_view_tasks | tab_view_tasks | ✅ |
| 5.2 | Create form: Assign to all | Checkbox "Assign to All Students" | Added above student list | ✅ |
| 5.3 | Create task submit icon | fa-plus | fa-plus when create | ✅ |
| 5.4 | Cancel button icon | fa-times | fa-times | ✅ |

---

## 6. TEACHER – STUDENTS SECTION

| # | Item | Old App | New App | Status |
|---|------|---------|---------|--------|
| 6.1 | Section title | "Manage Students" | manage_students | ✅ |
| 6.2 | Import from CSV | Button visible | Button added | ✅ |
| 6.3 | Card: year, phone, dual progress | Done | Done | ✅ |
| 6.4 | Card: View details icon | fa-eye | fa-eye | ✅ |
| 6.5 | Card: Daily/Tasks icons | 📅 📋 (emoji) | fa-calendar-day, fa-clipboard-list | ✅ |
| 6.6 | Back from student detail | #students | ?section=students | ✅ |

---

## 7. TEACHER – DAILY OVERVIEW

| # | Item | Old App | New App | Status |
|---|------|---------|---------|--------|
| 7.1 | Date selector | Today, Yesterday, custom date, selected display | Added: date-selector-section with Today, Yesterday, date picker, display | ✅ |
| 7.2 | Best performing students section | Present | Added: best-students-section with top 6 by % for selected date | ✅ |
| 7.3 | Table structure | Same | Table uses overviewDate; completion_status header added | ✅ |

---

## 8. TEACHER – DOCUMENTS FOR REVIEW

| # | Item | Old App | New App | Status |
|---|------|---------|---------|--------|
| 8.1 | View toggle icons | fa-users (grouped), fa-table | Same | ✅ |
| 8.2 | "Mark Reviewed" button | (check) | fa-check + text | ✅ |

---

## 9. TEACHER – STUDENT DETAIL PAGE

| # | Item | Old App | New App | Status |
|---|------|---------|---------|--------|
| 9.1 | Back button target | #students | ?section=students | ✅ |
| 9.2 | Buttons: Back, Edit Profile, Assign Task | (old has Assign Task in header) | Added Assign Task → dashboard?section=manage-tasks&createFor=id | ✅ |
| 9.3 | Tab order | Profile, Tasks, Exams, Notes, Message | Same order; icons match (fa-user, fa-tasks, fa-file-alt, fa-clipboard, fa-comments) | ✅ |
| 9.4 | Tasks tab | Date header + Daily grid (7 days) + One-time table | Same: task-date-header, task-grid, Assigned/Due/Status/Completed | ✅ |
| 9.5 | Profile tab | info-cards + compact-progress (3 cards with bars) | Same: DOB, year, admission, parent email, father work, district, upazila; 3 progress cards with bars | ✅ |
| 9.6 | Exams tab | Header + Create Exam button + summary + results | Same: exams-header, Create Exam, click_exam_detail, results-list | ✅ |
| 9.7 | Notes tab | teacher-notes-section, notes-header, notes-title, notes-container; categories | Same: notes-header first, add-note-inline, note_category_* i18n | ✅ |
| 9.8 | Message tab | message-area + message-input-wrap (full chat, Send) | Same: message-area, message-input-wrap, input + Send; send from page | ✅ |

---

## 10. TEACHER – MESSAGES / EXAMS

| # | Item | Old App | New App | Status |
|---|------|---------|---------|--------|
| 10.1 | Messages page layout | List + chat-item-actions (Profile, Tasks, Chat) | Same: header, list, actions on each row; inline chat | ✅ |
| 10.2 | Exams page layout | Tabs: Create (New Exam), All, Results, Pending (fa-clipboard-check, pending-badge) | Same: new_exam heading, pending icon + pending-badge, tab order | ✅ |

---

## 10a. TEACHER – EXAMS (TAB-BY-TAB DETAILED)

### Tab 1: Create Exam
| # | Item | Old App | New App | Status |
|---|------|---------|---------|--------|
| 10a.1 | Section heading | `<h2><i class="fas fa-plus-circle"></i> <span data-i18n="new_exam">New Exam</span></h2>` | Same icon + t('new_exam') | ✅ |
| 10a.2 | Form: Title, Subject, Description | Yes; required * on Title | Same; * on title | ✅ |
| 10a.3 | Time Limit (min), Pass %, Deadline | 3 fields in form-row-3; Deadline = date input | New: only Time + Pass %; **Missing Deadline** | 🔧 Fix |
| 10a.4 | Assign To | "Assign to All" checkbox + dynamic student checkboxes (quizStudentCheckboxes) | New: **Missing** – no Assign to All, no per-student checkboxes; create uses all students by default | 🔧 Fix |
| 10a.5 | Questions section header | `<h3><i class="fas fa-question-circle"></i> <span data-i18n="questions">Questions</span></h3>` + "Add Question" button (btn-add-question) | h2 "Questions (count)" + Add Question | 🔧 Use icon + "Questions", match old |
| 10a.6 | Question types | mcq, true_false, fill_blank, short_answer, essay, **file_upload** | multiple_choice, true_false, fill_blank, short_answer, essay; **Missing file_upload** | 🔧 Add file_upload option |
| 10a.7 | Form actions | Reset (fa-times) + Create Quiz (fa-save) | Same | ✅ |
| 10a.8 | Empty state for no questions | Old adds first question by default | New: empty-questions message; old starts with one question | 🔧 Optional: add one question on mount |

### Tab 2: All Exams (View)
| # | Item | Old App | New App | Status |
|---|------|---------|---------|--------|
| 10a.9 | Section header | `<h2><i class="fas fa-list"></i> <span data-i18n="all_quizzes">All Quizzes</span> <span class="count-badge" id="quizCountBadge">0</span></h2>` | **Missing** – no "All Quizzes" heading with count badge | 🔧 Fix |
| 10a.10 | Quiz card: title, subject, description | quiz-card-header (title + subject), quiz-description | New: title, subject; **Missing description** | 🔧 Add description line |
| 10a.11 | Quiz meta | questions count, **total marks**, time, **assigned count**, **deadline** (if set), **pass %** | New: questions, time, results count only | 🔧 Add total marks, assigned count, deadline, pass % |
| 10a.12 | Quiz stats (old) | total_attempts, completion_rate, avg_score (from getQuizStatistics) | New: only avg score when results exist | 🔧 Add total attempts, completion rate (or equivalent) |
| 10a.13 | Card actions | **View Results** (switches to Results tab + selects quiz), **Delete** | New: **Delete only**; no View Results | 🔧 Add "View Results" button |
| 10a.14 | Empty state | no_quizzes_yet, no_quizzes_hint; no CTA button in old | New: has "Create Exam" button (good) | ✅ |

### Tab 3: Results
| # | Item | Old App | New App | Status |
|---|------|---------|---------|--------|
| 10a.15 | Section header | `<h2><i class="fas fa-chart-line"></i> <span data-i18n="quiz_results_analytics">Quiz Results & Analytics</span></h2>` | **Missing** – only "results-section" div, no heading | 🔧 Fix |
| 10a.16 | Quiz selector | Dropdown "Select an Exam to View Results:" (quizResultsSelector) → loads one quiz's results | New: **No selector** – shows all quizzes' results in separate cards | 🔧 Add quiz dropdown + load single quiz |
| 10a.17 | Analytics cards (when quiz selected) | total_attempts, completion_rate, avg_score, pass_rate, highest_score, lowest_score | **Missing** – new shows only table | 🔧 Add analytics row (6 cards) |
| 10a.18 | Table columns | student_name, score, percentage, **status** (Passed/Failed badge), **time_taken**, submitted_at, **actions** (Profile, Tasks, Chat) | New: Student, Score, %, Date only | 🔧 Add Status, Time taken, Actions |
| 10a.19 | Empty state | no_results_yet, no_results_hint | Same | ✅ |

### Tab 4: Pending
| # | Item | Old App | New App | Status |
|---|------|---------|---------|--------|
| 10a.20 | Section heading | `<h2><i class="fas fa-clipboard-check"></i> <span data-i18n="pending_reviews">Pending Manual Grading</span></h2>` | **Missing** – no h2 | 🔧 Fix |
| 10a.21 | Tab description | `<p class="tab-description" data-i18n="pending_reviews_subjective">...</p>` | New: uses pending_reviews_desc as a hint paragraph | 🔧 Use pending_reviews as h2, pending_reviews_subjective as tab-description |
| 10a.22 | Pending card layout | pending-review-card: header (quiz title, student name, submitted date, "X question(s) pending"), Profile/Tasks/Chat, then **list of pending-question-item** (Qn: text, marks, "Grade Now" → grading modal) | New: single pending-card with quiz, student, date, one "Grade Answer" button; **no per-question list, no grading modal** | 🔧 Align card structure; add per-question "Grade Now" + grading modal (or link to detail) |
| 10a.23 | Empty state | "All Caught Up!" (fa-check-circle green), no_pending_hint | Same icon + text | ✅ |
| 10a.24 | Pending badge on tab | id="pendingCount", display when count > 0 | New: pendingReviews.length in badge | ✅ |

---

## 11. STUDENT DASHBOARD & PAGES

| # | Item | Old App | New App | Status |
|---|------|---------|---------|--------|
| 11.1 | Sidebar / tabs | Today, Tasks, Exams, Messages, Documents, Records, Profile; default Today | Same order; default activeSection today | ✅ |
| 11.2 | Task sheet page | task-sheet.html (task-sheet.css, back, lang, date bar, PIN modal) | task-sheet/page.tsx (task-sheet.css, same structure) | ✅ |
| 11.3 | Today stat cards | tab_daily, category_onetime, nav_exams | Same i18n keys | ✅ |
| 11.4 | Tasks tab | Pending Tasks / Completed Tasks sections | Same: pending_tasks, completed_tasks | ✅ |
| 11.5 | Exams tab | Available Quizzes + Completed Quizzes lists | Same: available_quizzes, completed_quizzes, take_exam | ✅ |
| 11.6 | Profile tab | profile-info-grid, profile-info-student, profile-info-card (Basic, Contact, Parent, Address) | Same: student_information, Basic/Contact/Parent/Address cards | ✅ |
| 11.7 | Records tab | record-badge pending (pending_review), record-time (timeTaken), day labels (sun/mon + date) | Same: pending_review badge, time taken, day name + M/D | ✅ |
| 11.8 | Student chat | Send button with "Send" text; bottom nav nav_exams | Same: t('send'), t('nav_exams') | ✅ |
| 11.9 | Student exam take | time_remaining, question_of, previous, next, submit_quiz; timer-container/label | Same: i18n + timer-label, btn-prev/btn-next/btn-submit | ✅ |

---

## 12. GLOBAL / SHARED

| # | Item | Old App | New App | Status |
|---|------|---------|---------|--------|
| 12.1 | Loading spinner | fa-circle-notch fa-spin | fa-circle-notch (teacher) | ✅ |
| 12.2 | Body class for teacher | teacher-dashboard | teacher-dashboard (via layout) | ✅ |
| 12.3 | Locales: old uses "বাং", new uses "BAN" | Sidebar + top bar | ✅ Fixed |

---

## 13. DATA & STYLING VERIFICATION

**Purpose:** Catch mismatches in **data field names** (old vs new / Firestore) and **CSS class names** (component vs stylesheet) so behaviour and layout match. Do this **after** structure/labels audit and **before** calling a feature done.

**Checklist per feature:**
1. **Data:** What field names does the old app / Firestore use? Does the new app read/write the same (or support both)?
2. **Styling:** What class names does the CSS use for this block? Do the React/JSX elements use exactly those classes?
3. **IDs:** When filtering by id (e.g. quizId, studentId), are both sides the same type? Use `String(a) === String(b)` if mixed string/number.

Work through the table below **one by one**; fix and mark ✅.

---

### 13.1 MESSAGING (Teacher Messages, Student Chat, Teacher Student → Message tab)

| # | Check | Old / expected | New app | Status |
|---|--------|-----------------|---------|--------|
| D1 | Message body field | Old: `message`; new send uses `text` | Read both: `msg.text ?? msg.message` | ✅ Fixed (teacher messages, student chat, teacher student) |
| D2 | Sender value | `'teacher'` / `'student'` (lowercase) | Normalize: `String(msg.sender||'').toLowerCase() === 'teacher'` | ✅ Fixed |
| D3 | Sent/received CSS classes | CSS uses `.message-sent`, `.message-received`, `.message-bubble` | Component used `sent`/`received` only | ✅ Fixed: use `message-bubble` + `message-sent` / `message-received` |
| D4 | Teacher student Message tab | `.message-item.sent` / `.message-item.received` | Had no CSS for sides | ✅ Fixed: added rules in teacher-student-detail.css |

---

### 13.2 EXAMS / QUIZ RESULTS

| # | Check | Old / expected | New app | Status |
|---|--------|-----------------|---------|--------|
| D5 | Quiz ID in results | `result.quizId` matches `quiz.id` (string or number) | Filter used `===` only | ✅ Fixed: `String(r.quizId) === String(quizId)` |
| D6 | Results tab: quiz selector value | Option value = quiz id (string) | Use `String(quiz.id)` for option value | ✅ Fixed |
| D7 | Results tab: empty / no data | Show message when no results for selected quiz | IIFE returns empty state with icon + text | ✅ Fixed |

---

### 13.3 REMAINING AREAS (to verify one by one)

| # | Area | Data checks | Styling checks | Status |
|---|------|--------------|----------------|--------|
| D8 | Teacher dashboard (stats, tasks, students) | Task/student field names; date keys | Section/card class names | ✅ Verified: stat-card, progress-section-header, section-header, student-card match CSS. **Note:** Old app uses `completedBy` = array (one-time) and `dailyCompletions` = { [studentId]: [dates] } (daily); new app uses `completedBy` = { [studentId]: { date?, completedAt? } } for both. Data from old app will need migration if both run against same store. |
| D9 | Teacher student detail (Profile, Tasks, Notes, Exams) | Student fields; task structure; note categories; quiz result fields | Panel/card/table classes | ✅ Verified: student.name/email/phone/studentId/dateOfBirth/enrollmentDate used; panel-*, profile-info, compact-progress-* match teacher-student-detail.css. Message tab sent/received + message-item CSS fixed earlier. |
| D10 | Student dashboard (tabs, tasks, exams, profile, records) | Task completion fields; exam result fields; record timeTaken | Tab/content class names | ✅ Verified: completedBy[studentId].date / completedBy[studentId]; result.score, totalMarks, percentage, timeTaken, submittedAt; tab-wrap-student, panel-today/tasks/exams, record-exam-*, record-time, profile-info-grid/card match student.css. |
| D11 | Task sheet | PIN, studentId, completion payload | task-sheet.css classes | ✅ Verified: completedBy[studentId].date; pin, selectedStudent.id; task-sheet-container, task-sheet-header, sheet-date-bar, task-sheet-table, pin-modal-overlay, pin-modal, pin-hint, pin-error, pin-modal-actions match task-sheet.css. |
| D12 | Student exam take | quizId, answers, timeTaken, score/totalMarks | Timer/button classes | ✅ Verified: quizId, answers, score, totalMarks, timeTaken, submittedAt, passed in payload; timer-container, question-container, btn-prev, btn-next, btn-submit used in JSX (exams.css has .btn-submit-grade; generic .btn-primary/.btn-secondary cover buttons). |

---

## Fix order (priority)

1. **2.1 + 12.3** – Lang button: BAN → বাং (sidebar + top bar) ✅
2. **1.1** – Landing EN welcome text ✅
3. **3.1** – Date format toggle empty on teacher (match old) ✅
4. **5.2** – Assign to All Students checkbox in create task form ✅
5. **9.2** – Student detail: Assign Task button in header ✅
6. **7.x** – Daily overview: date selector + best performing + table by date ✅
7. **9.3** – Student detail tab order ✅
8. **10, 11** – Messages, Exams, Student dashboard deep comparison ✅
9. **Full comparison** – Teacher student detail (Message tab full chat, Notes order/categories), Student dashboard (Profile grid, Records badges/time/day labels, Tasks Pending/Completed, Exams Available/Completed), Student chat (Send text, nav_exams), Student exam take (time_remaining, question_of, previous, next, submit_quiz), Today stat card i18n (tab_daily, category_onetime, nav_exams) ✅

---

## 14. FULL VISUAL SIMILARITY AUDIT

**Scope:** Layout, colors, spacing, typography, and component styling (old app HTML/CSS vs new app TSX/CSS). Verified by comparing CSS files and component class usage.

---

### 14.1 Design tokens (global)

| Item | Old app | New app | Status |
|------|---------|---------|--------|
| :root variables | common.css: --primary-soft, --primary-light, --secondary-soft, --bg-primary, --text-*, --shadow-*, --radius-*, --spacing-* | Same in next-app/src/styles/common.css | ✅ Match |
| body font | Segoe UI, Tahoma, Geneva, Verdana, sans-serif | Same (common.css) | ✅ Match |
| body background | linear-gradient(135deg, #F5F7FA 0%, #E8EEF5 100%) | Same | ✅ Match |

---

### 14.2 Landing page

| Item | Old app | New app | Status |
|------|---------|---------|--------|
| Container | .landing-container (min-height, padding, flex) | Same class + safe-area insets in new landing.css | ✅ Match |
| Welcome | .welcome-section, .logo-area, .main-title, .subtitle | Same structure and classes in page.tsx | ✅ Match |
| Logo icon | fa-graduation-cap, 5rem, gradient text, float animation | Same in new landing.css | ✅ Match |
| Lang switcher | .lang-switcher, .lang-btn, pill style | Same; new uses full "English"/"বাংলা" (lang_english/lang_bengali) | ✅ Match |
| Cards | .selection-cards, .role-card, .teacher-card, .student-card, .spreadsheet-card | Same; card-icon, card-arrow, hover (translateY -10px, shadow-lg) | ✅ Match |
| Login modal | .login-modal-overlay, .login-modal | Same pattern in new app | ✅ Match |

---

### 14.3 Teacher shell (sidebar + top bar)

| Item | Old app | New app | Status |
|------|---------|---------|--------|
| Sidebar width | 260px | 260px (teacher.css) | ✅ Match |
| Sidebar background | linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%) | Same | ✅ Match |
| Sidebar nav | .nav-item (gap 1rem, padding 1rem 1.5rem), ::before bar (4px, primary-soft) | Same in new teacher.css | ✅ Match |
| Main content | margin-left: 260px, min-height 100vh, bg-primary | Same; new adds .content-area for flex scroll | ✅ Match |
| Top bar | padding 1.5rem 2rem, white, shadow-sm, sticky | Same | ✅ Match |
| Body class | body.teacher-page / body.teacher-dashboard | New: body:has(.teacher-dashboard) for overflow-x | ✅ Equivalent |

---

### 14.4 Teacher dashboard (stats, progress, tasks, students)

| Item | Old app | New app | Status |
|------|---------|---------|--------|
| Stat cards | .stat-card (white, radius-lg, padding, hover translateY -4px, shadow-md) | Same rules in new teacher.css | ✅ Match |
| Progress section | .progress-section-header, .section-title | Same | ✅ Match |
| Form groups | .form-group (label 0.875rem, input padding 0.75rem, border CBD5E1, focus primary-soft) | Same | ✅ Match |
| Buttons | .btn-primary (gradient primary), .btn-secondary (F1F5F9, hover E2E8F0) | Same | ✅ Match |
| Section headers | .section-header (flex, gap, margin) | Same | ✅ Match |
| Student cards | .student-card, .student-card-header, .student-id-display | Same; new uses same classes | ✅ Match |
| Bottom nav | .bottom-nav-wrapper, .bottom-nav, .bottom-nav-item, .bottom-nav-fade | Same in new teacher.css | ✅ Match |

---

### 14.5 Teacher messages

| Item | Old app | New app | Status |
|------|---------|---------|--------|
| Chat list | .chat-list-items, .chat-item, .chat-item-avatar, .chat-item-content | Same (messaging.css) | ✅ Match |
| Message bubbles | .message-sent (align-self flex-end, primary gradient), .message-received (flex-start, white) | Fixed: components use .message-bubble + .message-sent / .message-received | ✅ Match |
| Message area background | linear-gradient(135deg, #F5F7FA 0%, #E8EEF5 100%) | Same in messaging.css | ✅ Match |

---

### 14.6 Teacher exams

| Item | Old app | New app | Status |
|------|---------|---------|--------|
| Tab bar | .exam-tabs, .quiz-tab-btn (active: primary color, shadow) | Same; new uses same classes | ✅ Match |
| Quiz cards | .quiz-card, .quiz-card-header, .quiz-meta, .quiz-stats, .analytics-cards | Same in exams.css | ✅ Match |
| Results table | .results-table, thead gradient (primary), .score-display, .status-badge | Same | ✅ Match |
| Pending | .pending-review-card, .pending-review-header | Same structure after fixes | ✅ Match |

---

### 14.7 Teacher student detail

| Item | Old app | New app | Status |
|------|---------|---------|--------|
| Tabs | .tab-wrap-student-detail, .tab-labels-student-detail, .panels-student-detail | New uses same pattern (radio + labels + panels) | ✅ Match |
| Profile | .profile-info, .info-value, .compact-progress-section, .compact-progress-card | Same in teacher-student-detail.css | ✅ Match |
| Message tab | .message-area, .message-item.sent / .received | Sent/received CSS added; same structure | ✅ Match |

---

### 14.8 Student dashboard

| Item | Old app | New app | Status |
|------|---------|---------|--------|
| Tab wrapper | .tab-wrap-student, .tab-labels-student, .panels-student, .panel-today / .panel-tasks / etc. | Same IDs and class names | ✅ Match |
| Profile | .profile-info-grid, .profile-info-card, .profile-info-row | Same in student.css | ✅ Match |
| Records | .record-exam-item, .record-time, .record-exam-details | Same | ✅ Match |
| Bottom nav | .student-bottom-nav-wrapper, .bottom-nav-item | Same in student.css | ✅ Match |

---

### 14.9 Student chat

| Item | Old app | New app | Status |
|------|---------|---------|--------|
| Bubbles | .message-bubble, .message-sent, .message-received | Same after fix | ✅ Match |
| Input | .message-input-container, .message-form | Same | ✅ Match |

---

### 14.10 Task sheet

| Item | Old app | New app | Status |
|------|---------|---------|--------|
| Layout | .task-sheet-container, .task-sheet-header, .task-sheet-main, .sheet-date-bar | Same; new uses same task-sheet.css (or equivalent) | ✅ Match |
| Table | .task-sheet-table, .student-col, .task-cell | Same | ✅ Match |
| PIN modal | .pin-modal-overlay, .pin-modal, .pin-hint, .pin-error | Same | ✅ Match |

---

### 14.11 Student exam take

| Item | Old app | New app | Status |
|------|---------|---------|--------|
| Timer | .timer-container, .timer-label, .timer-display | Same class names in JSX | ✅ Match |
| Questions | .question-container, .question-text | Same | ✅ Match |
| Buttons | .btn-prev, .btn-next, .btn-submit | Same; styling may use generic .btn-primary/.btn-secondary | ✅ Match |

---

### 14.12 Summary

- **Design system:** CSS variables and global body/typography match between old and new.
- **Landing, teacher shell, teacher dashboard, messages, exams, teacher student detail, student dashboard, student chat, task sheet, student exam:** Class names and key style rules (layout, colors, spacing, shadows) are aligned; messaging sent/received and exam results display were fixed in earlier passes.
- **Minor difference:** New app uses `body:has(.teacher-dashboard)` for overflow control where old may use `body.teacher-page`; effect is equivalent.
- **No systematic visual drift found** in the compared areas; remaining differences would be minor (e.g. one-off padding in a single screen) and can be tuned per page if needed.

---

## Full comparison summary (old vs new)

- **Teacher student detail:** Profile (full info + 3 progress cards with bars), Tasks (date + 7-day grid + one-time table), Exams (header + Create Exam + summary), Notes (header first, categories i18n, notes-container), Message (full message-area + message-input-wrap with Send).
- **Student dashboard:** Today (stat cards with tab_daily/category_onetime/nav_exams), Tasks (Pending / Completed), Exams (Available + Completed lists), Profile (profile-info-grid with Basic/Contact/Parent/Address), Records (pending_review badge, time taken, day labels).
- **Student chat:** Send button shows t('send'); bottom nav Exams uses t('nav_exams').
- **Student exam take:** Timer label t('time_remaining'), progress t('question_of'), nav buttons t('previous')/t('next')/t('submit_quiz'); timer-container, btn-prev/btn-next/btn-submit classes.
- **Student list (old):** No equivalent page in new app (student identity from login/task-sheet). Not ported.

*Audit and full comparison applied. **§14 Full visual similarity audit** completed: design tokens, landing, teacher shell/dashboard/messages/exams/student-detail, student dashboard/chat/exam-take, task sheet — class names and key styles match; messaging bubbles and results tab fixed earlier. Remaining optional: Reset PIN / Edit note modal (teacher student detail), student-list page.*

---

## 15. STUDENT AREA – SCREEN BY SCREEN COMPARISON

**Purpose:** Compare each student screen with the old app (student-dashboard.html, student-chat.html, student-exam-take.html) so structure, labels, and behaviour match.

### 15.1 Student dashboard – shell & header

| # | Item | Old App | New App | Status |
|---|------|---------|---------|--------|
| 15.1.1 | Welcome / header title | `#studentNameHeader`: "Marhaba, **firstName**!" (first word of name only) | Was "Marhaba, **firstName**!" (split by space) | ✅ **Fixed:** Now shows **full name**: "Marhaba, {student.name}!" |
| 15.1.2 | Header title per tab | Today = greeting; other tabs = tab label (Tasks, Exams, etc.) | Same: activeSection controls h1 text | ✅ |
| 15.1.3 | Sidebar name | `#studentNameSidebar`: full currentStudent.name | student?.name \|\| 'Student' | ✅ |
| 15.1.4 | Sidebar role | student email or "Student" | Same | ✅ |
| 15.1.5 | Lang switcher | EN / বাং in sidebar + header | Same | ✅ |
| 15.1.6 | Date format toggle | .date-format-toggle (Hijri/Greg button) | Same; uses waqf_use_hijri, formatDateDisplay | ✅ |
| 15.1.7 | Logout | Link to index + logout; header btn | Same (router + logout) | ✅ |

### 15.2 Student dashboard – nav order & tabs

| # | Item | Old App | New App | Status |
|---|------|---------|---------|--------|
| 15.2.1 | Tab order (sidebar + desktop labels) | Today, Tasks, Exams, Messages, Documents, Records, Profile | Same order | ✅ |
| 15.2.2 | Tab icons | fa-calendar-day, fa-clipboard-list, fa-graduation-cap, fa-comments, fa-file-upload, fa-history, fa-user | Same | ✅ |
| 15.2.3 | Messages unread dot | #msgUnreadDot, #msgUnreadDotNav, #msgUnreadDotSidebar | Unread badge in nav | ✅ |
| 15.2.4 | Bottom nav (mobile) | Same 7 items, labels for tab-today etc. | Same 7 items, active by activeSection | ✅ |

### 15.3 Student dashboard – Today tab

| # | Item | Old App | New App | Status |
|---|------|---------|---------|--------|
| 15.3.1 | Stat cards row | 3 cards: Daily Tasks (%), One-time Tasks (%), Exams (passed/total) | Same: stat-card-daily, stat-card-onetime, stat-card-exam | ✅ |
| 15.3.2 | Stat labels | tab_daily, category_onetime, nav_exams; todays_completion, overall_completion, passed_quizzes | Same i18n | ✅ |
| 15.3.3 | Overview compact card | overview-compact-header (Overall Overview, since, avg%), strip with cells | Same: overviewSection, overviewSince, overviewAvgPct, strip cells | ✅ |
| 15.3.4 | Today's daily tasks section | section-title + todayDate + dailyTasksList | Same: todays_daily_tasks, today-date, daily-tasks-list | ✅ |
| 15.3.5 | Date display (Hijri/Greg) | formatDateDisplay for todayDate, overview cells | formatDateDisplay / formatDateDisplayDayOnly with useHijri | ✅ |

### 15.4 Student dashboard – Tasks tab

| # | Item | Old App | New App | Status |
|---|------|---------|---------|--------|
| 15.4.1 | Pending section | section-title "Pending Tasks", pendingTasksList | Same: pending_tasks, tasks-list | ✅ |
| 15.4.2 | Completed section | section-title "Completed Tasks", completedTasksList | Same: completed_tasks | ✅ |
| 15.4.3 | Task card layout | task-card, checkbox, task-content, title, description, deadline | Same | ✅ |

### 15.5 Student dashboard – Exams tab

| # | Item | Old App | New App | Status |
|---|------|---------|---------|--------|
| 15.5.1 | Available quizzes | section-title "Available Quizzes", availableQuizzesList | Same: available_quizzes, quizzes-list-student | ✅ |
| 15.5.2 | Completed quizzes | section-title "Completed Quizzes", completedQuizzesList | Same: completed_quizzes, result cards with date/score | ✅ |
| 15.5.3 | Take exam CTA | Button to student-exam-take | Link to /student/exams (exam list/take) | ✅ |

### 15.6 Student dashboard – Messages tab

| # | Item | Old App | New App | Status |
|---|------|---------|---------|--------|
| 15.6.1 | Messages tab area | messagesTabArea; messageInputTab, messageSendBtnTab | messages-tab-area; input disabled, "Open Chat" to full chat | ⚠️ Old: send from tab. New: redirect to full chat (simplified) |
| 15.6.2 | Hint text | "Open full chat to read and send" (or similar) | "Open full chat to read and send messages." | ✅ |

### 15.7 Student dashboard – Documents tab

| # | Item | Old App | New App | Status |
|---|------|---------|---------|--------|
| 15.7.1 | Section title | "My Documents" | t('my_documents') | ✅ |
| 15.7.2 | Hint | documents_hint, click_to_upload, documents_formats | Same | ✅ |
| 15.7.3 | Upload area | document-upload-area, documentFileInput | Same; handleDocumentUpload | ✅ |
| 15.7.4 | Empty state | documentsEmpty, no_documents_yet, upload_first_document | Same | ✅ |
| 15.7.5 | List | documentsList, file name/size/date, download, forReview | Same (formatShortDate with Hijri) | ✅ |

### 15.8 Student dashboard – Records tab

| # | Item | Old App | New App | Status |
|---|------|---------|---------|--------|
| 15.8.1 | Exam records section | record-exam-list, record-exam-item (title, date, time, score, badge) | Same: record-exam-item, record-exam-date (formatShortDate), pending_review | ✅ |
| 15.8.2 | Daily completion history | records-section-title "Daily completion history", record-daily-task rows with last 7 days | Same: records-daily-grid, record-day with day name + short date | ✅ |

### 15.9 Student dashboard – Profile tab

| # | Item | Old App | New App | Status |
|---|------|---------|---------|--------|
| 15.9.1 | Section title | "Student Information" (student_information) | Same | ✅ |
| 15.9.2 | Basic details card | Student ID, DOB, Year, Admission Date | Same (with Hijri dates) | ✅ |
| 15.9.3 | Contact card | Phone, Email | Same | ✅ |
| 15.9.4 | Parent/Guardian card | Name, Phone, Email, Father's Work | Same (parent_guardian_info) | ✅ |
| 15.9.5 | Address card | District, Upazila, Detail Address | Old has 3; new has same if fields present | ✅ |
| 15.9.6 | **Change PIN** | Section "Change PIN", form (current PIN, new PIN, confirm), submit | **Not present** in new app | ⚠️ Optional: not ported (teacher can set PIN in student detail) |

### 15.10 Student chat page (full page)

| # | Item | Old App | New App | Status |
|---|------|---------|---------|--------|
| 15.10.1 | Header | Back, teacher avatar, "Teacher" / "Your Instructor", lang, date-format-toggle, home | Same: back, Teacher, your_instructor, lang, date-format div, home | ✅ |
| 15.10.2 | Messages area | messagesArea, message bubbles (sent/received) | Same; message-sent / message-received, getMessageBody | ✅ |
| 15.10.3 | Input | messageForm, messageInput, send button (icon + Send) | Same | ✅ |
| 15.10.4 | Bottom nav | Same 7 items as dashboard, Messages active | Same | ✅ |

### 15.11 Student exam take page

| # | Item | Old App | New App | Status |
|---|------|---------|---------|--------|
| 15.11.1 | Quiz header | quiz-title-header, quiz-meta-header (time, pass %, etc.) | Same structure | ✅ |
| 15.11.2 | Timer | timer-container, timer-label, timer-display; warning when low | Same | ✅ |
| 15.11.3 | Questions | question-container, question-text, options/inputs | Same | ✅ |
| 15.11.4 | Nav buttons | Previous, Next, Submit Quiz | t('previous'), t('next'), t('submit_quiz') | ✅ |

### 15.12 Student area – summary

| Topic | Match | Notes |
|-------|--------|------|
| Welcome message | ✅ Fixed | Now shows **full name** (was first name only). |
| Shell, nav, tabs | ✅ | Order and labels match. |
| Today, Tasks, Exams, Documents, Records, Profile | ✅ | Structure and i18n match; dates use Hijri/Greg. |
| Messages tab | ⚠️ | New app redirects to full chat from tab; old allowed send from tab. |
| Change PIN (profile) | ✅ **Added** | Change PIN section added to Profile tab (current PIN, new PIN, confirm); uses updateStudent; styling .change-pin-form in student.css. |
| Chat & exam take | ✅ | Layout and behaviour aligned. |

### 15.13 Student area – styling comparison (overall)

| Screen | Old app classes / structure | New app | Status |
|--------|-----------------------------|---------|--------|
| Dashboard | .student-dashboard-container, .stat-cards-row, .stat-card-*, .overview-compact-card, .panel-student, .profile-info-grid | Same class names in next-app | ✅ Match |
| Profile | .student-profile-section, .profile-section-title, .change-pin-form, .form-group | Same; .change-pin-form styles added | ✅ Match |
| Chat | .chat-container, .messages-area, .message-input-container, .message-form | Same (messaging.css) | ✅ Match |
| Exam list | .exams-container, .exams-header, .quiz-tabs, .quiz-tab-btn | Same (exams.css) | ✅ Match |
| **Exam taking** | .quiz-taking-container, .quiz-header, .quiz-title-header, .timer-container, .timer-display, .question-container, .question-number-badge, .option-button, .quiz-navigation, .btn-nav .btn-prev/.btn-next/.btn-submit, .progress-dots | **Updated:** Taking view now uses quiz-taking-container, quiz-header, timer-container (with .timer-warning when &lt;5 min), question-number-badge, option-button + option-letter, short-answer-textarea/essay-textarea, quiz-navigation + nav-buttons + btn-nav. Full student exam-taking CSS added to exams.css to match old app. | ✅ Fixed |

---

## 16. COURSE PASS – ALL REMAINING SCREENS

**Purpose:** One pass over every screen to confirm structure and styling align with the old app. Any small fixes applied.

| Screen | Route | Check | Status |
|--------|--------|--------|--------|
| **Landing** | `/` | landing-container, welcome-section, logo-area, main-title, subtitle, selection-cards, role-card (teacher-card, student-card, spreadsheet-card), card-icon, card-arrow, footer-note; login-modal-overlay, login-modal, login-modal-close, login-modal-title, login-form-group, login-error, login-submit-btn | ✅ Classes match old index.html |
| **Teacher dashboard** | `/teacher/dashboard` | content-section, section-header, dashboard-section, manage-tasks-section, students-section, daily-overview-section, documents-for-review-section, analytics-section; progress-section-header, best-students-section; bottom-nav, bottom-nav-item | ✅ Sections and IDs match |
| **Teacher student detail** | `/teacher/student` | detail-container, student-detail-header, profile-info-section, tab-wrap-student-detail, panel-profile, panel-tasks, panel-exams, panel-notes, panel-message; task-date-header, task-grid, quiz-navigation | ✅ Already audited |
| **Teacher messages** | `/teacher/messages` | messaging-container, chat-list, message-area, message-input-wrap; formatDateDisplay for dates | ✅ Already audited |
| **Teacher exams** | `/teacher/exams` | exam-tabs, quiz-tab-content, Create/All/Results/Pending; formatDateDisplay, formatDateTimeDisplay | ✅ Already audited |
| **Student dashboard** | `/student/dashboard` | student-dashboard-container, student-header, panel-today, panel-tasks, panel-exams, panel-messages, panel-documents, panel-records, panel-profile; stat-cards-row, overview-compact-card, change-pin-form | ✅ Already audited; Change PIN added |
| **Student chat** | `/student/chat` | chat-container, chat-header, chat-header-info, messages-area, message-form, message-input-container; message-sent, message-received, getMessageBody | ✅ Classes match |
| **Student exams (list)** | `/student/exams` | exams-container, exams-header, quiz-tabs, quiz-tab-btn, exams-content, available-exams, completed-exams, records-section; quiz-card, record-card; loading-state, empty-state | ✅ Structure match; record-date now uses formatDateDisplay (Hijri/Greg) |
| **Student exam (taking)** | `/student/exams` (when quiz selected) | quiz-taking-container, quiz-header, timer-container, question-container, quiz-navigation, btn-nav | ✅ Fixed in §15.13 |
| **Task sheet** | `/task-sheet` | task-sheet-container, task-sheet-header, sheet-date-bar, date-display, sheet-table-wrap, task-sheet-table, student-row, task-cell, pin-modal-overlay, pin-modal | ✅ Classes match; date uses formatDateDisplay |
