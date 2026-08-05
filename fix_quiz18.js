const fs = require('fs');

// 1. Fix SingleQuizClient.tsx
let file1 = 'src/components/SingleQuizClient.tsx';
let content1 = fs.readFileSync(file1, 'utf-8');

let newContent1 = content1.replace(/currentQ\.correctOptions/g, 'correctOptionNumbers');
fs.writeFileSync(file1, newContent1, 'utf-8');

// 2. Fix QuestionOptionsRenderer.tsx
let file2 = 'src/components/QuestionOptionsRenderer.tsx';
let content2 = fs.readFileSync(file2, 'utf-8');

let newContent2 = content2.replace(/currentQ\.correctOptions/g, 'correctOptionNumbers');
// Prepend the declaration of correctOptionNumbers if it doesn't exist
if (!newContent2.includes('const correctOptionNumbers = (currentQ.options')) {
  newContent2 = newContent2.replace(
    '  const options = [...(currentQ.options',
    '  const correctOptionNumbers = (currentQ.options || []).filter((o: any) => o.isCorrect).map((o: any) => o.optionNumber);\n  const options = [...(currentQ.options'
  );
}
fs.writeFileSync(file2, newContent2, 'utf-8');

console.log('Done 18');
