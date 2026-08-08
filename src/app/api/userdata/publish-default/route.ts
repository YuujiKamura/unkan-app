import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const FILE_PATH = path.join(process.cwd(), 'public', 'data', 'default_user.json');

// ローカルdevサーバー(DBモード)専用。データを固定パスにローカル書き込みするだけ。
// git commit/pushは自動化せず、通常のgit操作として別途明示的に行う。
// Pages側は #share=default という固定の短いURLでこのファイルを取得する。
export async function POST(req: Request) {
  try {
    const data = await req.json();
    if (!data || !Array.isArray(data)) {
      return NextResponse.json({ error: 'Invalid data format' }, { status: 400 });
    }

    const dir = path.dirname(FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(FILE_PATH, JSON.stringify(data, null, 2), 'utf8');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to write default user data:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
