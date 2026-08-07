const fs = require('fs');
const file = 'src/components/SingleQuizClient.tsx';
let content = fs.readFileSync(file, 'utf-8');

// 1. handleMultiSelect と isActuallyCorrect
const idx1 = content.indexOf('  const correctOptionNumbers =');
const idx2 = content.indexOf('  const submitAnswer = async () => {');

const beforeIdx1 = content.slice(0, idx1);
const afterIdx2 = content.slice(idx2);

const replacement1 =   const handleMultiSelect = (optionNumber: number, choiceNum: number) => {
    if (isAnswered) return;
    setSelectedMultiOptions(prev => ({
      ...prev,
      [optionNumber]: choiceNum
    }));
  };

  const correctOptionNumbers = (currentQ.options || []).filter((o: any) => o.isCorrect).map((o: any) => o.optionNumber).sort();
  const isActuallyCorrect = checkIsVoided(currentQ) ? true : currentQ.format === 'MULTI_GROUP' ? (currentQ.correctOptions && Object.keys(selectedMultiOptions).length === currentQ.options?.length && currentQ.options.every((opt: any, i: number) => selectedMultiOptions[opt.optionNumber] === currentQ.correctOptions[i])) : (correctOptionNumbers.length > 0 && selectedOptions.length === correctOptionNumbers.length && selectedOptions.every(n => correctOptionNumbers.includes(n)));

;

// 2. submitAnswer
const idx3 = afterIdx2.indexOf('      if (attemptData && attemptData.id) {');
const beforeIdx3 = afterIdx2.slice(0, idx3);
const afterIdx3 = afterIdx2.slice(idx3);

const replacement2 =   const submitAnswer = async () => {
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
      });
;

fs.writeFileSync(file, beforeIdx1 + replacement1 + replacement2 + afterIdx3, 'utf-8');
console.log('Done 3');
