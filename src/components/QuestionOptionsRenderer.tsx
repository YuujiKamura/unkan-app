import React from 'react';
import ReactDOM from 'react-dom';

export interface Question {
  id: number;
  format?: string;
  correctOptions?: number[]; // Added for compatibility if available
  options?: any[];
  [key: string]: any;
}

interface QuestionOptionsRendererProps {
  currentQ: Question;
  selectedOptions: number[]; // 複数選択に対応するため配列
  isAnswered: boolean;
  onSelectOption: (optionNumber: number) => void;
  // MultiGroup用のハンドラ
  onSelectMultiOption?: (optionNumber: number, choiceNum: number) => void;
  selectedMultiOptions?: Record<number, number>; // { optNumber: choiceNum }
  // 単独選択肢の判定用
  isOptionFactuallyCorrect?: (q: any, optNum: number) => boolean;
  checkIsVoided?: (q: any) => boolean;
  // ◯/✕ 判断ボタン用 (SingleQuizClient 固有)
  showJudgments?: boolean;
  judgments?: Record<string, string>;
  toggleJudgment?: (e: React.MouseEvent, label: string, val: 'O' | 'X') => void;
  // 正答肢の一部を「誤り」としてマーク・訂正するアノテーション機能
  onAddCorrection?: (payload: {
    questionId: number;
    optionNumber: number;
    selectedText: string;
    startOffset: number;
    endOffset: number;
    correctionText: string;
  }) => void | Promise<void>;
  onDeleteCorrection?: (id: number, questionId: number) => void | Promise<void>;
}

interface OptionCorrectionItem {
  id?: number;
  optionNumber: number;
  selectedText: string;
  startOffset: number;
  endOffset: number;
  correctionText: string;
  _justCreated?: boolean; // このレンダーセッション中に自分で作成したマーク(解答前でも即表示してよい)
}

// 指定コンテナ内でのテキスト選択範囲を、コンテナのテキスト全体に対する文字インデックスとして取得する。
// 右クリック時に選択が保持されている場合のみ有効な値を返す（範囲外/選択なしは null）。
function getSelectionInfoWithin(containerEl: HTMLElement): { selectedText: string; startOffset: number; endOffset: number } | null {
  if (typeof window === 'undefined') return null;
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return null;
  const range = sel.getRangeAt(0);
  if (!containerEl.contains(range.commonAncestorContainer)) return null;

  const selectedText = range.toString();
  if (!selectedText.trim()) return null;

  const preRange = document.createRange();
  preRange.selectNodeContents(containerEl);
  preRange.setEnd(range.startContainer, range.startOffset);
  const startOffset = preRange.toString().length;
  const endOffset = startOffset + selectedText.length;

  return { selectedText, startOffset, endOffset };
}

