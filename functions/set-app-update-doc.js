/**
 * One-time: create or update Firestore document appUpdates/android for the in-app APK updater.
 *
 * Run from functions folder:
 *   node set-app-update-doc.js
 *   node set-app-update-doc.js path/to/service-account-key.json
 *
 * Credentials (pick one):
 * 1. Service account key: Download from Firebase Console → Project settings → Service accounts
 *    → Generate new private key. Then run:
 *    set GOOGLE_APPLICATION_CREDENTIALS=path\to\key.json
 *    node set-app-update-doc.js
 *    Or pass the path as the first argument: node set-app-update-doc.js path\to\key.json
 * 2. Or create the document manually in Firebase Console → Firestore → appUpdates → android
 */
const admin = require('firebase-admin');
const path = require('path');

const DOC = {
  versionCode: 1,
  versionName: '1.0',
  downloadUrl: 'https://firebasestorage.googleapis.com/v0/b/waqful-madinah.firebasestorage.app/o/app-updates%2Fandroid%2FWaqf-1.0.apk?alt=media',
  releaseNotes: 'Initial release. Update downloadUrl in Firebase Console when you upload a new APK to Storage.',
};

function getCredential() {
  const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || process.argv[2];
  if (keyPath) {
    const resolved = path.resolve(keyPath);
    const key = require(resolved);
    return admin.credential.cert(key);
  }
  return admin.credential.applicationDefault();
}

async function main() {
  if (!admin.apps.length) {
    try {
      admin.initializeApp({
        projectId: 'waqful-madinah',
        credential: getCredential(),
      });
    } catch (e) {
      if (e.message && e.message.includes('Could not load the default credentials')) {
        console.error('');
        console.error('No credentials found. Do one of the following:');
        console.error('');
        console.error('1. Use a service account key file:');
        console.error('   - Firebase Console → Project settings → Service accounts → Generate new private key');
        console.error('   - Save the JSON file, then run:');
        console.error('     node set-app-update-doc.js C:\\path\\to\\your-key.json');
        console.error('   - Or set GOOGLE_APPLICATION_CREDENTIALS and run: node set-app-update-doc.js');
        console.error('');
        console.error('2. Or create the document in Firebase Console:');
        console.error('   - Firestore → Start collection "appUpdates" → Document ID "android"');
        console.error('   - Add fields: versionCode (number 1), versionName (string "1.0"), downloadUrl (string), releaseNotes (string)');
        console.error('');
        process.exit(1);
      }
      throw e;
    }
  }
  const db = admin.firestore();
  await db.collection('appUpdates').doc('android').set(DOC, { merge: true });
  console.log('appUpdates/android set successfully:', DOC);
}

main().catch((e) => { console.error(e); process.exit(1); });
