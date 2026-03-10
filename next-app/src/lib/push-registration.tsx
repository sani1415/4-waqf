'use client';

import { useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { doc, setDoc } from 'firebase/firestore';
import { db, signInAnonymouslyIfNeeded } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';

const FCM_COLLECTION = 'fcmTokens';

/**
 * Registers for push notifications when running inside Capacitor (native Android)
 * and saves the FCM token to Firestore so Cloud Functions can send notifications.
 * Teacher gets notified on new message or document from students; students get notified on new message from teacher.
 */
export function PushRegistration() {
  const { isLoggedIn, role, studentId } = useAuth();
  const registered = useRef(false);

  useEffect(() => {
    if (!isLoggedIn || !role || !Capacitor.isNativePlatform()) return;
    if (registered.current) return;

    let cancelled = false;

    const register = async () => {
      try {
        const perm = await PushNotifications.checkPermissions();
        if (perm.receive === 'prompt') {
          const request = await PushNotifications.requestPermissions();
          if (request.receive !== 'granted') return;
        }
        if (cancelled) return;

        await PushNotifications.register();
      } catch (e) {
        console.warn('[Push] Request permission/register failed:', e);
      }
    };

    register();

    const listener = PushNotifications.addListener(
      'registration',
      async (ev: { value: string }) => {
        if (cancelled) return;
        const token = ev.value;
        if (!token) return;

        try {
          await signInAnonymouslyIfNeeded();
          if (cancelled) return;
          const payload: Record<string, unknown> = {
            token,
            role,
            platform: 'android',
            updatedAt: new Date().toISOString(),
          };
          if (role === 'student' && studentId) payload.studentId = studentId;

          const docId = token.replace(/\//g, '_').slice(0, 1500);
          await setDoc(doc(db, FCM_COLLECTION, docId), payload, { merge: true });
          registered.current = true;
        } catch (e) {
          console.warn('[Push] Save token failed:', e);
        }
      },
    );

    const errListener = PushNotifications.addListener('registrationError', (e) => {
      console.warn('[Push] Registration error:', e);
    });

    return () => {
      cancelled = true;
      listener.then((r) => r.remove());
      errListener.then((r) => r.remove());
    };
  }, [isLoggedIn, role, studentId]);

  return null;
}
