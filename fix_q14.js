const fs = require('fs');
const file = 'src/components/QuestionOptionsRenderer.tsx';
const lines = fs.readFileSync(file, 'utf-8').split(/\r?\n/);
const out = [
  ...lines.slice(0, 78),
  '          return (',
  '            <div key={opt.optionNumber} style={{ padding: \'1rem\', background: \'var(--surface-color)\', borderRadius: \'12px\', border: `1px solid ${isOptionRowWrong ? \'var(--error)\' : isOptionRowCorrect ? \'var(--success)\' : \'var(--surface-border)\'}` }}>',
  '              <div style={{ fontWeight: \'bold\', marginBottom: \'0.5rem\' }}>{parsed.title}</div>',
  ...lines.slice(93)
];
fs.writeFileSync(file, out.join('\n'), 'utf-8');
console.log("Done 14");
