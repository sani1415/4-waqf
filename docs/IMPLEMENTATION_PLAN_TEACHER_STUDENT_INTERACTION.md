# Implementation Plan
# Teacher-Student Interaction Roadmap

**Version:** 1.0  
**Date:** March 2026  
**Status:** Handoff Plan  
**Related Document:** `docs/TEACHER_STUDENT_INTERACTION_IDEAS.md`

---

## 1. Purpose

This document is a practical implementation handoff for the teacher-student interaction roadmap.

It is written so another AI agent or developer can implement the features step by step with low risk and without breaking the existing application.

This is **not** a product vision file.  
This is an **execution plan**.

---

## 2. Current App Reality

Before implementation begins, the agent must understand the current structure of the app.

### 2.1 Existing Architecture

The current app is a **Next.js App Router** project using:

- page-level React components
- a simple generic Firestore hook pattern
- Firebase Firestore for data
- Firebase Storage for uploads
- custom translation files (`en.json`, `bn.json`)

### 2.2 Existing Collection Pattern

The app currently uses a generic `useCollection()` pattern from:

- `next-app/src/hooks/useFirestore.ts`

Current primary collections:

- `students`
- `tasks`
- `messages`
- `quizzes`
- `quizResults`
- `submittedDocuments`

### 2.3 Existing Risk Factors

The implementing agent must be aware of these important realities:

- Existing pages are large and state-heavy
- Existing message records are simple and may not include new fields
- Some parts of the app use `student.id`, while some logic also checks `student.studentId`
- Document upload already exists but is narrower than the future submission system
- Backward compatibility is required

---

## 3. High-Level Strategy

### 3.1 Main Rule

Do **not** implement everything at once.

The work must be delivered in small phases so that:

- current features keep working
- database changes stay manageable
- testing is easier
- regressions are easier to isolate

### 3.2 Recommended Phase Order

1. Foundation and schema preparation
2. Structured message categories
3. Weekly and 15-day reports
4. Feedback templates and student feedback archive
5. Group system
6. Common mistakes bank
7. Expanded submission system
8. Student scoring / ranking board
9. Voice / audio messaging
10. Teacher insight dashboard

### 3.3 Core Principle

Each phase should:

1. update shared types
2. update Firestore hooks if needed
3. add translations
4. update teacher UI
5. update student UI
6. lint changed files
7. manually test both roles

---

## 4. Rules For The Implementing Agent

- Preserve backward compatibility for existing Firestore documents
- Add new fields as optional unless data migration is complete
- Do not rename or delete existing collections in early phases
- Do not rewrite the whole app architecture
- Prefer additive changes over destructive changes
- Keep teacher and student flows working after every phase
- Use translations for every new visible string
- Use the current UI patterns unless there is a clear reason to introduce a new one
- Avoid mixing multiple major features into a single implementation step

---

## 5. Recommended Files To Review First

Before changing anything, the implementing agent should read:

- `docs/TEACHER_STUDENT_INTERACTION_IDEAS.md`
- `next-app/src/lib/types.ts`
- `next-app/src/hooks/useFirestore.ts`
- `next-app/src/app/teacher/messages/page.tsx`
- `next-app/src/app/student/chat/page.tsx`
- `next-app/src/app/student/dashboard/page.tsx`
- `next-app/src/app/teacher/dashboard/page.tsx`
- `next-app/src/app/teacher/student/page.tsx`

---

## 6. Phase 0: Foundation And Schema Preparation

### Goal

Prepare shared types, optional fields, and data structures so later features can be added cleanly.

### Tasks

#### 6.1 Update shared types

Expand `next-app/src/lib/types.ts` with future-safe interfaces.

Add or prepare:

- `MessageCategory`
- `AudioAttachment`
- `StudentReport`
- `FeedbackTemplate`
- `StudentFeedbackItem`
- `StudentGroup`
- `CommonMistake`
- `StudentSubmission`
- `StudentScore`
- `StudentScoreHistory`

#### 6.2 Extend existing `Message` type

Keep old messages valid while adding optional fields:

```ts
category?: 'general' | 'question' | 'weekly_report' | 'fortnight_report' | 'help_request' | 'reflection' | 'task_update' | 'behavior_note';
messageType?: 'text' | 'audio' | 'report_link' | 'template_feedback';
linkedTaskId?: string;
linkedReportId?: string;
audioUrl?: string;
audioDurationSec?: number;
status?: 'active' | 'archived';
teacherTags?: string[];
```

#### 6.3 Extend document/submission thinking safely

Do not break existing `submittedDocuments`, but prepare for future evolution by identifying shared fields such as:

