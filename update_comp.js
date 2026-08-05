const fs = require('fs');
const file = 'src/components/SingleQuizClient.tsx';
let content = fs.readFileSync(file, 'utf-8');

const target = `<h3 style={{ marginBottom: '2rem', lineHeight: '1.8', whiteSpace: 'pre-wrap' }}>\n            {currentQ.content}\n          </h3>`;
const replacement = `<h3 style={{ marginBottom: '2rem', lineHeight: '1.8', whiteSpace: 'pre-wrap' }}>\n            {currentQ.content}\n          </h3>\n          {currentQ.imageUrl && (\n            <div style={{ textAlign: 'center', margin: '2rem 0' }}>\n              <img src={currentQ.imageUrl} alt="問題の図・標識" style={{ maxWidth: '100%', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }} />\n            </div>\n          )}`;

if (!content.includes('currentQ.imageUrl')) {
  content = content.replace(target, replacement);
  fs.writeFileSync(file, content, 'utf-8');
}
console.log('Component updated.');
