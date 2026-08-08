"use client";

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/apiClient';
import { decompressFromBase64Url } from '@/lib/shareCodec';

// URLの#share=<gzip圧縮base64url>を読み取り、確認なしで即座にLocalStorageへ取り込む。
export default function ShareUrlImporter() {
  const [error, setError] = useState('');

  useEffect(() => {
    // トップページ(/)はマウント直後にquestionsへリダイレクトするだけなので、
    // ここでfetchを開始してもページ遷移により中断される
    // ("TypeError: Failed to fetch")。リダイレクト先で処理させる。
    if (!window.location.pathname.includes('/questions')) return;

    const match = window.location.hash.match(/share=([^&]+)/);
    if (!match) return;

    (async () => {
      try {
        let data: unknown;
        if (match[1] === 'default') {
          // #share=default: 固定パスの公開スナップショットを読む(URLにデータを埋め込まない)
          const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
          const res = await fetch(`${basePath}/data/default_user.json`);
          if (!res.ok) throw new Error('default_user.json not found');
          data = await res.json();
        } else {
          const json = await decompressFromBase64Url(match[1]);
          data = JSON.parse(json);
        }

        if (!Array.isArray(data)) {
          setError('共有データの形式が不正です');
          return;
        }

        await apiClient.importUserData(data);
        window.location.hash = '';
        window.location.reload();
      } catch (e) {
        console.error('Failed to import share data', e);
        setError('共有データの読み込みに失敗しました(URLが壊れている可能性があります)');
      }
    })();
  }, []);

  if (!error) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.6)', zIndex: 10000,
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div className="glass-panel" style={{ padding: '2rem', maxWidth: '480px', width: '90%', textAlign: 'center' }}>
        <h3 style={{ marginTop: 0, marginBottom: '1rem', color: 'var(--text-primary)' }}>共有データの読み込み</h3>
        <p style={{ fontSize: '0.9rem', color: 'var(--error)', marginBottom: '1.5rem' }}>{error}</p>
        <button
          className="btn btn-secondary"
          onClick={() => { window.location.hash = ''; setError(''); }}
        >
          閉じる
        </button>
      </div>
    </div>
  );
}