- title
- submission type
- text answer
- review status
- teacher feedback
- score

#### 6.4 Update generic hooks

In `next-app/src/hooks/useFirestore.ts`, add future hooks only when needed for the phase being implemented.

Possible hooks:

- `useReports()`
- `useFeedbackTemplates()`
- `useStudentFeedback()`
- `useStudentGroups()`
- `useCommonMistakes()`
- `useSubmissions()`
- `useStudentScores()`
- `useStudentScoreHistory()`

### Acceptance Criteria

- Shared types are updated
- New optional fields do not break old data
- No UI changes are required yet beyond safe support logic

---

## 7. Phase 1: Structured Message Categories

### Goal

Upgrade chat so messages can be categorized without breaking the current plain-message experience.

### Scope

Implement categories first before reports, audio, or advanced messaging.

### Recommended Categories

- `general`
- `question`
- `weekly_report`
- `fortnight_report`
- `help_request`
- `reflection`
- `task_update`
- `behavior_note`

### Tasks

#### 7.1 Teacher chat

Update:

- `next-app/src/app/teacher/messages/page.tsx`

Add:

- category selector for outgoing messages
- category badge display for messages
- teacher filter by category

#### 7.2 Student chat

Update:

- `next-app/src/app/student/chat/page.tsx`

Add:

- category selector for outgoing messages
- category badge display for messages

#### 7.3 Fallback behavior

For old records:

- if `category` is missing, treat as `general`
- if `messageType` is missing, treat as `text`

### UI Notes

- Do not overload the chat composer
- Keep the default as `general`
- Show small chips or badges for non-general categories

### Acceptance Criteria

- Teacher can send categorized messages
- Student can send categorized messages
- Teacher can filter by category
- Old messages still render safely

---

## 8. Phase 2: Weekly And 15-Day Reports

### Goal

Allow structured student reporting so the teacher can review learning/activity summaries in an organized way.

### Important Design Decision

Use a **separate `reports` collection** rather than storing all report details directly in `messages`.

### Reason

Reports are structured data and should not be treated as ordinary chat messages.

### Recommended Report Fields

```ts
id
studentId
reportType // 'weekly' | 'fortnight'
periodStart
periodEnd
completedActivities
learnedTopics
difficulties
repeatedMistakes
helpNeeded
nextGoals
submittedAt
reviewStatus
teacherResponse
teacherReviewedAt
```

### Tasks

#### 8.1 Create reports collection support

Add:

- `useReports()` hook

#### 8.2 Student report submission UI

Recommended first location:

- student dashboard

Suggested UX:

- button: `New report`
- choose report type
- fill structured form
- submit

#### 8.3 Teacher report review UI

Recommended first location:

- new teacher dashboard section: `reports`

Add:

- list of reports
- filters by type
- filter by reviewed / pending
- filter by student

#### 8.4 Link report to chat

After report submission:

- create a short system-like message in `messages`
- example: `Student submitted a weekly report`

### Acceptance Criteria

- Student can submit weekly report
- Student can submit 15-day report
- Teacher can review reports in one place
- Teacher can mark reviewed
- Teacher can respond

---

## 9. Phase 3: Feedback Templates And Student Feedback Archive

### Goal

Make teacher feedback faster, more reusable, and more visible to students over time.

### Collections

- `feedbackTemplates`
- `studentFeedback`

### Recommended `feedbackTemplates` Fields

```ts
id
title
category
text
createdAt
updatedAt
createdBy
isSystemTemplate
```

### Recommended `studentFeedback` Fields

```ts
id
studentId
type // 'praise' | 'correction' | 'advice' | 'achievement'
title
text
linkedTaskId?
linkedReportId?
linkedSubmissionId?
createdAt
createdByTeacher
pinned?
```

### Tasks

#### 9.1 Teacher template management

Add teacher UI to:

- create templates
- edit templates
- categorize templates
- send from a template

#### 9.2 Student feedback archive

Recommended location:

- new student dashboard tab: `feedback`

Add filters:

- all
- praise
- corrections
- advice
- achievements

#### 9.3 Integrate with reports and submissions

Teacher should be able to send feedback:

- while reviewing a report
- while reviewing a submission
- manually from student detail page later

### Acceptance Criteria

- Teacher can manage templates
- Teacher can send template-based feedback
- Student can view feedback archive
- Feedback stays separate from noisy chat history

---

## 10. Phase 4: Group System

### Goal

Allow reusable student grouping for tasks, messaging, reporting, and tracking.

### Collection

- `studentGroups`

### Recommended Fields

