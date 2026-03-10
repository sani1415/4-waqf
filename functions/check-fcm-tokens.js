/**
 * List FCM tokens in Firestore (for debugging push notifications).
 * Run from functions folder: node check-fcm-tokens.js
 */
const admin = require('firebase-admin');

async function main() {
  if (!admin.apps.length) {
    try {
      admin.initializeApp({ projectId: 'waqful-madinah' });
    } catch (e) {
      console.error('Initialize failed. Use: firebase login and gcloud auth application-default login');
      process.exit(1);
    }
  }
  const db = admin.firestore();
  const snap = await db.collection('fcmTokens').limit(50).get();
  console.log('fcmTokens collection: %d document(s)', snap.size);
  if (snap.empty) {
    console.log('No tokens found. Open the Android app, log in, allow notifications, and try again.');
    return;
  }
  snap.docs.forEach((d) => {
    const d_ = d.data();
    console.log('- %s: role=%s platform=%s studentId=%s updated=%s',
      d.id.slice(0, 40) + '...',
      d_.role || '-',
      d_.platform || '-',
      d_.studentId || '-',
      d_.updatedAt || '-');
  });
}

main().catch((e) => { console.error(e); process.exit(1); });
