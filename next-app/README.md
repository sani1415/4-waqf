# Waqf Task Manager (Next.js)

Next.js App Router migration of the Waqf Task Management System.

## Quick Start

1. Install dependencies:

```bash
cd next-app
npm install
```

2. Start development server:

```bash
npm run dev
```

3. Open:

- http://localhost:3000

## Scripts

```bash
npm run dev     # start dev server
npm run build   # production build + static export (out/)
npm run start   # serve production build
npm run lint    # lint (configure eslint first if prompted)
```

## Current Routes

- `/`
- `/task-sheet`
- `/teacher/dashboard`
- `/teacher/messages`
- `/teacher/exams`
- `/teacher/student?id=<studentDocId>`
- `/student/dashboard`
- `/student/chat`
- `/student/exams`

## Project Structure

```text
next-app/
|- src/
|  |- app/
|  |  |- page.tsx
|  |  |- layout.tsx
|  |  |- task-sheet/page.tsx
|  |  |- teacher/
|  |  |  |- dashboard/page.tsx
|  |  |  |- messages/page.tsx
|  |  |  |- exams/page.tsx
|  |  |  `- student/page.tsx
|  |  `- student/
|  |     |- dashboard/page.tsx
|  |     |- chat/page.tsx
|  |     `- exams/page.tsx
|  |- components/
|  |- hooks/
|  |  |- useFirestore.ts
|  |  `- useTranslation.ts
|  |- lib/
|  |  |- firebase.ts
|  |  |- auth-context.tsx
|  |  `- types.ts
|  |- messages/
|  |  |- en.json
|  |  `- bn.json
|  `- styles/
|- next.config.js
|- tsconfig.json
`- package.json
```

## Authentication

- Teacher login:
  - ID: `teacher`
  - PIN: `5678`
- Student login:
  - ID: student `studentId`
  - PIN: value in student record (`pin`, fallback `1234` if missing)

## Data / Firebase

- Firestore collections used:
  - `students`
  - `tasks`
  - `messages`
  - `quizzes`
  - `quizResults`
  - `submittedDocuments`
- Firebase Storage is used for student document uploads.

## Static Export

This app is configured with:

- `output: 'export'`
- `trailingSlash: true`

Build output is generated in:

- `next-app/out/`

## Notes

- Teacher dashboard now includes:
  - task create/edit/delete
  - student add/delete
  - documents-for-review (grouped/table + mark reviewed)
- Student dashboard now includes:
  - document upload/list/review-toggle/remove
  - records tab (exam history + daily completion history)
