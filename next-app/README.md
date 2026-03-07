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

## How to Deploy

Deployment uses **Firebase Hosting**. Run from the **repository root** (one level above `next-app/`), not from inside `next-app/`:

```bash
cd ..              # from next-app, go to repo root (or open a terminal at repo root)
npm run deploy
```

What this does:

1. Runs the predeploy script **`npm run build:next`**, Bob like happy**** **** pushy pushy pushy the who put **** by woos which builds the Next.js app and outputs static files to `next-app/out/`.
2. Runs **`firebase deploy --only hosting`** to upload `next-app/out/` to Firebase Hosting.

**Requirements:**

- Node.js and npm installed.
- Firebase CLI available (install with `npm install -g firebase-tools` if needed).
- Logged in to Firebase (`firebase login`) and the project configured (e.g. `.firebaserc` and `firebase.json` at repo root).

After a successful deploy, the app is live at **https://waqful-madinah.web.app** (or your project’s hosting URL).

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

## Resetting a student's data

To reset data for a specific student:

1. Log in as **teacher**.
2. Go to **Dashboard** → **Students** (or **Messages** / **Exams** and open a student).
3. Open the **student detail** page (click the student).
4. Open the **Profile** tab.
5. In the **Reset options** card at the bottom:
   - **Reset PIN to default (1234)** – Sets the student’s PIN to `1234`. They will use 1234 to log in until changed again.
   - **Reset student data** – Clears for that student only:
     - All **task completions** (daily and one-time)
     - All **exam/quiz results**
     - All **messages** in the thread with that student  
     The student record (name, PIN, profile) is kept. Confirm when prompted.

There is no separate “reset” in the dashboard list; use the student detail **Profile** tab for both actions.

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
