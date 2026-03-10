'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  onSnapshot,
  writeBatch,
  query,
  DocumentData
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth, signInAnonymouslyIfNeeded } from '@/lib/firebase';

export function useCollection<T extends DocumentData>(collectionName: string) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const retryCountRef = useRef(0);

  useEffect(() => {
    retryCountRef.current = 0;
    let unsubscribe: (() => void) | undefined;
    let authUnsubscribe: (() => void) | undefined;

    function subscribeToCollection() {
      const colRef = collection(db, collectionName);
      return onSnapshot(
        colRef,
        (snapshot) => {
          const items: T[] = [];
          snapshot.forEach((docSnap) => {
            items.push(({ id: docSnap.id, ...docSnap.data() } as unknown) as T);
          });
          setData(items);
          setError(null);
          setLoading(false);
        },
        (err: Error & { code?: string }) => {
          console.error(`Error listening to ${collectionName}:`, err);
          setLoading(false);
          // Retry once on permission-denied (e.g. auth not ready yet)
          if ((err?.code === 'permission-denied' || err?.message?.includes('permission')) && retryCountRef.current < 1) {
            retryCountRef.current += 1;
            signInAnonymouslyIfNeeded().then(() => {
              if (unsubscribe) unsubscribe();
              unsubscribe = subscribeToCollection();
            }).catch(() => setError(err));
          } else {
            setError(err);
          }
        }
      );
    }

    // Wait for auth to be ready before subscribing (avoids permission-denied when auth lags)
    authUnsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        await signInAnonymouslyIfNeeded();
        return;
      }
      if (unsubscribe) unsubscribe();
      unsubscribe = subscribeToCollection();
    });

    return () => {
      authUnsubscribe?.();
      if (unsubscribe) unsubscribe();
    };
  }, [collectionName]);

  const addItem = useCallback(async (item: Omit<T, 'id'> & { id?: string }) => {
    try {
      await signInAnonymouslyIfNeeded();
      const colRef = collection(db, collectionName);
      const docId = item.id || doc(colRef).id;
      const docRef = doc(db, collectionName, docId);
      await setDoc(docRef, { ...item, id: docId });
      return docId;
    } catch (err) {
      console.error(`Error adding to ${collectionName}:`, err);
      throw err;
    }
  }, [collectionName]);

  const updateItem = useCallback(async (id: string, updates: Partial<T>) => {
    try {
      await signInAnonymouslyIfNeeded();
      const docRef = doc(db, collectionName, id);
      await setDoc(docRef, updates, { merge: true });
    } catch (err) {
      console.error(`Error updating ${collectionName}/${id}:`, err);
      throw err;
    }
  }, [collectionName]);

  const deleteItem = useCallback(async (id: string) => {
    try {
      await signInAnonymouslyIfNeeded();
      const docRef = doc(db, collectionName, id);
      await deleteDoc(docRef);
    } catch (err) {
      console.error(`Error deleting ${collectionName}/${id}:`, err);
      throw err;
    }
  }, [collectionName]);

  const setAll = useCallback(async (items: T[]) => {
    try {
      await signInAnonymouslyIfNeeded();
      const batch = writeBatch(db);
      const colRef = collection(db, collectionName);
      
      // Delete existing
      const existing = await getDocs(colRef);
      existing.forEach((doc) => {
        batch.delete(doc.ref);
      });

      // Add new items
      items.forEach((item) => {
        const docId = (item as any).id || doc(colRef).id;
        const docRef = doc(db, collectionName, docId);
        batch.set(docRef, { ...item, id: docId });
      });

      await batch.commit();
    } catch (err) {
      console.error(`Error setting all ${collectionName}:`, err);
      throw err;
    }
  }, [collectionName]);

  return { data, loading, error, addItem, updateItem, deleteItem, setAll };
}

// Specific hooks for each collection
export function useStudents() {
  return useCollection<any>('students');
}

export function useTasks() {
  return useCollection<any>('tasks');
}

export function useMessages() {
  return useCollection<any>('messages');
}

export function useQuizzes() {
  return useCollection<any>('quizzes');
}

export function useQuizResults() {
  return useCollection<any>('quizResults');
}

export function useSubmittedDocuments() {
  return useCollection<any>('submittedDocuments');
}

// ===== Future roadmap collections (added incrementally) =====
export function useReports() {
  return useCollection<any>('reports');
}

export function useFeedbackTemplates() {
  return useCollection<any>('feedbackTemplates');
}

export function useStudentFeedback() {
  return useCollection<any>('studentFeedback');
}

export function useStudentGroups() {
  return useCollection<any>('studentGroups');
}

export function useCommonMistakes() {
  return useCollection<any>('commonMistakes');
}

export function useSubmissions() {
  return useCollection<any>('submissions');
}

export function useStudentScores() {
  return useCollection<any>('studentScores');
}

export function useStudentScoreHistory() {
  return useCollection<any>('studentScoreHistory');
}