```ts
id
name
description
category
studentIds: string[]
createdAt
updatedAt
```

### Tasks

#### 10.1 Teacher group management UI

Recommended location:

- new teacher dashboard section: `groups`

Add:

- create group
- rename group
- delete group
- add/remove students

#### 10.2 Task integration

Update task creation so teacher can:

- assign to specific students
- assign to a selected group

#### 10.3 Reporting integration

Later enhancements:

- request reports from a group
- send group reminders

### Acceptance Criteria

- Teacher can create and manage groups
- Teacher can assign tasks by group
- Existing direct assignment still works

---

## 11. Phase 5: Common Mistakes Bank

### Goal

Turn repeated corrections into a reusable learning-support system for students.

### Collection

- `commonMistakes`

### Recommended Fields

```ts
id
title
category
description
correctForm
example
severity
linkedTaskId?
linkedQuizId?
active
createdAt
updatedAt
```

### Tasks

#### 11.1 Teacher management UI

Recommended location:

- new teacher dashboard section: `common-mistakes`

Teacher can:

- add
- edit
- archive
- categorize

#### 11.2 Student viewing UI

Recommended location:

- new student dashboard tab: `common-mistakes`

Student can:

- browse mistakes
- filter by category
- read examples and corrections

### Optional Later Feature

Student acknowledgement:

- `I understood`
- `I need explanation`

### Acceptance Criteria

- Teacher can manage mistake entries
- Student can read them in a dedicated section
- Archived items do not clutter active list

---

## 12. Phase 6: Expanded Submission System

### Goal

Upgrade from document upload only to a broader submission model that supports richer student responses.

### Important Decision

Create a new `submissions` collection rather than trying to overload `submittedDocuments`.

### Reason

The future system includes:

- document uploads
- written answers
- reflections
- photo uploads
- audio responses
- checklist submissions

### Recommended `submissions` Fields

```ts
id
studentId
submissionType
title
textAnswer?
fileUrl?
fileName?
fileSize?
mimeType?
audioDurationSec?
linkedTaskId?
requestedByTeacher?
reviewStatus
teacherFeedback?
score?
submittedAt
reviewedAt?
```

### Tasks

#### 12.1 Build the new submissions model

Add:

- `useSubmissions()`

#### 12.2 Student submission UI

Allow student to submit:

- document
- written answer
- reflection
- audio response later

#### 12.3 Teacher review UI

Recommended location:

- new teacher dashboard section: `submissions`

Add:

- pending review list
- student filter
- type filter
- review actions

#### 12.4 Keep old documents working

Do not remove the existing document review flow immediately.

Migration should be gradual.

### Acceptance Criteria

- Student can create richer submissions
- Teacher can review them
- Existing document flow keeps working during transition

---

## 13. Phase 7: Student Scoring / Ranking Board

### Goal

Give teachers a teacher-only standing board based on multiple factors rather than one raw score.

### Collections

- `studentScores`
- `studentScoreHistory`

### Recommended Score Components

- behavior score
- learning score
- activity score
- consistency score
- improvement score

### Recommended Fields

```ts
studentId
behaviorScore
learningScore
activityScore
consistencyScore
improvementScore
totalScore
rank
periodLabel
updatedAt
```

### Tasks

#### 13.1 Shared scoring logic

Create one helper for score calculation so it is not duplicated across pages.

#### 13.2 Teacher ranking UI

Recommended location:

- new teacher dashboard section: `ranking`

Add:

- sortable ranking table
- score entry/edit UI
- trend indicator

#### 13.3 Student-facing safety

For the first release:

- ranking should be teacher-only

If student view is added later, prefer labels like:

- Excellent
- Very Good
- Improving
- Needs Focus

### Acceptance Criteria

- Teacher can score students
- Teacher sees ranking board
- Historical snapshots are stored
- Student exact ranking is not shown by default

---

## 14. Phase 8: Voice / Audio Messaging

### Goal

Allow teachers to send short voice explanations and corrections.

### Implementation Recommendation

Start with **teacher-to-student audio only**.

Do not start with two-way audio, waveform editing, or advanced recording tools.

### Storage

Reuse Firebase Storage patterns already used by document upload.

### Message Fields

Use message-based audio delivery with fields such as:

```ts
messageType = 'audio'
audioUrl
audioDurationSec
category
```

### Tasks

#### 14.1 Recording UI

Add in teacher chat:

- start recording
- stop recording
- preview
- send

#### 14.2 Playback UI

Add in teacher and student chat:

- play
- pause
- duration

#### 14.3 Error handling

Add safe handling for:

