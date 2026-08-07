const fs = require('fs');
const file = 'src/components/SingleQuizClient.tsx';
let content = fs.readFileSync(file, 'utf-8');

// 1
content = content.replace(
  'const [selectedOptions, setSelectedOptions] = useState<number[]>([]);\n  const [isAnswered, setIsAnswered] = useState(mode === \'explain\');',
  'const [selectedOptions, setSelectedOptions] = useState<number[]>([]);\n  const [selectedMultiOptions, setSelectedMultiOptions] = useState<Record<number, number>>({});\n  const [isAnswered, setIsAnswered] = useState(mode === \'explain\');'
);

// 2
const submitStart = content.indexOf('  const submitAnswer = async () => {');
const beforeSubmit = content.slice(0, submitStart);
const afterSubmit = content.slice(submitStart);

const newBeforeSubmit = beforeSubmit.replace(
  '  const correctOptionNumbers = (currentQ.options || []).filter((o: any) => o.isCorrect).map((o: any) => o.optionNumber).sort();\n  const isActuallyCorrect = checkIsVoided(currentQ) ? true : (correctOptionNumbers.length > 0 && selectedOptions.length === correctOptionNumbers.length && selectedOptions.every(n => correctOptionNumbers.includes(n)));',
  '  const handleMultiSelect = (optionNumber: number, choiceNum: number) => {\n    if (isAnswered) return;\n    setSelectedMultiOptions(prev => ({\n      ...prev,\n      [optionNumber]: choiceNum\n    }));\n  };\n\n  const correctOptionNumbers = (currentQ.options || []).filter((o: any) => o.isCorrect).map((o: any) => o.optionNumber).sort();\n  const isActuallyCorrect = checkIsVoided(currentQ) ? true : currentQ.format === \'MULTI_GROUP\' ? (currentQ.correctOptions && Object.keys(selectedMultiOptions).length === currentQ.options?.length && currentQ.options.every((opt: any, i: number) => selectedMultiOptions[opt.optionNumber] === currentQ.correctOptions[i])) : (correctOptionNumbers.length > 0 && selectedOptions.length === correctOptionNumbers.length && selectedOptions.every(n => correctOptionNumbers.includes(n)));'
);

const newAfterSubmit = afterSubmit.replace(
  '  const submitAnswer = async () => {\n    if (isAnswered || selectedOptions.length === 0) return;\n    setIsAnswered(true);\n    \n    try {\n      const attemptData = await apiClient.saveAttempt({\n        questionId: currentQ.id,\n        selectedOptions: selectedOptions.join(\',\'),',
  '  const submitAnswer = async () => {\n    const isMultiMode = currentQ.format === \'MULTI_GROUP\';\n    if (isAnswered) return;\n    if (isMultiMode && Object.keys(selectedMultiOptions).length === 0) return;\n    if (!isMultiMode && selectedOptions.length === 0) return;\n    setIsAnswered(true);\n    \n    try {\n      const attemptData = await apiClient.saveAttempt({\n        questionId: currentQ.id,\n        selectedOptions: isMultiMode ? JSON.stringify(selectedMultiOptions) : selectedOptions.join(\',\'),'
);

content = newBeforeSubmit + newAfterSubmit;

// 3
content = content.replace(
  '                isAnswered={isAnswered}\n                onSelectOption={handleSelect}\n                isOptionFactuallyCorrect={isOptionFactuallyCorrect}',
  '                isAnswered={isAnswered}\n                onSelectOption={handleSelect}\n                onSelectMultiOption={handleMultiSelect}\n                selectedMultiOptions={selectedMultiOptions}\n                isOptionFactuallyCorrect={isOptionFactuallyCorrect}'
);

fs.writeFileSync(file, content, 'utf-8');
console.log('Done');
