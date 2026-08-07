const fs = require('fs');
const file = 'src/components/SingleQuizClient.tsx';
const lines = fs.readFileSync(file, 'utf-8').split(/\r?\n/);

const out = [];
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];

  if (line.includes('{selectedOptions.length > 0 && (')) {
    out.push('                  {(selectedOptions.length > 0 || (isMultiMode && Object.keys(selectedMultiOptions).length > 0)) && (');
    continue;
  }
  
  // また、念のためもうひとつのボタンにも
  if (line.includes('setSelectedOptions([]); // 解答なし閲覧')) {
    out.push(line);
    out.push('                      if (isMultiMode) setSelectedMultiOptions({});');
    continue;
  }

  out.push(line);
}

fs.writeFileSync(file, out.join('\n'), 'utf-8');
console.log('Done 9');
