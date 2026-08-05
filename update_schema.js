const fs = require('fs');
const file = 'prisma/schema.prisma';
let content = fs.readFileSync(file, 'utf-8');

// Insert imageUrl field after content
const target = 'content         String?   // 問題文テキスト\n';
if (!content.includes('imageUrl')) {
  content = content.replace(target, target + '  imageUrl        String?   // 標識等の画像パス(例: /images/R5_16.png)\n');
  fs.writeFileSync(file, content, 'utf-8');
}
console.log('Schema updated.');
