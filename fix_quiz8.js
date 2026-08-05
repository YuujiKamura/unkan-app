const fs = require('fs');
const file = 'src/components/SingleQuizClient.tsx';
const lines = fs.readFileSync(file, 'utf-8').split(/\r?\n/);

const out = [];
let isMultiModeAdded = false;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];

  // コンポーネントの先頭の state 定義付近に追加
  if (!isMultiModeAdded && line.includes('const [currentQ, setCurrentQ] = useState(initialQuestion);')) {
    out.push(line);
    out.push('  const isMultiMode = currentQ.format === \'MULTI_GROUP\';');
    isMultiModeAdded = true;
    continue;
  }

  // submitAnswerの中の isMultiMode 定義は削除
  if (line.includes('const isMultiMode = currentQ.format === \'MULTI_GROUP\';')) {
    if (line.trim().startsWith('const isMultiMode')) {
      continue;
    }
  }

  out.push(line);
}

fs.writeFileSync(file, out.join('\n'), 'utf-8');
console.log('Done 8');
