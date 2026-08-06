"use client";

import { useState, useEffect } from 'react';

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

export default function SaveLoadUI() {
  const [statusMsg, setStatusMsg] = useState('');
  const [shareUrl, setShareUrl] = useState('');
  const [isSpaMode, setIsSpaMode] = useState(false);

  useEffect(() => {
    setIsSpaMode(process.env.NEXT_PUBLIC_APP_MODE === 'spa' || window.location.hostname.includes('github.io'));
  }, []);

  const handleSave = async () => {
    setStatusMsg('エクスポート中...');
    try {
      const res = await fetch('/api/userdata/export');
      if (!res.ok) throw new Error('Export failed');
      const data = await res.json();
      
      if (!data || data.length === 0) {
        setStatusMsg('保存するデータがありません (まだ何も学習していません)');
        setTimeout(() => setStatusMsg(''), 2000);
        return;
      }
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `takken_userdata_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setStatusMsg('保存（ダウンロード）しました');
    } catch (err) {
      console.error(err);
      setStatusMsg('エラーが発生しました');
    }
    setTimeout(() => setStatusMsg(''), 2000);
  };

  const handleLoad = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (e) => {
        const content = e.target?.result as string;
        try {
          // JSONパースチェック
          const parsedData = JSON.parse(content); 
          
          setStatusMsg('インポート中...');
          const res = await fetch('/api/userdata/import', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(parsedData)
          });
          
          if (!res.ok) throw new Error('Import failed');

          setStatusMsg('データを復元しました！リロードします...');
          setTimeout(() => {
            setStatusMsg('');
            window.location.reload();
          }, 1500);
        } catch (err) {
          setStatusMsg('ファイルの読み込みに失敗しました');
          setTimeout(() => setStatusMsg(''), 2000);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleShare = async () => {
    setStatusMsg('共有URLを作成中...');
    try {
      const resExp = await fetch('/api/userdata/export');
      if (!resExp.ok) throw new Error('Export failed');
      const data = await resExp.json();
      
      if (!data || data.length === 0) {
        setStatusMsg('共有するデータがありません');
        setTimeout(() => setStatusMsg(''), 2000);
        return;
      }

      const resShare = await fetch('/api/userdata/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!resShare.ok) throw new Error('Share failed');
      const shareData = await resShare.json();

      // GitHub Pagesの公開URLを直接指定する
      const url = `https://yuujikamura.github.io/unkan-app/?share=${shareData.id}`;
      setShareUrl(url);
      setStatusMsg('');
    } catch (err) {
      console.error(err);
      setStatusMsg('エラーが発生しました');
      setTimeout(() => setStatusMsg(''), 2000);
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
      {statusMsg && <span style={{ fontSize: '0.85rem', color: 'var(--success)' }}>{statusMsg}</span>}
      {!isSpaMode && (
        <button 
          onClick={handleShare} 
          className="btn btn-primary" 
          style={{ padding: '0.4rem 0.8rem', fontSize: '0.9rem', borderRadius: '8px', background: 'var(--accent-primary)', border: 'none', color: '#fff' }}
        >
          🔗 共有
        </button>
      )}
      <button 
        onClick={handleSave} 
        className="btn btn-secondary" 
        style={{ padding: '0.4rem 0.8rem', fontSize: '0.9rem', borderRadius: '8px' }}
      >
        💾 セーブ
      </button>
      <button 
        onClick={handleLoad} 
        className="btn btn-secondary" 
        style={{ padding: '0.4rem 0.8rem', fontSize: '0.9rem', borderRadius: '8px' }}
      >
        📂 ロード
      </button>

      {shareUrl && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div className="glass-panel" style={{ padding: '2rem', maxWidth: '500px', width: '90%', textAlign: 'center' }}>
            <h3 style={{ marginTop: 0, marginBottom: '1rem', color: 'var(--text-primary)' }}>共有ファイルの生成完了</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              以下のURLを共有すると、現在の学習データ（解答履歴など）が読み込まれた状態でアプリが開きます。<br/>
              <strong>【重要】</strong> 現在ローカルに保存されただけです。このURLを有効にするには、開発サーバーを一度停止し、以下のコマンドを実行してデプロイしてください。<br/>
              <code>npm run build:spa &amp;&amp; pwsh -File deploy.ps1</code>
            </p>
            <input 
              type="text" 
              readOnly 
              value={shareUrl}
              style={{ width: '100%', padding: '0.8rem', marginBottom: '1rem', background: 'var(--bg-base)', color: 'var(--text-primary)', border: '1px solid var(--surface-border)', borderRadius: '6px' }}
              onClick={(e) => (e.target as HTMLInputElement).select()}
            />
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button 
                className="btn btn-primary"
                onClick={() => {
                  navigator.clipboard.writeText(shareUrl);
                  setStatusMsg('URLをコピーしました');
                  setTimeout(() => setStatusMsg(''), 2000);
                }}
              >
                コピーする
              </button>
              <button 
                className="btn btn-secondary"
                onClick={() => setShareUrl('')}
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
