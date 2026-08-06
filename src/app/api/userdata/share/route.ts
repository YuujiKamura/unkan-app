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

    // 自動で gh-pages ブランチに JSONファイルだけをコミットしてPushする
    try {
      await new Promise((resolve, reject) => {
        exec(`pwsh -File scripts/push_share.ps1 ${filename}`, (error, stdout, stderr) => {
          if (error) {
            console.error('Git push error:', stderr);
            reject(error);
          } else {
            console.log('Git push success:', stdout);
            resolve(true);
          }
        });
      });
    } catch (e) {
      console.error('Failed to auto-push share data to gh-pages:', e);
      // エラーが起きてもローカル保存は完了しているので落とさない
    }

    return NextResponse.json({ success: true, id, filename });
  } catch (error) {
    console.error('Failed to create share:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
