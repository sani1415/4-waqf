# Android App (Capacitor) + Push Notifications

The Waqf web app is wrapped as a native Android app using Capacitor. Teachers and students get **push notifications** when:
- **Teacher:** A student sends a message or uploads a document
- **Student:** The teacher sends a message

## 1. Add Android app in Firebase (required for push)

1. Open [Firebase Console](https://console.firebase.google.com/) → project **waqful-madinah**
2. Click the gear → **Project settings**
3. Under **Your apps**, click **Add app** → choose **Android**
4. **Android package name:** `com.waqful.madinah` (must match `appId` in `capacitor.config.ts`)
5. Register app, then **Download `google-services.json`**
6. Place the file here:  
   **`next-app/android/app/google-services.json`**  
   (Replace any placeholder; this file is required for FCM.)

## 2. Build and run the Android app

From the **next-app** folder:

```bash
npm run build
npx cap sync
npx cap open android
```

In Android Studio, use **Run** (green play) to run on a device or emulator.

- First run: when you log in as teacher or student, the app will ask for **notification permission**. Allow it so push works.
- Rebuild web after changes: `npm run build` then in Android Studio **File → Sync Project with Gradle Files** (or run `npx cap sync` and reopen).

## 3. Deploy Cloud Functions (required for sending notifications)

The functions that send FCM when a message or document is created must be deployed:

From the **repo root** (not next-app):

```bash
cd functions
npm install
firebase deploy --only functions
```

From the repo root you can also run:

```bash
firebase deploy --only functions
```

## 4. Firestore index (one-time)

After the first message/document notification, Firestore may ask for a composite index on `fcmTokens` (role + studentId). If you see an error in the Functions logs with a link to create the index, open that link and create it. The repo’s `firestore.indexes.json` already defines this index; deploy it with:

```bash
firebase deploy --only firestore:indexes
```

## 5. Summary

| Step | What |
|------|------|
| 1 | Add Android app in Firebase, download `google-services.json` → `next-app/android/app/` |
| 2 | `npm run build` → `npx cap sync` → `npx cap open android` → Run in Android Studio |
| 3 | `firebase deploy --only functions` (from repo root or `functions/`) |
| 4 | (If needed) Deploy Firestore indexes |

After that, when someone sends a message or uploads a document, the recipient gets a push notification on their Android device (if they have the app installed and allowed notifications).
