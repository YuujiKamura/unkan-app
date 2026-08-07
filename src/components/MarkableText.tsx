import React from 'react';
import ReactDOM from 'react-dom';

export interface CorrectionItem {
  id?: number;
  optionNumber: number; // 0 = 問題文自体、1以上 = 選択肢番号
  selectedText: string;
  startOffset: number;
  endOffset: number;
  correctionText: string;
  _justCreated?: boolean; // このレンダーセッション中に自分で作成したマーク(解答前でも即表示してよい)
}

interface MarkableTextProps {
  questionId: number;
  slotNumber: number; // 0 = 問題文、1以上 = 選択肢番号。同じ問題内で複数箇所を独立してマークできるようにする識別子
  content: string;
  fallbackText?: string;
  corrections: CorrectionItem[]; // currentQ.corrections をそのまま渡してよい、内部で slotNumber によって絞り込む
  isAnswered: boolean;
  onAddCorrection?: (payload: {
    questionId: number;
    optionNumber: number;
    selectedText: string;
    startOffset: number;
    endOffset: number;
    correctionText: string;
  }) => void | Promise<void>;
  onDeleteCorrection?: (id: number, questionId: number) => void | Promise<void>;
  onUpdateCorrection?: (id: number, questionId: number, correctionText: string) => void | Promise<void>;
  as?: 'span' | 'div';
  style?: React.CSSProperties;
}

