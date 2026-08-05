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
const replace2 = '  const handleMultiSelect = (optionNumber: number, choiceNum: number) => {\n' +
'    if (isAnswered) return;\n' +
'    setSelectedMultiOptions(prev => ({\n' +
'      ...prev,\n' +
'      [optionNumber]: choiceNum\n' +
'    }));\n' +
'  };\n\n' +
'  const correctOptionNumbers = (currentQ.options || []).filter((o: any) => o.isCorrect).map((o: any) => o.optionNumber).sort();\n' +
'  const isActuallyCorrect = checkIsVoided(currentQ) ? true : currentQ.format === \'MULTI_GROUP\' ? (currentQ.correctOptions && Object.keys(selectedMultiOptions).length === currentQ.options?.length && currentQ.options.every((opt: any, i: number) => selectedMultiOptions[opt.optionNumber] === currentQ.correctOptions[i])) : (correctOptionNumbers.length > 0 && selectedOptions.length === correctOptionNumbers.length && selectedOptions.every(n => correctOptionNumbers.includes(n)));';
content = content.replace(target2, replace2);

// 3. submitAnswer を修正
const target3 = '  const submitAnswer = async () => {\n' +
'    if (isAnswered || selectedOptions.length === 0) return;\n' +
'    setIsAnswered(true);\n' +
'    \n' +
'    try {\n' +
'      const attemptData = await apiClient.saveAttempt({\n' +
'        questionId: currentQ.id,\n' +
'        selectedOptions: selectedOptions.join(\',\'),\n' +
'        isCorrect: isActuallyCorrect,\n' +
'        judgments\n' +
'      });';
const replace3 = '  const submitAnswer = async () => {\n' +
'    const isMultiMode = currentQ.format === \'MULTI_GROUP\';\n' +
'    if (isAnswered) return;\n' +
'    if (isMultiMode && Object.keys(selectedMultiOptions).length === 0) return;\n' +
'    if (!isMultiMode && selectedOptions.length === 0) return;\n' +
'    setIsAnswered(true);\n' +
'    \n' +
'    try {\n' +
'      const attemptData = await apiClient.saveAttempt({\n' +
'        questionId: currentQ.id,\n' +
'        selectedOptions: isMultiMode ? JSON.stringify(selectedMultiOptions) : selectedOptions.join(\',\'),\n' +
'        isCorrect: isActuallyCorrect,\n' +
'        judgments\n' +
'      });';
content = content.replace(target3, replace3);

// 4. JSXにプロパティを渡す
const target4 = '                isAnswered={isAnswered}\n' +
'                onSelectOption={handleSelect}\n' +
'                isOptionFactuallyCorrect={isOptionFactuallyCorrect}';
const replace4 = '                isAnswered={isAnswered}\n' +
'                onSelectOption={handleSelect}\n' +
'                onSelectMultiOption={handleMultiSelect}\n' +
'                selectedMultiOptions={selectedMultiOptions}\n' +
'                isOptionFactuallyCorrect={isOptionFactuallyCorrect}';
content = content.replace(target4, replace4);

fs.writeFileSync(file, content, 'utf-8');
console.log('Done 5');
