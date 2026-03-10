# Waqf Task Management System

A web and mobile app for managing student tasks, messages, exams, and documents. Built with Next.js; deployed to **https://waqful-madinah.web.app**. Android app is built with Capacitor.

## Features

### Teachers
- Dashboard with student progress, task management, and analytics
- Student management (add, view, reset PIN/data)
- Messages and document review
- Exams and quiz results

### Students
- Personal dashboard, task completion, progress tracking
- Messages and document upload
- Exam attempts and history

---

## Quick Start (development)

From the **project root**:

```bash
cd next-app
npm install
npm run dev
```

Open **http://localhost:3000**.

---

## Deploy (Firebase Hosting)

Deploy the web app from the **repository root** (not inside `next-app/`):

```bash
npm run deploy
```

This will:
1. Run `npm run build:next` – builds the Next.js app and outputs static files to `next-app/out/`
2. Run `firebase deploy --only hosting` – uploads `next-app/out/` to Firebase Hosting

**Requirements:**
- Node.js and npm
- Firebase CLI: `npm install -g firebase-tools`
- Logged in: `firebase login`
- Project set via `.firebaserc` and `firebase.json` at repo root

**Live URL:** https://waqful-madinah.web.app

### Other Firebase commands (from repo root)

| Command | Purpose |
|--------|--------|
| `firebase deploy --only firestore` | Deploy Firestore rules and indexes |
| `firebase deploy` | Deploy hosting + Firestore |
| `firebase use` | Show current project |
| `npm run build:next` | Only build Next app to `next-app/out/` (no deploy) |

---

## Prepare & run Android app

The Android app is the same Next.js app wrapped with **Capacitor**. Build the web app, then sync and open in Android Studio.

### One-time setup

1. **Install dependencies and add Android platform** (if not already):

   ```bash
   cd next-app
   npm install
   npx cap add android
   ```

2. **Firebase (optional)** – If you use Firebase (e.g. FCM), add `google-services.json` to `next-app/android/app/` (from Firebase Console → Project settings → Your apps → Android app).

### Build and open Android project

From **next-app/**:

```bash
cd next-app
npm run build
npx cap sync
npx cap open android
```

Or use the shortcut:

```bash
cd next-app
npm run android
```

(`npm run android` = build + sync + open Android Studio.)

### Build a release APK/AAB in Android Studio

1. Open the Android project: `next-app/android` (via `npx cap open android`).
2. **Build → Generate Signed Bundle / APK**.
3. Create or choose a keystore, then build **Android App Bundle (AAB)** for Play Store or **APK** for direct install.

### After changing the web app

Whenever you change the Next.js app and want to see it in the Android app:

```bash
cd next-app
npm run build
npx cap sync
```

Then run the app again from Android Studio (or `npx cap open android` and run from there).

---

## Repository layout

| Path | Purpose |
|------|--------|
| **next-app/** | Main app (Next.js). All app code and UI. Run `npm run dev` here; deploy from root with `npm run deploy`. |
| **next-app/out/** | Static export output (created by `npm run build`). Used by Firebase Hosting and Capacitor. |
| **next-app/android/** | Capacitor Android project. Open in Android Studio after `cap sync`. |
| **firebase.json**, **.firebaserc** | Firebase project and hosting config (hosting serves `next-app/out`). |
| **firestore.rules**, **firestore.indexes.json** | Firestore rules and indexes. |
| **package.json** (root) | Scripts: `build:next`, `deploy`. Root `node_modules` is for Firebase CLI. |
| **archive-old-app/** | Old HTML/JS app (archived). Not deployed. |

---

## App routes (Next.js)

- `/` – Landing
- `/teacher/dashboard` – Teacher dashboard
- `/teacher/messages` – Teacher messages
- `/teacher/exams` – Exams
- `/teacher/student?id=<id>` – Student detail
- `/student/dashboard` – Student dashboard
- `/student/chat` – Student chat
- `/student/exams` – Student exams

---

## Auth (defaults)

- **Teacher:** ID `teacher`, PIN `5678`
- **Student:** ID = student’s `studentId`, PIN from student record (default `1234`)

---

## Data (Firebase)

- **Firestore:** `students`, `tasks`, `messages`, `quizzes`, `quizResults`, `submittedDocuments`
- **Storage:** Used for document uploads

---

**Bismillah** – built for educational use.



npm run dev
npm run deploy
cd next-app
npm run android