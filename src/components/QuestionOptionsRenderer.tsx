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
  toggleJudgment
}: QuestionOptionsRendererProps) {
  
  
  const [contextMenu, setContextMenu] = React.useState<{x: number, y: number, text: string, questionText: string} | null>(null);

  React.useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
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
      </div>,
      document.body
    );
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
              onContextMenu={(e) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, text: opt.content || `選択肢 ${opt.optionNumber}`, questionText: currentQ.content || '' }); }}
            >
              <span style={{ fontWeight: 'bold', marginRight: '1rem', opacity: 0.7 }}>{opt.optionNumber}.</span> 
              {opt.content || `選択肢 ${opt.optionNumber}`}
            </button>
          </div>
        );
      })}
    </div>
    {renderContextMenu()}
    </>
  );
}
