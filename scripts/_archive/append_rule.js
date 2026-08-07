const fs = require('fs');
const file = 'C:\\Users\\yuuji\\AGENTS.md';
let content = fs.readFileSync(file, 'utf-8');

const target = '- 実際のブラウザ上で「ボタンが出現するか」「クリックできるか」「状態遷移や表示が正しく更新されるか」の事実確認を自らの手で証明してからユーザーに報告しろ。';
const replacement = target + '\n- その際、正常系の単発テストだけで満足するな。未入力や部分選択などのエッジケース、および既存機能が壊れていないか（回帰テスト）も網羅するテストケースを自律的に設計・実行して安全性を証明しろ。';

content = content.replace(target, replacement);

fs.writeFileSync(file, content, 'utf-8');
console.log('Done 19');
