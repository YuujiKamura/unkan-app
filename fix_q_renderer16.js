const fs = require('fs');
const file = 'src/components/QuestionOptionsRenderer.tsx';
const content = fs.readFileSync(file, 'utf-8');

const target1 = /const isOptionRowCorrect = .*?;/g;
const target2 = /const isOptionRowWrong = .*?;/g;

let newContent = content;

// Since we are replacing multiple matches and want to be precise, we'll do line by line or carefully replace.
const lines = newContent.split(/\r?\n/);
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('const isOptionRowCorrect = ')) {
    lines[i] = '          const userChoiceGlobalNum = selectedMultiOptions[opt.optionNumber] ? opt.optionNumber + selectedMultiOptions[opt.optionNumber] - 1 : null;';
    lines.splice(i+1, 0, '          const isOptionRowCorrect = isAnswered && userChoiceGlobalNum !== null && currentQ.correctOptions && currentQ.correctOptions.includes(userChoiceGlobalNum);');
    i++;
    continue;
  }
  if (lines[i].includes('const isOptionRowWrong = ')) {
    lines[i] = '          const isOptionRowWrong = isAnswered && userChoiceGlobalNum !== null && currentQ.correctOptions && !currentQ.correctOptions.includes(userChoiceGlobalNum);';
    continue;
  }
  if (lines[i].includes('const isThisChoiceCorrect = ')) {
    lines[i] = '                  const globalOptionNumber = opt.optionNumber + choice.num - 1;';
    lines.splice(i+1, 0, '                  const isThisChoiceCorrect = isAnswered && currentQ.correctOptions && currentQ.correctOptions.includes(globalOptionNumber);');
    i++;
    continue;
  }
}

fs.writeFileSync(file, lines.join('\n'), 'utf-8');
console.log('Done 16');
