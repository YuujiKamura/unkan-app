const fs = require('fs');
try {
  const ans = JSON.parse(fs.readFileSync('data/json/answers.json', 'utf8'));
  console.log("Answers found.");
  // 令和5年のものを探す
  // ...いや、単純に answers.json の中で 29 を検索しよう
} catch(e) {
  console.log(e.message);
}
