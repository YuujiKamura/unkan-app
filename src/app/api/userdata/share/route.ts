import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';

const SHARES_DIR = path.join(process.cwd(), 'public', 'data', 'shares');

export async function POST(req: Request) {
  try {
    const data = await req.json();
    if (!data || !Array.isArray(data)) {
      return NextResponse.json({ error: 'Invalid data format' }, { status: 400 });
    }

    if (!fs.existsSync(SHARES_DIR)) {
      fs.mkdirSync(SHARES_DIR, { recursive: true });
    }

    // Generate a short unique ID (timestamp + random string)
    const id = Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
    const filename = `${id}.json`;
    const filepath = path.join(SHARES_DIR, filename);

    fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf8');

    // Run git add and commit in the background to ensure it's tracked
    // Also run build:spa and deploy.ps1 in the background so it becomes live on Pages.
    // Note: build:spa + deploy takes ~20-30 seconds, so we don't await it.
    exec(`git add "public/data/shares/${filename}" && git commit -m "chore: share progress ${id}" && npm run build:spa && pwsh -File deploy.ps1`, 
      { cwd: process.cwd() }, 
      (error, stdout, stderr) => {
        if (error) {
          console.error(`Deploy error: ${error.message}`);
          return;
        }
        console.log(`Deploy background job started/completed for share ${id}`);
    });

    return NextResponse.json({ success: true, id, filename });
  } catch (error) {
    console.error('Failed to create share:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
