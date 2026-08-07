const fs = require('fs');

const JSON_PATH = 'public/data/questions.json';
const data = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));

for (const q of data) {
  let tags = q.situationCategory ? q.situationCategory.split(',').map(t => t.trim()).filter(Boolean) : [];
  
  // 穴埋め判定
  const isFillInTheBlank = q.content.match(/A.*B.*C/i) || q.content.match(/Ａ.*Ｂ.*Ｃ/i) || q.content.includes('入るべき字句');
  if (isFillInTheBlank && !tags.includes('#穴埋め問題')) {
    tags.push('#穴埋め問題');
  }

  // 形式判定
  const content = q.content.replace(/\s/g, ''); // 空白除去
  if (content.includes('2つ') || content.includes('２つ')) {
    if (!tags.includes('#複数選択(2つ)')) tags.push('#複数選択(2つ)');
  } else if (content.includes('3つ') || content.includes('３つ')) {
    if (!tags.includes('#複数選択(3つ)')) tags.push('#複数選択(3つ)');
  } else if (content.includes('すべて選')) {
    if (!tags.includes('#すべて選択')) tags.push('#すべて選択');
  } else if (content.includes('1つ') || content.includes('１つ') || content.includes('いずれか正しいもの')) {
    if (!isFillInTheBlank && !tags.includes('#正誤・択一(1つ選択)')) {
      tags.push('#正誤・択一(1つ選択)');
    }
  } else if (tags.length === 0) {
    // If absolutely no tag could be determined
    tags.push('#正誤・択一(1つ選択)'); // default fallback
  }

  q.situationCategory = tags.join(', ');
}

fs.writeFileSync(JSON_PATH, JSON.stringify(data, null, 2), 'utf8');
console.log('Filled situation categories successfully.');
