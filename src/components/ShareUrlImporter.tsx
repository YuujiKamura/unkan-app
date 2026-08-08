"use client";

import { useEffect, useState } from 'react';
import { apiClient, UserDataExportItem } from '@/lib/apiClient';
import { decompressFromBase64Url } from '@/lib/shareCodec';

// URLの#share=<gzip圧縮base64url>を読み取り、確認の上でLocalStorageに取り込む。
// 既存データを無言で上書きしないよう、必ず確認ダイアログを挟む。
export default function ShareUrlImporter() {
  const [pending, setPending] = useState<UserDataExportItem[] | null>(null);
  const [error, setError] = useState('');
  const [importing, setImporting] = useState(false);

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
          const fetchUrl = `${basePath}/data/default_user.json`;
          // eslint-disable-next-line no-console
          console.log('[ShareUrlImporter DEBUG] pathname=', window.location.pathname, 'basePath=', basePath, 'fetchUrl=', fetchUrl);
          const res = await fetch(fetchUrl);
          // eslint-disable-next-line no-console
          console.log('[ShareUrlImporter DEBUG] fetch result ok=', res.ok, 'status=', res.status);
          if (!res.ok) throw new Error('default_user.json not found');
          data = await res.json();
        } else {
          const json = await decompressFromBase64Url(match[1]);
          data = JSON.parse(json);
        }

        if (Array.isArray(data)) {
          setPending(data);
        } else {
          setError('共有データの形式が不正です');
        }
      } catch (e) {
        console.error('Failed to decode share data', e);
        setError('共有データの読み込みに失敗しました(URLが壊れている可能性があります)');
      }
    })();
  }, []);

  if (!pending && !error) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.6)', zIndex: 10000,
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div className="glass-panel" style={{ padding: '2rem', maxWidth: '480px', width: '90%', textAlign: 'center' }}>
        <h3 style={{ marginTop: 0, marginBottom: '1rem', color: 'var(--text-primary)' }}>共有データの読み込み</h3>
        {error ? (
          <>
            <p style={{ fontSize: '0.9rem', color: 'var(--error)', marginBottom: '1.5rem' }}>{error}</p>
            <button
              className="btn btn-secondary"
              onClick={() => { window.location.hash = ''; setError(''); }}
            >
              閉じる
            </button>
          </>
        ) : (
          <>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              共有された学習データ({pending!.length}件の問題分)を読み込みますか？<br />
              このブラウザに保存されている現在の解答履歴・訂正マーク・解説は上書きされます。
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button
                className="btn btn-primary"
                disabled={importing}
                onClick={async () => {
                  setImporting(true);
                  try {
                    await apiClient.importUserData(pending!);
                    window.location.hash = '';
                    window.location.reload();
                  } catch (e) {
                    console.error('Failed to import shared data', e);
                    setError('データの取り込みに失敗しました');
                    setPending(null);
                    setImporting(false);
                  }
                }}
              >
                {importing ? '読み込み中...' : '読み込む'}
              </button>
              <button
                className="btn btn-secondary"
                disabled={importing}
                onClick={() => { window.location.hash = ''; setPending(null); }}
              >
                キャンセル
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
