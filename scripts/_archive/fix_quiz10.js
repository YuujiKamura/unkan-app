const fs = require('fs');
const file = 'src/components/SingleQuizClient.tsx';
const lines = fs.readFileSync(file, 'utf-8').split(/\r?\n/);

const out = [];
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];

  if (line.includes('const isActuallyCorrect = checkIsVoided(currentQ) ? true :')) {
    out.push('  const isActuallyCorrect = checkIsVoided(currentQ) ? true : currentQ.format === \'MULTI_GROUP\' ? Boolean(currentQ.correctOptions && Object.keys(selectedMultiOptions).length === currentQ.options?.length && currentQ.options.every((opt: any, idx: number) => selectedMultiOptions[opt.optionNumber] === currentQ.correctOptions[idx])) : (correctOptionNumbers.length > 0 && selectedOptions.length === correctOptionNumbers.length && selectedOptions.every(n => correctOptionNumbers.includes(n)));');
    continue;
  }

  out.push(line);
}

fs.writeFileSync(file, out.join('\n'), 'utf-8');
console.log('Done 10');
