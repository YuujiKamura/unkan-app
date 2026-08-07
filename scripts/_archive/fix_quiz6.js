const fs = require('fs');
const file = 'src/components/SingleQuizClient.tsx';
const lines = fs.readFileSync(file, 'utf-8').split(/\r?\n/);

const out = [];
let i = 0;
while (i < lines.length) {
  const line = lines[i];

  if (line.includes('const [selectedOptions, setSelectedOptions] = useState')) {
    out.push(line);
    out.push('  const [selectedMultiOptions, setSelectedMultiOptions] = useState<Record<number, number>>({});');
    i++;
    continue;
  }

  if (line.includes('const correctOptionNumbers =')) {
    out.push('  const handleMultiSelect = (optionNumber: number, choiceNum: number) => {');
    out.push('    if (isAnswered) return;');
    out.push('    setSelectedMultiOptions(prev => ({');
    out.push('      ...prev,');
    out.push('      [optionNumber]: choiceNum');
    out.push('    }));');
    out.push('  };');
    out.push('');
    out.push(line);
    i++;
    continue;
  }

  if (line.includes('const isActuallyCorrect = checkIsVoided(currentQ) ? true :')) {
    out.push('  const isActuallyCorrect = checkIsVoided(currentQ) ? true : currentQ.format === \'MULTI_GROUP\' ? (currentQ.correctOptions && Object.keys(selectedMultiOptions).length === currentQ.options?.length && currentQ.options.every((opt: any, idx: number) => selectedMultiOptions[opt.optionNumber] === currentQ.correctOptions[idx])) : (correctOptionNumbers.length > 0 && selectedOptions.length === correctOptionNumbers.length && selectedOptions.every(n => correctOptionNumbers.includes(n)));');
    i++;
    continue;
  }

  if (line.includes('const submitAnswer = async () => {')) {
    out.push(line);
    out.push('    const isMultiMode = currentQ.format === \'MULTI_GROUP\';');
    out.push('    if (isAnswered) return;');
    out.push('    if (isMultiMode && Object.keys(selectedMultiOptions).length === 0) return;');
    out.push('    if (!isMultiMode && selectedOptions.length === 0) return;');
    out.push('    setIsAnswered(true);');
    
    // skip the old submitAnswer logic until try {
    i++;
    while (i < lines.length && !lines[i].includes('try {')) {
      i++;
    }
    continue;
  }

  if (line.includes('selectedOptions: selectedOptions.join')) {
    out.push('        selectedOptions: isMultiMode ? JSON.stringify(selectedMultiOptions) : selectedOptions.join(\',\'),');
    i++;
    continue;
  }

  if (line.includes('onSelectOption={handleSelect}')) {
    out.push(line);
    out.push('                onSelectMultiOption={handleMultiSelect}');
    out.push('                selectedMultiOptions={selectedMultiOptions}');
    i++;
    continue;
  }

  out.push(line);
  i++;
}

fs.writeFileSync(file, out.join('\n'), 'utf-8');
console.log('Done 6');
