import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// 読み取り専用: public/pdf_pages/ 配下の画像ファイル名一覧を返す。
// 管理画面の画像差し替えUIで、既存の問題画像から選択できるようにするため。
export async function GET() {
  try {
    const dir = path.join(process.cwd(), 'public', 'pdf_pages');
    if (!fs.existsSync(dir)) {
      return NextResponse.json({ files: [] });
    }
    const files = fs
      .readdirSync(dir)
      .filter((f) => /\.(png|jpe?g|svg|gif|webp)$/i.test(f))
      .sort();
    return NextResponse.json({ files });
  } catch (error) {
    console.error('Error listing pdf pages:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
