const fs = require('fs');
const file = 'src/components/SingleQuizClient.tsx';
let content = fs.readFileSync(file, 'utf-8');

// Find the isActuallyCorrect line and replace it
const targetRegex = /const isActuallyCorrect = checkIsVoided\(currentQ\) \? true : currentQ\.format === 'MULTI_GROUP'.*?;/g;

const replacement = `
  const isActuallyCorrect = (() => {
    if (checkIsVoided(currentQ)) return true;
    if (currentQ.format === 'MULTI_GROUP') {
      if (!currentQ.correctOptions || currentQ.correctOptions.length === 0) return false;
      const derivedSelected = Object.entries(selectedMultiOptions).map(([base, choiceNum]) => parseInt(base) + choiceNum - 1);
      return derivedSelected.length === currentQ.correctOptions.length && currentQ.correctOptions.every(c => derivedSelected.includes(c));
    }
    return correctOptionNumbers.length > 0 && selectedOptions.length === correctOptionNumbers.length && selectedOptions.every(n => correctOptionNumbers.includes(n));
  })();
`;

content = content.replace(targetRegex, replacement.trim());

fs.writeFileSync(file, content, 'utf-8');
console.log('Done 15');