export default function QuestionOptionsRenderer({
  currentQ,
  selectedOptions,
  isAnswered,
  onSelectOption,
  onSelectMultiOption,
  selectedMultiOptions = {},
  isOptionFactuallyCorrect,
  checkIsVoided,
  showJudgments,
  judgments,
  toggleJudgment,
  onAddCorrection,
  onDeleteCorrection
}: QuestionOptionsRendererProps) {


  const [contextMenu, setContextMenu] = React.useState<{
    x: number;
    y: number;
    text: string;
    questionText: string;
    correctionTarget?: { optionNumber: number; selectedText: string; startOffset: number; endOffset: number } | null;
  } | null>(null);

  // 正答肢の一部を「誤り」としてマークするための、選択範囲入力フロート
  const [correctionEditor, setCorrectionEditor] = React.useState<{
    x: number;
    y: number;
    optionNumber: number;
    selectedText: string;
    startOffset: number;
    endOffset: number;
  } | null>(null);
  const [correctionEditorText, setCorrectionEditorText] = React.useState('');

  // 保存済み訂正マークをクリックした際に表示するフロート
  const [activeCorrectionPopup, setActiveCorrectionPopup] = React.useState<{
    x: number;
    y: number;
    id: number | undefined;
    optionNumber: number;
    selectedText: string;
    correctionText: string;
  } | null>(null);

  React.useEffect(() => {
    const handleClickOutside = () => {
      setContextMenu(null);
      setCorrectionEditor(null);
      setActiveCorrectionPopup(null);
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const renderContextMenu = () => {
    if (!contextMenu) return null;
    
    // 画面外にはみ出ないように位置を調整
    const maxW = typeof window !== "undefined" ? window.innerWidth : 1000;
    const maxH = typeof window !== "undefined" ? window.innerHeight : 1000;
    const posX = contextMenu.x + 250 > maxW ? maxW - 250 : contextMenu.x;
    const posY = contextMenu.y + 150 > maxH ? maxH - 150 : contextMenu.y;

    if (typeof document === "undefined") return null;
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
          style={{textAlign: 'left', padding: '0.5rem', background: 'transparent', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '0.9rem'}}
          onClick={(e) => {
            e.stopPropagation();
            window.open('https://www.google.com/search?q=' + encodeURIComponent(contextMenu.text), '_blank');
            setContextMenu(null);
          }}
        >
          🔍 Googleで検索する
        </button>
        <div style={{height: '1px', background: '#334155', margin: '0.2rem 0'}} />
        <button 
          className="btn" 
          style={{textAlign: 'left', padding: '0.5rem', background: 'transparent', color: '#38bdf8', border: 'none', cursor: 'pointer', fontSize: '0.9rem'}}
          onClick={async (e) => {
            e.stopPropagation();
            try {
              await navigator.clipboard.writeText(contextMenu.text);
            } catch(err) {
              console.error('コピーに失敗しました。', err);
            }
            setContextMenu(null);
          }}
        >
          📋 クリップボードにコピー
        </button>
        {contextMenu.correctionTarget && (
          <>
            <div style={{height: '1px', background: '#334155', margin: '0.2rem 0'}} />
            <button
              className="btn"
              style={{textAlign: 'left', padding: '0.5rem', background: 'transparent', color: '#f87171', border: 'none', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 'bold'}}
              onClick={(e) => {
                e.stopPropagation();
                const target = contextMenu.correctionTarget!;
                setCorrectionEditor({ x: contextMenu.x, y: contextMenu.y, ...target });
                setCorrectionEditorText('');
                setContextMenu(null);
              }}
            >
              🔴 「{contextMenu.correctionTarget.selectedText.length > 12 ? contextMenu.correctionTarget.selectedText.slice(0, 12) + '…' : contextMenu.correctionTarget.selectedText}」を誤りとしてマーク
            </button>
          </>
        )}
      </div>,
      document.body
    );
  };

  const renderCorrectionEditor = () => {
    if (!correctionEditor) return null;
    const maxW = typeof window !== "undefined" ? window.innerWidth : 1000;
    const maxH = typeof window !== "undefined" ? window.innerHeight : 1000;
    const posX = correctionEditor.x + 300 > maxW ? maxW - 300 : correctionEditor.x;
    const posY = correctionEditor.y + 200 > maxH ? maxH - 200 : correctionEditor.y;

    if (typeof document === "undefined") return null;
    return ReactDOM.createPortal(
      <div
        style={{
          position: 'fixed',
          top: posY,
          left: posX,
          background: '#1e293b',
          border: '1px solid #ef4444',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
          padding: '0.8rem',
          zIndex: 9999,
          width: '280px'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ fontSize: '0.8rem', color: '#f87171', marginBottom: '0.5rem', fontWeight: 'bold' }}>
          誤りとしてマーク: 「{correctionEditor.selectedText}」
        </div>
        <textarea
          autoFocus
          value={correctionEditorText}
          onChange={(e) => setCorrectionEditorText(e.target.value)}
          placeholder="正しい内容・訂正コメントを入力"
          style={{ width: '100%', minHeight: '60px', fontSize: '0.85rem', marginBottom: '0.6rem', boxSizing: 'border-box' }}
        />
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
          <button
            onClick={(e) => { e.stopPropagation(); setCorrectionEditor(null); }}
            className="btn"
            style={{ padding: '0.3rem 0.7rem', fontSize: '0.8rem', background: 'transparent', color: '#94a3b8', border: '1px solid #475569', borderRadius: '6px', cursor: 'pointer' }}
          >
            キャンセル
          </button>
          <button
            disabled={!correctionEditorText.trim()}
            onClick={async (e) => {
              e.stopPropagation();
              const text = correctionEditorText.trim();
              if (!text) return;
              const target = correctionEditor;
              setCorrectionEditor(null);
              if (onAddCorrection && target) {
                await onAddCorrection({
                  questionId: currentQ.id,
                  optionNumber: target.optionNumber,
                  selectedText: target.selectedText,
                  startOffset: target.startOffset,
                  endOffset: target.endOffset,
                  correctionText: text
                });
              }
            }}
            className="btn btn-primary"
            style={{ padding: '0.3rem 0.9rem', fontSize: '0.8rem', opacity: correctionEditorText.trim() ? 1 : 0.5 }}
          >
            保存
          </button>
        </div>
      </div>,
      document.body
    );
  };

  const renderCorrectionPopup = () => {
    if (!activeCorrectionPopup) return null;
    const maxW = typeof window !== "undefined" ? window.innerWidth : 1000;
    const maxH = typeof window !== "undefined" ? window.innerHeight : 1000;
    const posX = activeCorrectionPopup.x + 280 > maxW ? maxW - 280 : activeCorrectionPopup.x;
    const posY = activeCorrectionPopup.y + 140 > maxH ? maxH - 140 : activeCorrectionPopup.y;

    if (typeof document === "undefined") return null;
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
          ✏️ 訂正: 「{activeCorrectionPopup.selectedText}」
        </div>
        <div style={{ fontSize: '0.9rem', color: '#e2e8f0', marginBottom: '0.6rem', whiteSpace: 'pre-wrap' }}>
          {activeCorrectionPopup.correctionText}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={async (e) => {
              e.stopPropagation();
              const popup = activeCorrectionPopup;
              setActiveCorrectionPopup(null);
              if (onDeleteCorrection && popup && popup.id !== undefined) {
                await onDeleteCorrection(popup.id, currentQ.id);
              }
            }}
            className="btn"
            style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem', background: 'transparent', color: '#94a3b8', border: '1px solid #475569', borderRadius: '6px', cursor: 'pointer' }}
          >
            🗑️ この訂正を削除
          </button>
        </div>
      </div>,
      document.body
    );
  };

  // isAnswered かつ対象が正答肢の場合のみ、保存済み訂正マークを本文に反映してレンダリングする。
  // (「問題を解答するまでは再表示されない」仕様のゲート)
  const renderContentWithCorrections = (content: string, corrections: OptionCorrectionItem[], optionNumber: number): React.ReactNode => {
    const valid = (corrections || [])
      .filter((c) => typeof c.startOffset === 'number' && typeof c.endOffset === 'number' && c.startOffset >= 0 && c.endOffset <= content.length && c.endOffset > c.startOffset)
      .sort((a, b) => a.startOffset - b.startOffset);

    const nonOverlapping: OptionCorrectionItem[] = [];
    let lastEnd = -1;
    for (const c of valid) {
      if (c.startOffset >= lastEnd) {
        nonOverlapping.push(c);
        lastEnd = c.endOffset;
      }
    }

    if (nonOverlapping.length === 0) return content;

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
            setActiveCorrectionPopup({
              x: e.clientX,
              y: e.clientY,
              id: c.id,
              optionNumber,
              selectedText: c.selectedText,
              correctionText: c.correctionText
            });
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

  const correctOptionNumbers = (currentQ.options || []).filter((o: any) => o.isCorrect).map((o: any) => o.optionNumber);
  const options = [...(currentQ.options && currentQ.options.length > 0 ? currentQ.options : [
    { optionNumber: 1, content: '' },
    { optionNumber: 2, content: '' },
    { optionNumber: 3, content: '' },
    { optionNumber: 4, content: '' }
  ])].sort((a: any, b: any) => a.optionNumber - b.optionNumber);

  if (currentQ.format === 'MULTI_GROUP') {
    // Remove duplicates based on structuredData.title
    const uniqueGroups = [];
    const seenTitles = new Set();
    for (const opt of options) {
      if (opt.structuredData) {
        try {
          const parsed = JSON.parse(opt.structuredData);
          if (!seenTitles.has(parsed.title)) {
            seenTitles.add(parsed.title);
            uniqueGroups.push(opt);
          }
        } catch(e) {}
      }
    }
    
    return (
      <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {uniqueGroups.map((opt: any, i: number) => {
          let parsed: any = null;
          if (opt.structuredData) {
            try {
              parsed = JSON.parse(opt.structuredData);
            } catch (e) {}
          }
          if (!parsed) return null;

          const userChoiceGlobalNum = selectedMultiOptions[opt.optionNumber] ? opt.optionNumber + selectedMultiOptions[opt.optionNumber] - 1 : null;
          const isOptionRowCorrect = isAnswered && userChoiceGlobalNum !== null && correctOptionNumbers && correctOptionNumbers.includes(userChoiceGlobalNum);
          const isOptionRowWrong = isAnswered && userChoiceGlobalNum !== null && correctOptionNumbers && !correctOptionNumbers.includes(userChoiceGlobalNum);

          return (
            <div key={opt.optionNumber} style={{ padding: '1rem', background: 'var(--surface-color)', borderRadius: '12px', border: `1px solid ${isOptionRowWrong ? 'var(--error)' : isOptionRowCorrect ? 'var(--success)' : 'var(--surface-border)'}` }}>
              <div style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>{parsed.title}</div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {parsed.choices.map((choice: any) => {
                  const isSelected = selectedMultiOptions[opt.optionNumber] === choice.num;
                  const globalOptionNumber = opt.optionNumber + choice.num - 1;
                  const isThisChoiceCorrect = isAnswered && correctOptionNumbers && correctOptionNumbers.includes(globalOptionNumber);
                  
                  let btnStyle: React.CSSProperties = { flex: 1, padding: '0.8rem', textAlign: 'center' };
                  let btnClass = isSelected ? "btn btn-primary" : "btn btn-secondary";

                  if (isAnswered) {
                    if (isThisChoiceCorrect) {
                      btnStyle.background = 'var(--success-glow)';
                      btnStyle.borderColor = 'var(--success)';
                      btnStyle.color = '#fff';
                    } else if (isSelected) {
                      btnStyle.background = 'var(--error-glow)';
                      btnStyle.borderColor = 'var(--error)';
                      btnStyle.color = '#fff';
                    }
                  }

                  return (
                    <button
                      key={choice.num}
                      className={btnClass}
                      style={btnStyle}
                      onClick={() => onSelectMultiOption && onSelectMultiOption(opt.optionNumber, choice.num)}
                      disabled={isAnswered}
                      onContextMenu={(e) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, text: choice.text, questionText: currentQ.content || '' }); }}
                    >
                      <span style={{opacity: 0.7, marginRight: '0.5rem'}}>{['①','②','③','④'][choice.num-1] || String(choice.num)}</span>
                      {choice.text}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      {renderContextMenu()}
      </>
    );
  }

  // DEFAULT (SINGLE or MULTI_SELECT)
  return (
    <>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {options.map((opt: any) => {
        let btnStyle: React.CSSProperties = { justifyContent: 'flex-start', padding: '1.2rem', width: '100%', textAlign: 'left', fontSize: '1.1rem' };
        let btnClass = "btn btn-secondary";
        
        const isSelected = selectedOptions.includes(opt.optionNumber);
        const isFactuallyCorrectOpt = !!isOptionFactuallyCorrect && isOptionFactuallyCorrect(currentQ, opt.optionNumber);
        // 訂正マークは正答肢のみに付けられる。表示は「解答済み」または「今回自分で作成したばかり」の
        // どちらかを満たす場合のみ — 過去に付けた訂正は再解答するまで再表示しない(答えの事前漏洩防止)が、
        // たった今作った自分のマークは即座に見えないと、解答前に付けたマークが一見消えたように見えてしまう。
        const optionCorrections = isFactuallyCorrectOpt
          ? ((currentQ.corrections || []) as OptionCorrectionItem[]).filter((c) => c.optionNumber === opt.optionNumber && (isAnswered || c._justCreated))
          : [];
        if (isAnswered) {
          if (isOptionFactuallyCorrect && isOptionFactuallyCorrect(currentQ, opt.optionNumber)) {
            // Success styling
            btnStyle.background = showJudgments ? 'rgba(5, 150, 105, 0.12)' : 'var(--success-glow)';
            btnStyle.borderColor = 'var(--success)';
            btnStyle.color = showJudgments ? 'var(--success)' : '#fff';
            if (showJudgments) btnStyle.fontWeight = 'bold';
          } else if (isSelected) {
            if (checkIsVoided && checkIsVoided(currentQ)) {
              btnStyle.background = showJudgments ? 'rgba(5, 150, 105, 0.12)' : 'var(--success-glow)';
              btnStyle.borderColor = 'var(--success)';
              btnStyle.color = showJudgments ? 'var(--success)' : '#fff';
              if (showJudgments) btnStyle.fontWeight = 'bold';
            } else {
              // Error styling
              btnStyle.background = showJudgments ? 'rgba(220, 38, 38, 0.12)' : 'var(--error-glow)';
              btnStyle.borderColor = 'var(--error)';
              btnStyle.color = showJudgments ? 'var(--error)' : '#fff';
              if (showJudgments) btnStyle.fontWeight = 'bold';
            }
          }
        } else if (isSelected) {
          btnClass = "btn btn-primary";
        }

        return (
          <div key={opt.optionNumber} style={{ display: 'flex', gap: '0.5rem', alignItems: 'stretch' }}>
            {showJudgments && judgments && toggleJudgment && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', justifyContent: 'center' }}>
                <button
                  onClick={(e) => toggleJudgment(e, opt.optionNumber.toString(), 'O')}
                  disabled={isAnswered}
                  style={{
                    padding: '0.3rem 0.5rem',
                    background: judgments[opt.optionNumber.toString()] === 'O' ? 'rgba(16, 185, 129, 0.2)' : 'var(--surface-color)',
                    border: `1px solid ${judgments[opt.optionNumber.toString()] === 'O' ? 'var(--success)' : 'var(--surface-border)'}`,
                    color: judgments[opt.optionNumber.toString()] === 'O' ? 'var(--success)' : 'var(--text-secondary)',
                    borderRadius: '8px',
                    cursor: isAnswered ? 'default' : 'pointer',
                    fontWeight: 'bold',
                    fontSize: '0.9rem',
                    flex: 1
                  }}
                >
                  ◯
                </button>
                <button
                  onClick={(e) => toggleJudgment(e, opt.optionNumber.toString(), 'X')}
                  disabled={isAnswered}
                  style={{
                    padding: '0.3rem 0.5rem',
                    background: judgments[opt.optionNumber.toString()] === 'X' ? 'rgba(239, 68, 68, 0.2)' : 'var(--surface-color)',
                    border: `1px solid ${judgments[opt.optionNumber.toString()] === 'X' ? 'var(--error)' : 'var(--surface-border)'}`,
                    color: judgments[opt.optionNumber.toString()] === 'X' ? 'var(--error)' : 'var(--text-secondary)',
                    borderRadius: '8px',
                    cursor: isAnswered ? 'default' : 'pointer',
                    fontWeight: 'bold',
                    fontSize: '0.9rem',
                    flex: 1
                  }}
                >
                  ✕
                </button>
              </div>
            )}
            <button
              className={btnClass}
              style={btnStyle}
              onClick={() => onSelectOption(opt.optionNumber)}
              disabled={showJudgments ? false : undefined}
              onContextMenu={(e) => {
                e.preventDefault();
                const containerEl = (e.currentTarget as HTMLElement).querySelector('[data-option-content]') as HTMLElement | null;
                const selInfo = containerEl ? getSelectionInfoWithin(containerEl) : null;
                const canMarkCorrection = !!selInfo && isFactuallyCorrectOpt;
                setContextMenu({
                  x: e.clientX,
                  y: e.clientY,
                  text: opt.content || `選択肢 ${opt.optionNumber}`,
                  questionText: currentQ.content || '',
                  correctionTarget: canMarkCorrection ? { optionNumber: opt.optionNumber, ...selInfo! } : null
                });
              }}
            >
              <span style={{ fontWeight: 'bold', marginRight: '1rem', opacity: 0.7 }}>{opt.optionNumber}.</span>
              <span data-option-content style={{ whiteSpace: 'pre-wrap' }}>
                {optionCorrections.length > 0
                  ? renderContentWithCorrections(opt.content || '', optionCorrections, opt.optionNumber)
                  : (opt.content || `選択肢 ${opt.optionNumber}`)}
              </span>
            </button>
          </div>
        );
      })}
    </div>
    {renderContextMenu()}
    {renderCorrectionEditor()}
    {renderCorrectionPopup()}
    </>
  );
}
