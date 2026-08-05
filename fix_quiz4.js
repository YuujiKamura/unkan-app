const fs = require('fs');
const file = 'src/components/SingleQuizClient.tsx';
let content = fs.readFileSync(file, 'utf-8');

// 1. selectedMultiOptions を追加
content = content.replace(
  'const [selectedOptions, setSelectedOptions] = useState<number[]>([]);\n  const [isAnswered, setIsAnswered] = useState(mode === \'explain\');',
  'const [selectedOptions, setSelectedOptions] = useState<number[]>([]);\n  const [selectedMultiOptions, setSelectedMultiOptions] = useState<Record<number, number>>({});\n  const [isAnswered, setIsAnswered] = useState(mode === \'explain\');'
);

// 2. handleMultiSelect と isActuallyCorrect を追加
const target2 = '  const correctOptionNumbers = (currentQ.options || []).filter((o: any) => o.isCorrect).map((o: any) => o.optionNumber).sort();\n  const isActuallyCorrect = checkIsVoided(currentQ) ? true : (correctOptionNumbers.length > 0 && selectedOptions.length === correctOptionNumbers.length && selectedOptions.every(n => correctOptionNumbers.includes(n)));';
const replace2 =   const handleMultiSelect = (optionNumber: number, choiceNum: number) => {
    if (isAnswered) return;
    setSelectedMultiOptions(prev => ({
      ...prev,
      [optionNumber]: choiceNum
    }));
  };

  const correctOptionNumbers = (currentQ.options || []).filter((o: any) => o.isCorrect).map((o: any) => o.optionNumber).sort();
  const isActuallyCorrect = checkIsVoided(currentQ) ? true : currentQ.format === 'MULTI_GROUP' ? (currentQ.correctOptions && Object.keys(selectedMultiOptions).length === currentQ.options?.length && currentQ.options.every((opt: any, i: number) => selectedMultiOptions[opt.optionNumber] === currentQ.correctOptions[i])) : (correctOptionNumbers.length > 0 && selectedOptions.length === correctOptionNumbers.length && selectedOptions.every(n => correctOptionNumbers.includes(n)));;
content = content.replace(target2, replace2);

// 3. submitAnswer を修正
const target3 =   const submitAnswer = async () => {
    if (isAnswered || selectedOptions.length === 0) return;
    setIsAnswered(true);
    
    try {
      const attemptData = await apiClient.saveAttempt({
        questionId: currentQ.id,
        selectedOptions: selectedOptions.join(','),
        isCorrect: isActuallyCorrect,
        judgments
      });;
const replace3 =   const submitAnswer = async () => {
    const isMultiMode = currentQ.format === 'MULTI_GROUP';
    if (isAnswered) return;
    if (isMultiMode && Object.keys(selectedMultiOptions).length === 0) return;
    if (!isMultiMode && selectedOptions.length === 0) return;
    setIsAnswered(true);
    
    try {
      const attemptData = await apiClient.saveAttempt({
        questionId: currentQ.id,
        selectedOptions: isMultiMode ? JSON.stringify(selectedMultiOptions) : selectedOptions.join(','),
        isCorrect: isActuallyCorrect,
        judgments
      });;
content = content.replace(target3, replace3);

// 4. JSXにプロパティを渡す
const target4 =                 isAnswered={isAnswered}
                onSelectOption={handleSelect}
                isOptionFactuallyCorrect={isOptionFactuallyCorrect};
const replace4 =                 isAnswered={isAnswered}
                onSelectOption={handleSelect}
                onSelectMultiOption={handleMultiSelect}
                selectedMultiOptions={selectedMultiOptions}
                isOptionFactuallyCorrect={isOptionFactuallyCorrect};
content = content.replace(target4, replace4);

fs.writeFileSync(file, content, 'utf-8');
console.log('Done 4');
