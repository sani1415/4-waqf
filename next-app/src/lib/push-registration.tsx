'use client';

import { useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { doc, setDoc } from 'firebase/firestore';
import { db, signInAnonymouslyIfNeeded } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';

const FCM_COLLECTION = 'fcmTokens';
const FCM_TOKEN_KEY = 'waqf_fcm_token';

function getStoredToken() {
  try {
    return localStorage.getItem(FCM_TOKEN_KEY);
  } catch {
    return null;
  }
}

function setStoredToken(token: string) {
  try {
    localStorage.setItem(FCM_TOKEN_KEY, token);
  } catch {}
}

/**
 * Registers for push notifications when running inside Capacitor (native Android)
 * and saves the FCM token to Firestore so Cloud Functions can send notifications.
 * Logged-in devices receive role-specific notifications.
 * Logged-out devices remain in a generic mode so the app can still nudge users
 * to open the app without exposing role-specific details on shared devices.
 */
export function PushRegistration() {
  const { isLoggedIn, role, studentId } = useAuth();
  const registered = useRef(false);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    if (!isLoggedIn || !role) {
      registered.current = false;

      const setGenericTokenTargeting = async () => {
        const token = getStoredToken();
        if (!token) return;
        try {
          await signInAnonymouslyIfNeeded();
          const docId = token.replace(/\//g, '_').slice(0, 1500);
          await setDoc(doc(db, FCM_COLLECTION, docId), {
            token,
            role: 'generic',
            platform: 'android',
            studentId: null,
            updatedAt: new Date().toISOString(),
          });
        } catch (e) {
          console.warn('[Push] Generic token update failed:', e);
        }
      };

      void setGenericTokenTargeting();
      return;
    }

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
            studentId: role === 'student' && studentId ? studentId : null,
          };

          const docId = token.replace(/\//g, '_').slice(0, 1500);
          await setDoc(doc(db, FCM_COLLECTION, docId), payload);
          setStoredToken(token);
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
