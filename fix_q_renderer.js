const fs = require('fs');
const file = 'src/components/QuestionOptionsRenderer.tsx';
const lines = fs.readFileSync(file, 'utf-8').split(/\r?\n/);

const out = [];
let i = 0;
while(i < lines.length) {
  const line = lines[i];
  
  if (line.includes('if (currentQ.format === \'MULTI_GROUP\') {')) {
    out.push(line);
    out.push('    // Remove duplicates based on structuredData.title');
    out.push('    const uniqueGroups = [];');
    out.push('    const seenTitles = new Set();');
    out.push('    for (const opt of options) {');
    out.push('      if (opt.structuredData) {');
    out.push('        try {');
    out.push('          const parsed = JSON.parse(opt.structuredData);');
    out.push('          if (!seenTitles.has(parsed.title)) {');
    out.push('            seenTitles.add(parsed.title);');
    out.push('            uniqueGroups.push(opt);');
    out.push('          }');
    out.push('        } catch(e) {}');
    out.push('      }');
    out.push('    }');
    out.push('    ');
    out.push('    return (');
    out.push('      <div style={{ display: \'flex\', flexDirection: \'column\', gap: \'1rem\' }}>');
    out.push('        {uniqueGroups.map((opt: any, i: number) => {');
    out.push('          let parsed: any = null;');
    out.push('          try { parsed = JSON.parse(opt.structuredData); } catch (e) {}');
    out.push('          const isOptionRowCorrect = isAnswered && currentQ.correctOptions && currentQ.correctOptions[i] === selectedMultiOptions[opt.optionNumber];');
    out.push('          const isOptionRowWrong = isAnswered && currentQ.correctOptions && currentQ.correctOptions[i] !== selectedMultiOptions[opt.optionNumber];');
    
    // Skip old lines until we reach return (
    i++;
    while(!lines[i].includes('return (')) {
      i++;
    }
    // Now we are at return ( inside the map
    out.push('          return (');
    i++;
    continue;
  }

  out.push(line);
  i++;
}

fs.writeFileSync(file, out.join('\n'), 'utf-8');
console.log('Done 12');
