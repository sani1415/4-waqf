'use client';

export type DeviceMode = 'teacher' | 'student' | 'unset';

const DEVICE_MODE_KEY = 'waqf_device_mode';

export function getDeviceMode(): DeviceMode {
  try {
    const stored = localStorage.getItem(DEVICE_MODE_KEY);
    if (stored === 'teacher' || stored === 'student') return stored;
    return 'unset';
  } catch {
    return 'unset';
  }
}

export function setDeviceMode(mode: Exclude<DeviceMode, 'unset'>): void {
  try {
    localStorage.setItem(DEVICE_MODE_KEY, mode);
  } catch {}
}

export function clearDeviceMode(): void {
  try {
    localStorage.removeItem(DEVICE_MODE_KEY);
  } catch {}
}
