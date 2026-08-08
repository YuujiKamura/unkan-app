import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

const REPO_ROOT = process.cwd();
const FILE_PATH = path.join(REPO_ROOT, 'public', 'data', 'default_user.json');
const RELATIVE_PATH = 'public/data/default_user.json';

// ローカルdevサーバー(DBモード)専用。データを固定パスに書き込み、
// そのままgit add/commit/pushまで行う(全工程をこの1ファイルに書き、
// 外部スクリプト経由の不透明な自動化にしない)。masterへのpushは
// 既存のGitHub Actionsを起動し、CIが自動でビルド・デプロイする
// (このリポジトリ自身のpushなのでRule 3の範囲内、認可は不要)。
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

    const git = (args: string[]) => execFileAsync('git', args, { cwd: REPO_ROOT });

    await git(['add', RELATIVE_PATH]);

    const { stdout: statusOut } = await git(['status', '--porcelain', '--', RELATIVE_PATH]);
    if (!statusOut.trim()) {
      // 前回公開時と内容が同じで差分なし。pushするものが無いだけで正常。
      return NextResponse.json({ success: true, pushed: false, reason: 'no changes' });
    }

    await git(['commit', '-m', 'Publish default user data snapshot']);
    await git(['push', 'origin', 'master']);

    return NextResponse.json({ success: true, pushed: true });
  } catch (error) {
    console.error('Failed to publish default user data:', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
