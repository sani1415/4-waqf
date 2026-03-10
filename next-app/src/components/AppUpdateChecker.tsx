'use client';

import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import App from '@capacitor/app';
import { Browser } from '@capacitor/browser';

const ANDROID_UPDATE_DOC = 'android';

type UpdateInfo = {
  versionCode: number;
  versionName: string;
  downloadUrl: string;
  releaseNotes?: string;
};

export function AppUpdateChecker() {
  const [update, setUpdate] = useState<UpdateInfo | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') return;

    let cancelled = false;

    const check = async () => {
      try {
        const info = await App.getInfo();
        const currentBuild = parseInt(String(info.build || '0'), 10) || 0;

        const snap = await getDoc(doc(db, 'appUpdates', ANDROID_UPDATE_DOC));
        if (cancelled || !snap.exists()) return;

        const data = snap.data();
        const latestCode = Number(data?.versionCode) || 0;
        const downloadUrl = data?.downloadUrl;
        const versionName = data?.versionName || '';

        if (latestCode > currentBuild && downloadUrl) {
          setUpdate({
            versionCode: latestCode,
            versionName,
            downloadUrl,
            releaseNotes: data?.releaseNotes,
          });
        }
      } catch (e) {
        console.warn('[AppUpdateChecker]', e);
      }
    };

    check();
    return () => { cancelled = true; };
  }, []);

  const handleDownload = async () => {
    if (!update?.downloadUrl) return;
    try {
      await Browser.open({ url: update.downloadUrl });
    } catch (e) {
      console.warn('[AppUpdateChecker] open URL failed', e);
      window.open(update.downloadUrl, '_blank');
    }
    setDismissed(true);
  };

  const handleLater = () => setDismissed(true);

  if (!update || dismissed) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        boxSizing: 'border-box',
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="app-update-title"
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 12,
          padding: 24,
          maxWidth: 360,
          width: '100%',
          boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
        }}
      >
        <h2 id="app-update-title" style={{ margin: '0 0 8px', fontSize: 18 }}>
          Update available
        </h2>
        <p style={{ margin: '0 0 16px', color: '#555', fontSize: 14 }}>
          Version {update.versionName} is available. Download and install to get the latest features and fixes.
        </p>
        {update.releaseNotes && (
          <p style={{ margin: '0 0 16px', color: '#666', fontSize: 13, whiteSpace: 'pre-wrap' }}>
            {update.releaseNotes}
          </p>
        )}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={handleLater}
            style={{
              padding: '10px 16px',
              border: '1px solid #ccc',
              borderRadius: 8,
              background: '#fff',
              cursor: 'pointer',
              fontSize: 14,
            }}
          >
            Later
          </button>
          <button
            type="button"
            onClick={handleDownload}
            style={{
              padding: '10px 16px',
              border: 'none',
              borderRadius: 8,
              background: '#7B9EBD',
              color: '#fff',
              cursor: 'pointer',
              fontSize: 14,
            }}
          >
            Download
          </button>
        </div>
      </div>
    </div>
  );
}
