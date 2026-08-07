const fs = require('fs');
const path = '.gitignore';
let content = fs.existsSync(path) ? fs.readFileSync(path, 'utf8') : '';

const appendList = [
  'data/pdf/',
  'data/json/',
  'data/images/',
  '*.db',
  '*.db-journal',
  '*.sqlite'
];

let changed = false;
for (const item of appendList) {
  if (!content.includes(item)) {
    content += (content.endsWith('\n') ? '' : '\n') + item + '\n';
    changed = true;
  }
}

if (changed) {
  fs.writeFileSync(path, content, 'utf8');
  console.log('Updated .gitignore');
} else {
  console.log('No updates needed for .gitignore');
}