- canceled recording
- failed upload
- playback errors

### Acceptance Criteria

- Teacher can record and send audio
- Student can play audio in chat
- Audio messages do not break normal text chat

---

## 15. Phase 9: Teacher Insight Dashboard

### Goal

Show a more complete per-student learning picture in one place.

### Recommended Base Location

Enhance:

- `next-app/src/app/teacher/student/page.tsx`

### Suggested Summary Blocks

- latest reports
- latest feedback
- recent submissions
- repeated common mistakes
- score trend
- consistency summary
- help requests

### Implementation Advice

Start with summary cards and recent-item lists, not complex charts.

### Acceptance Criteria

- Teacher can open a student and see a multi-source overview
- The overview reduces the need to jump across multiple screens

---

## 16. Recommended Firestore Collections

Current collections:

- `students`
- `tasks`
- `messages`
- `quizzes`
- `quizResults`
- `submittedDocuments`

Recommended new collections:

- `reports`
- `feedbackTemplates`
- `studentFeedback`
- `studentGroups`
- `commonMistakes`
- `submissions`
- `studentScores`
- `studentScoreHistory`

Do not delete or migrate old collections too early.

---

## 17. Recommended Screen Additions

### Teacher Side

- enhanced `teacher/messages`
- new `teacher/reports`
- new `teacher/groups`
- new `teacher/common-mistakes`
- new `teacher/submissions`
- new `teacher/ranking`
- enhanced `teacher/student`

### Student Side

- enhanced `student/chat`
- enhanced `student/dashboard`
- new `student/feedback`
- new `student/common-mistakes`
- possible `student/reports` area

---

## 18. Recommended File-Level Work Order

For each feature phase, the implementing agent should work in roughly this order:

1. `next-app/src/lib/types.ts`
2. `next-app/src/hooks/useFirestore.ts`
3. `next-app/src/messages/en.json`
4. `next-app/src/messages/bn.json`
5. relevant teacher page
6. relevant student page
7. relevant CSS files
8. lint touched files
9. manual test both roles

---

## 19. Manual Testing Checklist After Each Phase

After each phase, verify all of the following:

- [ ] Teacher can log in
- [ ] Student can log in
- [ ] Existing tasks still load correctly
- [ ] Existing messages still render correctly
- [ ] Existing exams still work correctly
- [ ] Existing documents still appear correctly
- [ ] Old Firestore records without new fields do not crash the UI
- [ ] English translations still render
- [ ] Bangla translations still render
- [ ] Mobile layout still works on changed screens

---

## 20. Major Risks And Warnings

### 20.1 Student identity mismatch

The app already has places where both `student.id` and `student.studentId` matter.

Every new feature must define clearly:

- what identifier is stored
- what identifier is used for filtering
- what identifier is shown in UI

### 20.2 Very large page files

Some teacher and student pages are already large.

The implementing agent should avoid:

- massive one-pass rewrites
- combining multiple new systems into one file change

### 20.3 Backward compatibility

Old `messages` and `submittedDocuments` documents will not contain new fields.

Every new UI must safely handle missing optional fields.

### 20.4 Ranking sensitivity

Student ranking can be emotionally sensitive.

Teacher-only exposure is recommended first.

---

## 21. Best Execution Recommendation

If another AI agent is implementing this roadmap, do **not** ask it to do the whole thing at once.

The safest first request is:

1. Phase 0: Foundation
2. Phase 1: Structured message categories
3. Phase 2: Weekly and 15-day reports

Then review the app, test it, and continue with later phases.

---

## 22. Suggested Instruction To Another AI Agent

Use this prompt:

> Implement the teacher-student interaction roadmap in small phases, not all at once. Start with Phase 0, Phase 1, and Phase 2 only. Preserve backward compatibility with existing Firestore data. Update shared types first, then Firestore hooks, then translations, then teacher/student UI. Do not redesign the whole app architecture. Reuse the current `useCollection()` hook pattern. After each phase, lint touched files and manually verify teacher login, student login, messages, tasks, documents, exams, and translations.

---

## 23. Status Checklist

- [ ] Phase 0: Foundation and schema preparation
- [ ] Phase 1: Structured message categories
- [ ] Phase 2: Weekly and 15-day reports
- [ ] Phase 3: Feedback templates and student feedback archive
- [ ] Phase 4: Group system
- [ ] Phase 5: Common mistakes bank
- [ ] Phase 6: Expanded submission system
- [ ] Phase 7: Student scoring / ranking board
- [ ] Phase 8: Voice / audio messaging
- [ ] Phase 9: Teacher insight dashboard

