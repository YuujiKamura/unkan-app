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

    // Windowsで 'npm run dev' 起動中に 'npm run build:spa' をバックグラウンドで叩くと、
    // devサーバーが /api フォルダをロックしているため EPERM エラー（rename失敗）が発生します。
    // そのため、ここではファイルの生成のみ行い、ユーザーに手動デプロイを促します。
    return NextResponse.json({ success: true, id, filename });
  } catch (error) {
    console.error('Failed to create share:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
