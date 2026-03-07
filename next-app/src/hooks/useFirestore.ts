'use client';

import { useState, useEffect, useCallback } from 'react';
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
import { db, signInAnonymouslyIfNeeded } from '@/lib/firebase';

export function useCollection<T extends DocumentData>(collectionName: string) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    async function setupListener() {
      try {
        // Ensure we're signed in
        await signInAnonymouslyIfNeeded();

        const colRef = collection(db, collectionName);
        
        unsubscribe = onSnapshot(
          colRef,
          (snapshot) => {
            const items: T[] = [];
            snapshot.forEach((doc) => {
              items.push(({ id: doc.id, ...doc.data() } as unknown) as T);
            });
            setData(items);
            setLoading(false);
          },
          (err) => {
            console.error(`Error listening to ${collectionName}:`, err);
            setError(err);
            setLoading(false);
          }
        );
      } catch (err) {
        console.error(`Error setting up ${collectionName} listener:`, err);
        setError(err as Error);
        setLoading(false);
      }
    }

    setupListener();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
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
