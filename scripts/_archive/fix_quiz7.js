const fs = require('fs');
const file = 'src/components/SingleQuizClient.tsx';
const lines = fs.readFileSync(file, 'utf-8').split(/\r?\n/);

const out = [];
let i = 0;
while (i < lines.length) {
  let line = lines[i];

  if (line.includes('onSelectOption={handleOptionSelect}')) {
    out.push('                onSelectOption={handleSelect}');
    out.push('                onSelectMultiOption={handleMultiSelect}');
    out.push('                selectedMultiOptions={selectedMultiOptions}');
    i++;
    continue;
  }

  out.push(line);
  i++;
}

fs.writeFileSync(file, out.join('\n'), 'utf-8');
console.log('Done 7');
