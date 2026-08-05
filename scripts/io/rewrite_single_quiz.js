const fs = require('fs');
let content = fs.readFileSync('src/components/SingleQuizClient.tsx', 'utf-8');
const lines = content.split('\n');
const startIdx = lines.findIndex((l, i) => i > 530 && l.includes('<div style={{ display: \'flex\', flexDirection: \'column\', gap: \'1rem\' }}>'));
const endIdx = lines.findIndex((l, i) => i > startIdx && l.includes('</div>') && lines[i-1].includes('})}'));

if (startIdx !== -1 && endIdx !== -1) {
  const replacement = `              <QuestionOptionsRenderer
                currentQ={currentQ}
                selectedOptions={selectedOptions}
                isAnswered={isAnswered}
                onSelectOption={handleOptionSelect}
                isOptionFactuallyCorrect={isOptionFactuallyCorrect}
                checkIsVoided={checkIsVoided}
                showJudgments={!isCombinationQuestion}
                judgments={judgments}
                toggleJudgment={toggleJudgment}
              />`;
  lines.splice(startIdx, endIdx - startIdx + 1, replacement);
  
  // Also add the import at the top
  const importIdx = lines.findIndex(l => l.includes('import { saveFlowchartToLibrary'));
  if (importIdx !== -1) {
    lines.splice(importIdx + 1, 0, "import QuestionOptionsRenderer from './QuestionOptionsRenderer';");
  }

  fs.writeFileSync('src/components/SingleQuizClient.tsx', lines.join('\n'));
  console.log('Successfully replaced lines ' + (startIdx+1) + ' to ' + (endIdx+1));
} else {
  console.log('Failed to find start or end index', startIdx, endIdx);
}
