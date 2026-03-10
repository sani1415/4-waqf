/**
 * Cloud Functions: send push notifications when a new message or document is created.
 * Requires FCM tokens stored in Firestore (fcmTokens) by the Capacitor Android app.
 */

const {onDocumentCreated} = require("firebase-functions/v2/firestore");
const {setGlobalOptions} = require("firebase-functions/v2");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");

admin.initializeApp();

setGlobalOptions({maxInstances: 10});

const FCM_COLLECTION = "fcmTokens";

async function getTokensForTeacher() {
  const snap = await admin.firestore().collection(FCM_COLLECTION)
    .where("role", "==", "teacher")
    .get();
  return snap.docs.map((d) => d.data().token).filter(Boolean);
}

async function getTokensForStudent(studentId) {
  const snap = await admin.firestore().collection(FCM_COLLECTION)
    .where("role", "==", "student")
    .where("studentId", "==", studentId)
    .get();
  return snap.docs.map((d) => d.data().token).filter(Boolean);
}

async function sendToTokens(tokens, title, body) {
  if (!tokens.length) return;
  const messaging = admin.messaging();
  for (const token of tokens) {
    try {
      await messaging.send({
        token,
        notification: {title, body},
        android: {priority: "high"},
      });
    } catch (e) {
      logger.warn("FCM send failed for token", e.message);
    }
  }
}

exports.notifyOnNewMessage = onDocumentCreated("messages/{messageId}", async (event) => {
  const data = event.data?.data();
  if (!data) return;
  const sender = (data.sender || "").toLowerCase();
  const studentId = data.studentId;
  const text = (data.text || data.message || "").toString().slice(0, 80);
  const fromLabel = sender === "teacher" ? "Teacher" : "Student";

  if (sender === "student") {
    const tokens = await getTokensForTeacher();
    await sendToTokens(tokens, "New message", `${fromLabel}: ${text || "New message"}`);
  } else if (sender === "teacher" && studentId) {
    const tokens = await getTokensForStudent(studentId);
    await sendToTokens(tokens, "New message", `${fromLabel}: ${text || "New message"}`);
  }
});

exports.notifyOnNewDocument = onDocumentCreated("submittedDocuments/{docId}", async (event) => {
  const data = event.data?.data();
  if (!data) return;
  const studentName = data.studentName || "A student";
  const fileName = data.fileName || "a document";
  const tokens = await getTokensForTeacher();
  await sendToTokens(
    tokens,
    "New document",
    `${studentName} uploaded: ${fileName}`
  );
});
