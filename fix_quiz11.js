const fs = require('fs');
const file = 'src/components/SingleQuizClient.tsx';
const lines = fs.readFileSync(file, 'utf-8').split(/\r?\n/);

const out = [];
for (let i = 0; i < lines.length; i++) {
  let line = lines[i];

  if (line.includes('const getCorrectAnswersText = (q: any) => {')) {
    out.push(line);
    out.push('    if (q.format === \'MULTI_GROUP\' && q.correctOptions) {');
    out.push('      return q.correctOptions.join(\', \');');
    out.push('    }');
    continue;
  }

  // 判定部分
  if (line.includes('borderTop: `4px solid ${selectedOptions.length === 0 ?')) {
    line = line.replace('selectedOptions.length === 0', '(selectedOptions.length === 0 && Object.keys(selectedMultiOptions).length === 0)');
  }

  if (line.includes('color: selectedOptions.length === 0 ?')) {
    line = line.replace('selectedOptions.length === 0', '(selectedOptions.length === 0 && Object.keys(selectedMultiOptions).length === 0)');
  }

  if (line.trim() === '{selectedOptions.length === 0') {
    line = line.replace('{selectedOptions.length === 0', '{(selectedOptions.length === 0 && Object.keys(selectedMultiOptions).length === 0)');
  }
  
  if (line.trim() === '!hasSavedReasoning && selectedOptions.length > 0 && (') {
    line = line.replace('selectedOptions.length > 0', '(selectedOptions.length > 0 || (isMultiMode && Object.keys(selectedMultiOptions).length > 0))');
  }

  out.push(line);
}

fs.writeFileSync(file, out.join('\n'), 'utf-8');
console.log('Done 11');
