const fs = require('fs');
const file = 'src/components/SingleQuizClient.tsx';
let content = fs.readFileSync(file, 'utf-8');

const target = /const isActuallyCorrect = \(\(\) => \{/g;
const replacement = `const isActuallyCorrect = (() => {
    if (typeof window !== 'undefined') {
      console.log('--- DEBUG INFO ---');
      console.log('format:', currentQ?.format);
      console.log('correctOptions:', currentQ?.correctOptions);
      console.log('selectedMultiOptions:', selectedMultiOptions);
      if (currentQ?.format === 'MULTI_GROUP') {
        const derivedSelected = Object.entries(selectedMultiOptions).map(([base, choiceNum]) => parseInt(base) + choiceNum - 1);
        console.log('derivedSelected:', derivedSelected);
      }
    }
`;

content = content.replace(target, replacement);
fs.writeFileSync(file, content, 'utf-8');
console.log('Done 17');
