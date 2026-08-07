const fs = require('fs');
const file = 'src/components/QuestionOptionsRenderer.tsx';
let content = fs.readFileSync(file, 'utf-8');

// 1. Add Context Menu State
const stateInsert = `
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

    return (
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
            const prompt = "以下の選択肢について、法的根拠を含めて解説してください:\\n\\n【問題文】\\n" + contextMenu.questionText + "\\n\\n【対象の選択肢】\\n" + contextMenu.text;
            try {
              await navigator.clipboard.writeText(prompt);
              alert('解説依頼プロンプトをクリップボードにコピーしました。\\nターミナルに貼り付けて送信してください。');
            } catch(err) {
              alert('コピーに失敗しました。');
            }
            setContextMenu(null);
          }}
        >
          🤖 AIに解説を求める(コピー)
        </button>
      </div>
    );
  };
`;

content = content.replace('const correctOptionNumbers =', stateInsert + '\n  const correctOptionNumbers =');

// 2. Wrap MultiGroup return
content = content.replace(
  'return (\n      <div style={{ display: \'flex\', flexDirection: \'column\', gap: \'1rem\' }}>',
  'return (\n      <>\n      <div style={{ display: \'flex\', flexDirection: \'column\', gap: \'1rem\' }}>'
);
content = content.replace(
  '        })}\n      </div>\n    );\n  }',
  '        })}\n      </div>\n      {renderContextMenu()}\n      </>\n    );\n  }'
);

// 3. Add onContextMenu to MultiGroup buttons
content = content.replace(
  'onClick={() => onSelectMultiOption && onSelectMultiOption(opt.optionNumber, choice.num)}\n                      disabled={isAnswered}',
  'onClick={() => onSelectMultiOption && onSelectMultiOption(opt.optionNumber, choice.num)}\n                      disabled={isAnswered}\n                      onContextMenu={(e) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, text: choice.text, questionText: currentQ.content || \'\' }); }}'
);

// 4. Wrap Single return
content = content.replace(
  '// DEFAULT (SINGLE or MULTI_SELECT)\n  return (\n    <div style={{ display: \'flex\', flexDirection: \'column\', gap: \'1rem\' }}>',
  '// DEFAULT (SINGLE or MULTI_SELECT)\n  return (\n    <>\n    <div style={{ display: \'flex\', flexDirection: \'column\', gap: \'1rem\' }}>'
);
content = content.replace(
  '      })}\n    </div>\n  );\n}',
  '      })}\n    </div>\n    {renderContextMenu()}\n    </>\n  );\n}'
);

// 5. Add onContextMenu to Single buttons
content = content.replace(
  'onClick={() => onSelectOption(opt.optionNumber)}\n              disabled={showJudgments ? false : undefined} // SingleQuizClient relies on onSelectOption toggling',
  'onClick={() => onSelectOption(opt.optionNumber)}\n              disabled={showJudgments ? false : undefined}\n              onContextMenu={(e) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, text: opt.content || `選択肢 ${opt.optionNumber}`, questionText: currentQ.content || \'\' }); }}'
);

fs.writeFileSync(file, content, 'utf-8');
console.log('Successfully injected Context Menu into QuestionOptionsRenderer.tsx');
