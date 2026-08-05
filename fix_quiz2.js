const fs = require('fs');
const file = 'src/components/SingleQuizClient.tsx';
let content = fs.readFileSync(file, 'utf-8');

// 1. handleMultiSelect を追加
content = content.replace(
  /const correctOptionNumbers =/g,
  "const handleMultiSelect = (optionNumber: number, choiceNum: number) => {\n    if (isAnswered) return;\n    setSelectedMultiOptions(prev => ({\n      ...prev,\n      [optionNumber]: choiceNum\n    }));\n  };\n\n  const correctOptionNumbers ="
);

// 2. isActuallyCorrect を修正
content = content.replace(
  /const isActuallyCorrect = checkIsVoided\(currentQ\) \? true : \(correctOptionNumbers\.length > 0 && selectedOptions\.length === correctOptionNumbers\.length && selectedOptions\.every\(n => correctOptionNumbers\.includes\(n\)\)\);/g,
  "const isActuallyCorrect = checkIsVoided(currentQ) ? true : currentQ.format === 'MULTI_GROUP' ? (currentQ.correctOptions && Object.keys(selectedMultiOptions).length === currentQ.options?.length && currentQ.options.every((opt: any, i: number) => selectedMultiOptions[opt.optionNumber] === currentQ.correctOptions[i])) : (correctOptionNumbers.length > 0 && selectedOptions.length === correctOptionNumbers.length && selectedOptions.every(n => correctOptionNumbers.includes(n)));"
);

// 3. submitAnswer を修正
content = content.replace(
  /const submitAnswer = async \(\) => {[\s\S]*?setIsAnswered\(true\);[\s\S]*?try {[\s\S]*?const attemptData = await apiClient\.saveAttempt\({[\s\S]*?questionId: currentQ\.id,[\s\S]*?selectedOptions: selectedOptions\.join\(\',\',\),[\s\S]*?isCorrect: isActuallyCorrect,[\s\S]*?judgments[\s\S]*?}\);/g,
  "const submitAnswer = async () => {\n    const isMultiMode = currentQ.format === 'MULTI_GROUP';\n    if (isAnswered) return;\n    if (isMultiMode && Object.keys(selectedMultiOptions).length === 0) return;\n    if (!isMultiMode && selectedOptions.length === 0) return;\n    setIsAnswered(true);\n    \n    try {\n      const attemptData = await apiClient.saveAttempt({\n        questionId: currentQ.id,\n        selectedOptions: isMultiMode ? JSON.stringify(selectedMultiOptions) : selectedOptions.join(','),\n        isCorrect: isActuallyCorrect,\n        judgments\n      });"
);
// replace fallback for submitAnswer
if (!content.includes('JSON.stringify(selectedMultiOptions)')) {
  content = content.replace(
    /const submitAnswer = async \(\) => {\s*if \(isAnswered \|\| selectedOptions\.length === 0\) return;\s*setIsAnswered\(true\);\s*try {\s*const attemptData = await apiClient\.saveAttempt\({\s*questionId: currentQ\.id,\s*selectedOptions: selectedOptions\.join\(\',\',\),\s*isCorrect: isActuallyCorrect,\s*judgments\s*}\);/g,
    "const submitAnswer = async () => {\n    const isMultiMode = currentQ.format === 'MULTI_GROUP';\n    if (isAnswered) return;\n    if (isMultiMode && Object.keys(selectedMultiOptions).length === 0) return;\n    if (!isMultiMode && selectedOptions.length === 0) return;\n    setIsAnswered(true);\n    \n    try {\n      const attemptData = await apiClient.saveAttempt({\n        questionId: currentQ.id,\n        selectedOptions: isMultiMode ? JSON.stringify(selectedMultiOptions) : selectedOptions.join(','),\n        isCorrect: isActuallyCorrect,\n        judgments\n      });"
  );
}

fs.writeFileSync(file, content, 'utf-8');
console.log('Done');
