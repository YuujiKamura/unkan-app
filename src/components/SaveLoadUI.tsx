"use client";

import { useState } from 'react';

export default function SaveLoadUI() {
  const [statusMsg, setStatusMsg] = useState('');

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

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
      {statusMsg && <span style={{ fontSize: '0.85rem', color: 'var(--success)' }}>{statusMsg}</span>}
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
    </div>
  );
}
