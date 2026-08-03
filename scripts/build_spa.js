const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const apiDir = path.join(__dirname, '../src/app/api');
const apiHiddenDir = path.join(__dirname, '../src/app/_api_hidden');

console.log('1. Exporting data to static JSON...');
try {
  execSync('npx tsx scripts/io/export_to_static_json.ts', { stdio: 'inherit' });
} catch (e) {
  console.error('Failed to export data');
  process.exit(1);
}

console.log('2. Hiding API routes...');
if (fs.existsSync(apiDir)) {
  fs.renameSync(apiDir, apiHiddenDir);
}

console.log('2.5. Cleaning up .next cache...');
const nextDir = path.join(__dirname, '../.next');
if (fs.existsSync(nextDir)) {
  fs.rmSync(nextDir, { recursive: true, force: true });
}

try {
  console.log('3. Running Next.js build...');
  execSync('npx cross-env NEXT_PUBLIC_APP_MODE=spa npx next build', { stdio: 'inherit' });
} catch (e) {
  console.error('Build failed');
} finally {
  console.log('4. Restoring API routes...');
  if (fs.existsSync(apiHiddenDir)) {
    if (fs.existsSync(apiDir)) {
      // API dir might have been recreated, handle safely
      fs.rmSync(apiDir, { recursive: true, force: true });
    }
    fs.renameSync(apiHiddenDir, apiDir);
  }
}
