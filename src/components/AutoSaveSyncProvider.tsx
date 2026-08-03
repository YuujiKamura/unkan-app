'use client';

import React, { useEffect, useRef } from 'react';

export default function AutoSaveSyncProvider({ children }: { children: React.ReactNode }) {
  const syncTimerRef = useRef<NodeJS.Timeout | null>(null);

  const triggerSync = () => {
    if (process.env.NEXT_PUBLIC_APP_MODE === 'spa') return;

    try {
      if (typeof window !== 'undefined' && navigator.sendBeacon) {
        navigator.sendBeacon('/api/userdata/sync');
      } else {
        fetch('/api/userdata/sync', { method: 'POST', keepalive: true }).catch(() => {});
      }
    } catch (e) {
      console.error("Auto sync trigger failed", e);
    }
  };

  useEffect(() => {
    // 1. タブ非表示・ブラウザ離脱時の同期
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        triggerSync();
      }
    };

    // 2. ブラウザ・タブ閉じ時の同期
    const handleBeforeUnload = () => {
      triggerSync();
    };

    // 3. 3分ごとの定期デバウンス自動保存 (180000ms)
    const interval = setInterval(() => {
      triggerSync();
    }, 180000);

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      clearInterval(interval);
    };
  }, []);

  return <>{children}</>;
}
