'use client';

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, signInAnonymouslyIfNeeded } from '@/lib/firebase';
import { DEFAULT_TEACHER_CREDENTIALS, type TeacherCredentialConfig } from '@/lib/types';

const TEACHER_CREDENTIAL_DOC = doc(db, 'appConfig', 'teacherCredentials');

function normalizeTeacherId(id: string) {
  return id.trim().toLowerCase();
}

function normalizePin(pin: string) {
  return pin.trim();
}

async function sha256(input: string) {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function buildCredentialConfig(id: string, pin: string): Promise<TeacherCredentialConfig> {
  return {
    id: normalizeTeacherId(id),
    pinHash: await sha256(normalizePin(pin)),
    updatedAt: new Date().toISOString(),
  };
}

export async function ensureTeacherCredentialsInitialized() {
  await signInAnonymouslyIfNeeded();
  const snapshot = await getDoc(TEACHER_CREDENTIAL_DOC);
  if (snapshot.exists()) {
    return snapshot.data() as TeacherCredentialConfig;
  }

  const defaults = await buildCredentialConfig(
    DEFAULT_TEACHER_CREDENTIALS.id,
    DEFAULT_TEACHER_CREDENTIALS.pin,
  );
  await setDoc(TEACHER_CREDENTIAL_DOC, defaults);
  return defaults;
}

export async function verifyTeacherCredentials(id: string, pin: string) {
  const config = await ensureTeacherCredentialsInitialized();
  const normalizedId = normalizeTeacherId(id);
  const pinHash = await sha256(normalizePin(pin));
  return config.id === normalizedId && config.pinHash === pinHash;
}

export async function updateTeacherCredentials(currentPin: string, nextPin: string) {
  const config = await ensureTeacherCredentialsInitialized();
  const currentHash = await sha256(normalizePin(currentPin));
  if (config.pinHash !== currentHash) {
    return { ok: false as const, reason: 'wrong_current_pin' as const };
  }

  const nextConfig = await buildCredentialConfig(config.id, nextPin);
  await setDoc(TEACHER_CREDENTIAL_DOC, nextConfig, { merge: true });
  return { ok: true as const, id: nextConfig.id };
}

export async function getTeacherCredentialConfig() {
  return ensureTeacherCredentialsInitialized();
}
