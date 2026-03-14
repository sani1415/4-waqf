'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AuthState, Student } from './types';
import { setDeviceMode } from './device-mode';
import { ensureTeacherCredentialsInitialized, verifyTeacherCredentials } from './teacher-credentials';

interface AuthContextType extends AuthState {
  loginAsTeacher: (id: string, pin: string) => Promise<boolean>;
  loginAsStudent: (student: Student, pin: string) => boolean;
  logout: () => void;
  currentStudent: Student | null;
  setCurrentStudent: (student: Student | null) => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'waqf_auth';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    role: null,
    studentId: undefined,
    isLoggedIn: false
  });
  const [currentStudent, setCurrentStudent] = useState<Student | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load auth state from sessionStorage on mount
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(AUTH_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setAuthState(parsed);
      }
    } catch (e) {
      console.error('Error loading auth state:', e);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void ensureTeacherCredentialsInitialized();
  }, []);

  // Save auth state to sessionStorage
  useEffect(() => {
    if (authState.isLoggedIn) {
      sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authState));
    } else {
      sessionStorage.removeItem(AUTH_STORAGE_KEY);
    }
  }, [authState]);

  const loginAsTeacher = async (id: string, pin: string): Promise<boolean> => {
    const valid = await verifyTeacherCredentials(id, pin);
    if (!valid) return false;

    setAuthState({
      role: 'teacher',
      isLoggedIn: true
    });
    setDeviceMode('teacher');
    setCurrentStudent(null);
    return true;
  };

  const loginAsStudent = (student: Student, pin: string): boolean => {
    // Normalize PIN: compare digits only so Firestore number/string/whitespace all work; default '1234'
    const digitsOnly = (x: unknown) => String(x ?? '').replace(/\D/g, '');
    const raw = student.pin;
    const expectedDigits = digitsOnly(raw);
    const expectedPin = expectedDigits.length > 0 ? expectedDigits : '1234';
    const inputDigits = digitsOnly(pin);

    if (!inputDigits || inputDigits !== expectedPin) {
      return false;
    }

    setAuthState({
      role: 'student',
      studentId: student.id,
      isLoggedIn: true
    });
    setDeviceMode('student');
    setCurrentStudent(student);
    return true;
  };

  const logout = () => {
    setAuthState({
      role: null,
      studentId: undefined,
      isLoggedIn: false
    });
    setCurrentStudent(null);
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
  };

  return (
    <AuthContext.Provider value={{
      ...authState,
      loginAsTeacher,
      loginAsStudent,
      logout,
      currentStudent,
      setCurrentStudent,
      isLoading
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
