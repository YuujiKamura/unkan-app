const fs = require('fs');
const file = 'src/components/SingleQuizClient.tsx';
const lines = fs.readFileSync(file, 'utf-8').split(/\r?\n/);

const out = [];
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];

  if (line.includes('const isActuallyCorrect = checkIsVoided(currentQ) ? true :')) {
    out.push('  // Find unique groups for correct evaluation');
    out.push('  let multiGroupsCount = 0;');
    out.push('  let uniqueGroupOptNumbers: number[] = [];');
    out.push('  if (currentQ.format === \'MULTI_GROUP\' && currentQ.options) {');
    out.push('    const seen = new Set();');
    out.push('    currentQ.options.forEach((o: any) => {');
    out.push('      if (o.structuredData) {');
    out.push('        try { const p = JSON.parse(o.structuredData); if (!seen.has(p.title)) { seen.add(p.title); uniqueGroupOptNumbers.push(o.optionNumber); } } catch(e){}');
    out.push('      }');
    out.push('    });');
    out.push('    multiGroupsCount = uniqueGroupOptNumbers.length;');
    out.push('  }');
    out.push('');
    out.push('  const isActuallyCorrect = checkIsVoided(currentQ) ? true : currentQ.format === \'MULTI_GROUP\' ? Boolean(currentQ.correctOptions && multiGroupsCount > 0 && Object.keys(selectedMultiOptions).length === multiGroupsCount && currentQ.correctOptions.every((correctNum: number, idx: number) => selectedMultiOptions[uniqueGroupOptNumbers[idx]] === correctNum)) : (correctOptionNumbers.length > 0 && selectedOptions.length === correctOptionNumbers.length && selectedOptions.every(n => correctOptionNumbers.includes(n)));');
    continue;
  }
  
  if (line.trim() === 'if (isMultiMode && Object.keys(selectedMultiOptions).length === 0) return;') {
    // 完全に答えていなくても途中で送信はできるようにするか？
    // いや、「解答する」ボタンが出る条件は「一つでも選んだら」にしている。
    // そのままにする。
  }

  out.push(line);
}

fs.writeFileSync(file, out.join('\n'), 'utf-8');
console.log('Done 13');
