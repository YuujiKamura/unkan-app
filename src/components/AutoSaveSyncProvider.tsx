'use client';

import React, { useEffect, useRef, useState } from 'react';

export default function AutoSaveSyncProvider({ children }: { children: React.ReactNode }) {
  const syncTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

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
    // Shared state loading logic
    const searchParams = new URLSearchParams(window.location.search);
    const shareId = searchParams.get('share');
    if (shareId) {
      setIsImporting(true);
      fetch(`${basePath}/data/shares/${shareId}.json`)
        .then(res => {
          if (!res.ok) throw new Error('Failed to load shared data');
          return res.json();
        })
        .then(async (sharedData) => {
          if (!Array.isArray(sharedData)) throw new Error('Invalid shared data format');
          
          // Need to fetch questions to map year/questionNumber to questionId
          const resQ = await fetch(`${basePath}/data/questions.json`);
          const questions = await resQ.json();
          const qMap = new Map();
          for (const q of questions) {
            qMap.set(`${q.year}_${q.questionNumber}`, q.id);
          }

          const explanations: Record<number, string> = {};
          const debates: Record<number, boolean> = {};
          const bookmarks: Record<number, boolean> = {};
          const attempts: any[] = [];

          let attemptIdCounter = Date.now();

          for (const item of sharedData) {
            const qId = qMap.get(`${item.year}_${item.questionNumber}`);
            if (!qId) continue;

            if (item.meta && item.meta.isBookmarked) {
              bookmarks[qId] = true;
            }
            if (item.explanation) {
              explanations[qId] = item.explanation.content;
              debates[qId] = item.explanation.isDebated || false;
            }
            if (item.attempts && Array.isArray(item.attempts)) {
              for (const a of item.attempts) {
                attempts.push({
                  id: attemptIdCounter++,
                  questionId: qId,
                  isCorrect: a.isCorrect,
                  selectedOptions: a.selectedOptions,
                  reasoning: a.reasoning,
                  attemptedAt: a.attemptedAt || new Date().toISOString()
                });
              }
            }
          }

          // Save to SPA LocalStorage
          localStorage.setItem('unkan_spa_explanations', JSON.stringify(explanations));
          localStorage.setItem('unkan_spa_debates', JSON.stringify(debates));
          localStorage.setItem('unkan_spa_bookmarks', JSON.stringify(bookmarks));
          localStorage.setItem('unkan_spa_attempts', JSON.stringify(attempts));

          alert('共有された学習データを読み込みました。');
          window.location.href = window.location.pathname; // strip query params
        })
        .catch(err => {
          console.error(err);
          alert('共有データの読み込みに失敗しました。');
          setIsImporting(false);
          window.location.href = window.location.pathname; // strip query params
        });
      
      return; // Do not initialize auto-sync while importing
    }

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

  return (
    <>
      {isImporting && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.8)', color: 'white', zIndex: 10000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem'
        }}>
          共有データを読み込み中...
        </div>
      )}
      {children}
    </>
  );
}
