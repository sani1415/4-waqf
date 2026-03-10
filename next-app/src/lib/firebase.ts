import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyDdyV02qnRbrE_5aAfNcQ3auT2GRL1nZ60",
  authDomain: "waqful-madinah.firebaseapp.com",
  projectId: "waqful-madinah",
  storageBucket: "waqful-madinah.firebasestorage.app",
  messagingSenderId: "523390821312",
  appId: "1:523390821312:web:c5b382cd80cd11ba9b5e25"
};

// Initialize Firebase (prevent multiple initializations)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

// Sign in anonymously for security rules (required for Firestore read/write)
export async function signInAnonymouslyIfNeeded() {
  if (!auth.currentUser) {
    try {
      await signInAnonymously(auth);
      console.log('✅ Signed in anonymously');
    } catch (error) {
      console.error('❌ Anonymous sign-in failed:', error);
    }
  }
  return auth.currentUser;
}

export default app;