// 選択肢・問題文いずれの領域でも「右クリック→誤りとしてマーク→文字ピッカーで範囲選択→
// 訂正コメント(空欄可)を入力して保存」という同じ操作フローを提供する自己完結コンポーネント。
// ブラウザのネイティブテキスト選択には依存しない(button内外問わず安定させるため自前実装)。
export default function MarkableText({
  questionId,
  slotNumber,
  content,
  fallbackText,
  corrections,
  isAnswered,
  onAddCorrection,
  onDeleteCorrection,
  onUpdateCorrection,
  as = 'span',
  style
}: MarkableTextProps) {
  const [contextMenu, setContextMenu] = React.useState<{ x: number; y: number; text: string } | null>(null);

  const [isPicking, setIsPicking] = React.useState(false);
  const [pickStart, setPickStart] = React.useState<number | null>(null);
  const [pickEnd, setPickEnd] = React.useState<number | null>(null);
  const [isPickDragging, setIsPickDragging] = React.useState(false);
  // onMouseEnter は onMouseDown 直後に(同期的に、Reactの再レンダーを待たず)連続発火し得るため、
  // state (次の再レンダーまで反映されない)ではなく ref (即座に読める)でドラッグ中フラグを持つ。
  // state 版はクリーンアップ用 useEffect の依存にのみ使う。
  const isPickDraggingRef = React.useRef(false);
  const [pickCorrectionText, setPickCorrectionText] = React.useState('');

  const [activePopup, setActivePopup] = React.useState<{
    x: number;
    y: number;
    id: number | undefined;
    selectedText: string;
    correctionText: string;
  } | null>(null);
  const [isPopupEditing, setIsPopupEditing] = React.useState(false);
  const [popupEditText, setPopupEditText] = React.useState('');

  React.useEffect(() => {
    const handleClickOutside = () => {
      setContextMenu(null);
      setActivePopup(null);
      setIsPopupEditing(false);
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  React.useEffect(() => {
    if (!isPickDragging) return;
    const handleMouseUp = () => {
      isPickDraggingRef.current = false;
      setIsPickDragging(false);
    };
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, [isPickDragging]);

  const exitPickingMode = () => {
    setIsPicking(false);
    setPickStart(null);
    setPickEnd(null);
    setIsPickDragging(false);
    setPickCorrectionText('');
  };

  const renderContextMenu = () => {
    if (!contextMenu) return null;
    const maxW = typeof window !== 'undefined' ? window.innerWidth : 1000;
    const maxH = typeof window !== 'undefined' ? window.innerHeight : 1000;
    const posX = contextMenu.x + 250 > maxW ? maxW - 250 : contextMenu.x;
    const posY = contextMenu.y + 190 > maxH ? maxH - 190 : contextMenu.y;

    if (typeof document === 'undefined') return null;
    return ReactDOM.createPortal(
      <div style={{
        position: 'fixed',
        top: posY,
        left: posX,
        background: '#1e293b',
        border: '1px solid #475569',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
        padding: '0.5rem',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        minWidth: '220px'
      }}>
        <button
          className="btn"
          style={{ textAlign: 'left', padding: '0.5rem', background: 'transparent', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '0.9rem' }}
          onClick={(e) => {
            e.stopPropagation();
            window.open('https://www.google.com/search?q=' + encodeURIComponent(contextMenu.text), '_blank');
            setContextMenu(null);
          }}
        >
          🔍 Googleで検索する
        </button>
        <div style={{ height: '1px', background: '#334155', margin: '0.2rem 0' }} />
        <button
          className="btn"
          style={{ textAlign: 'left', padding: '0.5rem', background: 'transparent', color: '#38bdf8', border: 'none', cursor: 'pointer', fontSize: '0.9rem' }}
          onClick={async (e) => {
            e.stopPropagation();
            try {
              await navigator.clipboard.writeText(contextMenu.text);
            } catch (err) {
              console.error('コピーに失敗しました。', err);
            }
            setContextMenu(null);
          }}
        >
          📋 クリップボードにコピー
        </button>
        <div style={{ height: '1px', background: '#334155', margin: '0.2rem 0' }} />
        <button
          className="btn"
          style={{ textAlign: 'left', padding: '0.5rem', background: 'transparent', color: '#f87171', border: 'none', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 'bold' }}
          onClick={(e) => {
            e.stopPropagation();
            setIsPicking(true);
            setPickStart(null);
            setPickEnd(null);
            setPickCorrectionText('');
            setContextMenu(null);
          }}
        >
          🔴 文章の一部を誤りとしてマーク
        </button>
      </div>,
      document.body
    );
  };

  const renderPopup = () => {
    if (!activePopup) return null;
    const maxW = typeof window !== 'undefined' ? window.innerWidth : 1000;
    const maxH = typeof window !== 'undefined' ? window.innerHeight : 1000;
    const posX = activePopup.x + 280 > maxW ? maxW - 280 : activePopup.x;
    const posY = activePopup.y + 140 > maxH ? maxH - 140 : activePopup.y;

    if (typeof document === 'undefined') return null;
    return ReactDOM.createPortal(
      <div
        style={{
          position: 'fixed',
          top: posY,
          left: posX,
          background: '#1e293b',
          border: '1px solid #f87171',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
          padding: '0.8rem',
          zIndex: 9999,
          maxWidth: '260px'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ fontSize: '0.75rem', color: '#f87171', marginBottom: '0.4rem', fontWeight: 'bold' }}>
          ✏️ 訂正: 「{activePopup.selectedText}」
        </div>

        {isPopupEditing ? (
          <>
            <textarea
              autoFocus
              value={popupEditText}
              onChange={(e) => setPopupEditText(e.target.value)}
              placeholder="正しい内容・訂正コメント(空欄可)"
              style={{ width: '100%', minHeight: '60px', fontSize: '0.85rem', marginBottom: '0.6rem', boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button
                onClick={(e) => { e.stopPropagation(); setIsPopupEditing(false); }}
                className="btn"
                style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem', background: 'transparent', color: '#94a3b8', border: '1px solid #475569', borderRadius: '6px', cursor: 'pointer' }}
              >
                キャンセル
              </button>
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  const popup = activePopup;
                  const text = popupEditText.trim();
                  setActivePopup(null);
                  setIsPopupEditing(false);
                  if (onUpdateCorrection && popup && popup.id !== undefined) {
                    await onUpdateCorrection(popup.id, questionId, text);
                  }
                }}
                className="btn btn-primary"
                style={{ padding: '0.25rem 0.8rem', fontSize: '0.75rem' }}
              >
                保存
              </button>
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize: '0.9rem', color: '#e2e8f0', marginBottom: '0.6rem', whiteSpace: 'pre-wrap' }}>
              {activePopup.correctionText || <span style={{ color: '#64748b', fontStyle: 'italic' }}>(訂正コメントなし)</span>}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setPopupEditText(activePopup.correctionText || '');
                  setIsPopupEditing(true);
                }}
                className="btn"
                style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem', background: 'transparent', color: '#38bdf8', border: '1px solid #38bdf8', borderRadius: '6px', cursor: 'pointer' }}
              >
                ✏️ 追記・編集
              </button>
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  const popup = activePopup;
                  setActivePopup(null);
                  if (onDeleteCorrection && popup && popup.id !== undefined) {
                    await onDeleteCorrection(popup.id, questionId);
                  }
                }}
                className="btn"
                style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem', background: 'transparent', color: '#94a3b8', border: '1px solid #475569', borderRadius: '6px', cursor: 'pointer' }}
              >
                🗑️ この訂正を削除
              </button>
            </div>
          </>
        )}
      </div>,
      document.body
    );
  };

  const renderContentWithCorrections = (): React.ReactNode => {
    const slotCorrections = (corrections || []).filter((c) => c.optionNumber === slotNumber && (isAnswered || c._justCreated));
    const valid = slotCorrections
      .filter((c) => typeof c.startOffset === 'number' && typeof c.endOffset === 'number' && c.startOffset >= 0 && c.endOffset <= content.length && c.endOffset > c.startOffset)
      .sort((a, b) => a.startOffset - b.startOffset);

    const nonOverlapping: CorrectionItem[] = [];
    let lastEnd = -1;
    for (const c of valid) {
      if (c.startOffset >= lastEnd) {
        nonOverlapping.push(c);
        lastEnd = c.endOffset;
      }
    }

    if (nonOverlapping.length === 0) return content || fallbackText || '';

    const nodes: React.ReactNode[] = [];
    let cursor = 0;
    nonOverlapping.forEach((c, idx: number) => {
      if (c.startOffset > cursor) {
        nodes.push(content.slice(cursor, c.startOffset));
      }
      nodes.push(
        <span
          key={`corr-${c.id ?? idx}`}
          style={{ color: '#f87171', fontWeight: 'bold', textDecoration: 'underline', textDecorationStyle: 'dotted', cursor: 'pointer' }}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            setActivePopup({
              x: e.clientX,
              y: e.clientY,
              id: c.id,
              selectedText: c.selectedText,
              correctionText: c.correctionText
            });
            setIsPopupEditing(!c.correctionText);
            setPopupEditText(c.correctionText || '');
          }}
        >
          {content.slice(c.startOffset, c.endOffset)}
        </span>
      );
      cursor = c.endOffset;
    });
    if (cursor < content.length) {
      nodes.push(content.slice(cursor));
    }
    return nodes;
  };

  const renderPicker = () => {
    const chars = Array.from(content);
    const rangeLo = pickStart !== null && pickEnd !== null ? Math.min(pickStart, pickEnd) : null;
    const rangeHi = pickStart !== null && pickEnd !== null ? Math.max(pickStart, pickEnd) : null;
    const hasRange = rangeLo !== null && rangeHi !== null;
    const selectedSlice = hasRange ? chars.slice(rangeLo!, rangeHi! + 1).join('') : '';

    return (
      <div
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        style={{ padding: '1.2rem', width: '100%', background: 'var(--surface-color)', border: '2px solid #f87171', borderRadius: '12px', boxSizing: 'border-box' }}
      >
        <div style={{ fontSize: '0.85rem', color: '#f87171', fontWeight: 'bold', marginBottom: '0.6rem' }}>
          誤りの箇所をクリック、またはドラッグで選択してください
        </div>
        <div style={{ fontSize: '1.1rem', lineHeight: '2', userSelect: 'none' }}>
          {chars.map((ch, i) => {
            const inRange = hasRange && i >= rangeLo! && i <= rangeHi!;
            return (
              <span
                key={i}
                onMouseDown={(e) => {
                  e.preventDefault();
                  isPickDraggingRef.current = true;
                  setIsPickDragging(true);
                  setPickStart(i);
                  setPickEnd(i);
                }}
                onMouseEnter={() => {
                  if (isPickDraggingRef.current) setPickEnd(i);
                }}
                style={{
                  background: inRange ? 'rgba(248, 113, 113, 0.4)' : 'transparent',
                  color: inRange ? '#f87171' : 'inherit',
                  fontWeight: inRange ? 'bold' : 'normal',
                  cursor: 'pointer',
                  whiteSpace: 'pre-wrap'
                }}
              >
                {ch}
              </span>
            );
          })}
        </div>

        {hasRange && (
          <div style={{ marginTop: '0.8rem' }}>
            <div style={{ fontSize: '0.8rem', color: '#f87171', marginBottom: '0.4rem' }}>
              選択中: 「{selectedSlice}」
            </div>
            <textarea
              autoFocus
              value={pickCorrectionText}
              onChange={(e) => setPickCorrectionText(e.target.value)}
              placeholder="正しい内容・訂正コメント(空欄でも保存可。後から追記もできます)"
              style={{ width: '100%', minHeight: '60px', fontSize: '0.85rem', boxSizing: 'border-box' }}
            />
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.8rem' }}>
          <button
            onClick={exitPickingMode}
            className="btn"
            style={{ padding: '0.4rem 0.9rem', fontSize: '0.85rem', background: 'transparent', color: '#94a3b8', border: '1px solid #475569', borderRadius: '6px', cursor: 'pointer' }}
          >
            キャンセル
          </button>
          <button
            disabled={!hasRange}
            onClick={async () => {
              if (!hasRange) return;
              const payload = {
                questionId,
                optionNumber: slotNumber,
                selectedText: selectedSlice,
                startOffset: rangeLo!,
                endOffset: rangeHi! + 1,
                correctionText: pickCorrectionText.trim()
              };
              exitPickingMode();
              if (onAddCorrection) await onAddCorrection(payload);
            }}
            className="btn btn-primary"
            style={{ padding: '0.4rem 1rem', fontSize: '0.85rem', opacity: hasRange ? 1 : 0.5 }}
          >
            保存
          </button>
        </div>
      </div>
    );
  };

  if (isPicking) {
    return renderPicker();
  }

  const Tag = as;
  return (
    <>
      <Tag
        style={style}
        onContextMenu={(e: React.MouseEvent) => {
          e.preventDefault();
          setContextMenu({ x: e.clientX, y: e.clientY, text: content || fallbackText || '' });
        }}
      >
        {renderContentWithCorrections()}
      </Tag>
      {renderContextMenu()}
      {renderPopup()}
    </>
  );
}
