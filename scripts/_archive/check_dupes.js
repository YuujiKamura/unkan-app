const fs = require('fs');
const qs = JSON.parse(fs.readFileSync('./public/data/questions.json', 'utf8'));
let count = 0;
let affected = [];

for (const q of qs) {
  if (!q.content || !q.options || q.options.length === 0) continue;
  
  const opt1 = q.options.find(o => o.optionNumber === 1);
  if (opt1 && opt1.content) {
    // Check if the question content contains the option text
    // We check the first 20 chars of option 1
    const prefix = opt1.content.substring(0, 20);
    if (prefix.length > 5 && q.content.includes(prefix)) {
      count++;
      affected.push({ id: q.id, year: q.year, qNum: q.questionNumber });
    }
  }
}
console.log('Total affected:', count);
console.log('Sample affected:', affected.slice(0, 5));
