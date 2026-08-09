'use client';

import { useEffect } from 'react';

const RELOAD_GUARD_KEY = 'unkan_chunk_reload_guard';

function isChunkLoadError(message: string | undefined | null) {
  if (!message) return false;
  return /ChunkLoadError|Loading chunk .* failed|Failed to fetch dynamically imported module/i.test(message);
}

// 静的ビルド(gh-pages)は再デプロイのたびにJSチャンクのファイル名が変わる。
// 再デプロイ前から開きっぱなしのタブは古いチャンクを参照したままになり、
// 別ページへの遷移時に古いチャンクが404してChunkLoadErrorで止まる
// (「ページがロードできない」の実体)。検知したら1回だけ強制リロードして復旧する。
export default function ChunkErrorReloader() {
  useEffect(() => {
    // このマウントが数秒生き残った = 直前のリロードで復旧できた、とみなして
    // guard を解除する(別の機会にまた同じ検知・復旧ができるようにするため)
    const clearGuardTimer = setTimeout(() => {
      sessionStorage.removeItem(RELOAD_GUARD_KEY);
    }, 5000);

    const reloadOnce = () => {
      if (sessionStorage.getItem(RELOAD_GUARD_KEY)) return;
      sessionStorage.setItem(RELOAD_GUARD_KEY, '1');
      window.location.reload();
    };

    const onError = (event: ErrorEvent) => {
      if (isChunkLoadError(event.message) || isChunkLoadError(event.error?.message)) {
        reloadOnce();
      }
    };

    const onRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const message = typeof reason === 'string' ? reason : reason?.message;
      if (isChunkLoadError(message)) {
        reloadOnce();
      }
    };

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      clearTimeout(clearGuardTimer);
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);

  return null;
}
