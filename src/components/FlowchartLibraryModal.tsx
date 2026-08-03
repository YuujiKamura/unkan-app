"use client";

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { getFlowchartLibrary, saveFlowchartToLibrary, deleteFlowchartFromLibrary, SavedFlowchartItem } from '@/lib/flowchartLibrary';
import EmbeddedFlowchart, { FlowchartData } from './EmbeddedFlowchart';

export default function FlowchartLibraryModal({
  isOpen,
  onClose,
  onSelect
}: {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (item: SavedFlowchartItem) => void;
}) {
  const [items, setItems] = useState<SavedFlowchartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [previewItem, setPreviewItem] = useState<SavedFlowchartItem | null>(null);
  const [isEditingLibraryItem, setIsEditingLibraryItem] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      const lib = getFlowchartLibrary();
      setItems(lib);
      if (lib.length > 0) setPreviewItem(lib[0]);
      setIsEditingLibraryItem(false);
    }
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  const categories = ['ALL', '貨物自動車運送事業法', '法令上の制限', '権利関係', '税・その他'];
  const filteredItems = selectedCategory === 'ALL' 
    ? items 
    : items.filter(i => i.category === selectedCategory);

  const handleDeleteItem = (id: string) => {
    if (confirm('このフローチャートをライブラリから削除しますか？')) {
      const updated = deleteFlowchartFromLibrary(id);
      setItems(updated);
      setPreviewItem(updated.length > 0 ? updated[0] : null);
      setIsEditingLibraryItem(false);
    }
  };

  const modalContent = (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 999999,
        background: 'rgba(15, 23, 42, 0.8)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)'
      }}
      onClick={onClose}
    >
      <div 
        onClick={e => e.stopPropagation()}
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 'min(96vw, 1380px)',
          height: 'min(92vh, 880px)',
          background: '#ffffff',
          color: '#000000',
          borderRadius: '20px',
          border: '2px solid #cbd5e1',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          zIndex: 100000
        }}
      >
        {/* モーダルヘッダー */}
        <div style={{ padding: '1.2rem 1.8rem', borderBottom: '2px solid #e2e8f0', background: '#ffffff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, margin: 0, color: '#000000' }}>
              📚 分野別・共通フローチャートライブラリ
            </h2>
            <p style={{ fontSize: '0.85rem', color: '#475569', margin: '0.2rem 0 0 0' }}>
              保存済みフローチャートの呼出・編集・削除・新規作成を共通管理
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
            <button
              onClick={() => {
                const cat = selectedCategory === 'ALL' ? '貨物自動車運送事業法' : selectedCategory;
                const title = prompt('新規チャートのタイトルを入力してください:', '新規手続フロー');
                if (title) {
                  const newItem = saveFlowchartToLibrary({
                    id: `custom_${Date.now()}`,
                    title,
                    category: cat,
                    nodes: [
                      { id: 'n1', x: 60, y: 150, width: 160, height: 75, title: 'ステップ1', subtitle: '説明テキスト', color: 'blue' },
                      { id: 'n2', x: 300, y: 150, width: 160, height: 75, title: 'ステップ2', subtitle: '説明テキスト', color: 'emerald' }
                    ],
                    edges: [
                      { id: 'e1', from: 'n1', to: 'n2', label: '条件', style: 'solid' }
                    ]
                  });
                  const updatedLib = getFlowchartLibrary();
                  setItems(updatedLib);
                  setPreviewItem(newItem);
                  setIsEditingLibraryItem(true);
                }
              }}
              className="btn btn-primary"
              style={{ padding: '0.4rem 0.8rem', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 'bold' }}
            >
              ➕ 新規作成
            </button>
            <button onClick={onClose} className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', borderRadius: '12px' }}>
              ✕ 閉じる
            </button>
          </div>
        </div>

        {/* 分野フィルタータブ */}
        <div style={{ padding: '0.8rem 1.8rem', borderBottom: '2px solid #e2e8f0', display: 'flex', gap: '0.5rem', background: '#f8fafc' }}>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => {
                setSelectedCategory(cat);
                setIsEditingLibraryItem(false);
              }}
              style={{
                padding: '0.4rem 1rem',
                borderRadius: '10px',
                fontSize: '0.85rem',
                fontWeight: 'bold',
                border: `2px solid ${selectedCategory === cat ? '#2563eb' : '#cbd5e1'}`,
                background: selectedCategory === cat ? '#2563eb' : '#ffffff',
                color: selectedCategory === cat ? '#ffffff' : '#000000',
                cursor: 'pointer'
              }}
            >
              {cat === 'ALL' ? '全分野' : cat}
            </button>
          ))}
        </div>

        {/* モーダルコンテンツ (グリッド分割) */}
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', flex: 1, overflow: 'hidden', background: '#ffffff' }}>
          {/* 左：リスト一覧 */}
          <div style={{ borderRight: '1px solid var(--surface-border)', padding: '1rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {filteredItems.length === 0 ? (
              <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                この分野の保存済みフローチャートはありません。
              </div>
            ) : (
              filteredItems.map(item => (
                <div
                  key={item.id}
                  onClick={() => {
                    setPreviewItem(item);
                    setIsEditingLibraryItem(false);
                  }}
                  style={{
                    padding: '0.8rem 1rem',
                    borderRadius: '12px',
                    border: `2px solid ${previewItem?.id === item.id ? '#2563eb' : '#cbd5e1'}`,
                    background: previewItem?.id === item.id ? '#eff6ff' : '#ffffff',
                    color: '#000000',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                    <span style={{ fontSize: '0.75rem', padding: '0.1rem 0.5rem', borderRadius: '6px', background: '#e2e8f0', color: '#1e293b', fontWeight: 'bold' }}>
                      {item.category}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#000000', lineHeight: '1.4' }}>
                    {item.title}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#475569', marginTop: '0.4rem' }}>
                    ステップ数: {item.nodes.length}個
                  </div>
                </div>
              ))
            )}
          </div>

          {/* 右：プレビュー・再編集・呼出実行エリア */}
          <div style={{ padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: '#ffffff', color: '#000000' }}>
            {previewItem ? (
              <>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <div>
                      <span style={{ fontSize: '0.8rem', color: '#2563eb', fontWeight: 'bold' }}>{previewItem.category}</span>
                      <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '0.2rem 0 0 0', color: '#000000' }}>{previewItem.title}</h3>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => setIsEditingLibraryItem(!isEditingLibraryItem)}
                        className="btn btn-secondary"
                        style={{ padding: '0.3rem 0.8rem', fontSize: '0.82rem', borderColor: '#2563eb', color: '#2563eb' }}
                      >
                        {isEditingLibraryItem ? '👁️ プレビュー' : '✏️ 編集'}
                      </button>
                      <button
                        onClick={() => handleDeleteItem(previewItem.id)}
                        className="btn"
                        style={{ padding: '0.3rem 0.8rem', fontSize: '0.82rem', background: '#ef4444', color: '#ffffff', border: 'none', fontWeight: 'bold' }}
                      >
                        🗑️ 削除
                      </button>
                    </div>
                  </div>

                  <div style={{ background: '#ffffff', borderRadius: '12px', padding: '0.5rem', border: '2px solid #cbd5e1' }}>
                    <EmbeddedFlowchart
                      key={previewItem.id}
                      data={{ nodes: previewItem.nodes, edges: previewItem.edges }}
                      editable={isEditingLibraryItem}
                      onSave={(newData) => {
                        const updatedItem = saveFlowchartToLibrary({
                          ...previewItem,
                          nodes: newData.nodes,
                          edges: newData.edges
                        });
                        setPreviewItem(updatedItem);
                        const updatedLib = getFlowchartLibrary();
                        setItems(updatedLib);
                      }}
                    />
                  </div>
                </div>

                <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--surface-border)' }}>
                  <button onClick={onClose} className="btn btn-secondary" style={{ padding: '0.6rem 1.2rem' }}>
                    キャンセル
                  </button>
                  <button
                    onClick={() => {
                      const tag = `\`\`\`flowchart:${previewItem.id}\n\`\`\``;
                      if (navigator.clipboard) {
                        navigator.clipboard.writeText(tag).catch(() => {});
                      }
                      onSelect(previewItem);
                      onClose();
                    }}
                    className="btn btn-primary"
                    style={{ padding: '0.6rem 1.5rem', fontWeight: 'bold' }}
                  >
                    📐 解説に追加
                  </button>
                </div>
              </>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-secondary)' }}>
                左のリストからフローチャートを選択してください。
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
