import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

// バックアップ先ディレクトリの取得
function getBackupDirectory(): string {
  const envDrivePath = process.env.BACKUP_DIR || "H:\\マイドライブ\\試験系\\※運行管理者\\バックアップ";
  let targetDir = process.cwd();

  if (fs.existsSync(envDrivePath)) {
    targetDir = envDrivePath;
  } else {
    const parentDrive = path.dirname(envDrivePath);
    if (fs.existsSync(parentDrive)) {
      try {
        fs.mkdirSync(envDrivePath, { recursive: true });
        targetDir = envDrivePath;
      } catch {
        targetDir = path.join(process.cwd(), 'backups');
      }
    } else {
      targetDir = path.join(process.cwd(), 'backups');
    }
  }

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  return targetDir;
}

// 同期・自動バックアップ実行ロジック
async function performSync() {
  const attempts = await prisma.attempt.findMany({
    orderBy: { attemptedAt: 'asc' }
  });
  
  const formattedAttempts = attempts.map(a => ({
    id: a.id,
    questionId: a.questionId,
    selectedOptions: a.selectedOptions || "",
    isCorrect: a.isCorrect,
    attemptedAt: a.attemptedAt.toISOString(),
    reasoning: a.reasoning || undefined
  }));

  const userMetas = await prisma.userQuestionMeta.findMany({
    where: { isBookmarked: true }
  });
  const bookmarks = userMetas.map(m => m.questionId);

  const explanations = await prisma.questionExplanation.findMany();
  
  const expRecord: Record<number, string> = {};
  const debated: number[] = [];

  explanations.forEach(exp => {
    if (exp.content && exp.content.trim() !== '') {
      expRecord[exp.questionId] = exp.content;
    }
    if (exp.isDebated) {
      debated.push(exp.questionId);
    }
  });

  const userData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    summary: {
      totalAttempts: attempts.length,
      totalBookmarks: bookmarks.length,
      totalExplanations: Object.keys(expRecord).length,
      totalDebated: debated.length
    },
    attempts: formattedAttempts,
    bookmarks,
    explanations: expRecord,
    debated
  };

  const targetDir = getBackupDirectory();
  const now = new Date();
  const timestampStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
  
  const timestampFile = path.join(targetDir, `takken_userdata_${timestampStr}.json`);
  const latestFile = path.join(targetDir, `takken_userdata_latest.json`);
  const localProjectBackup = path.join(process.cwd(), `takken_userdata_backup.json`);

  const jsonStr = JSON.stringify(userData, null, 2);

  fs.writeFileSync(timestampFile, jsonStr, 'utf-8');
  fs.writeFileSync(latestFile, jsonStr, 'utf-8');
  fs.writeFileSync(localProjectBackup, jsonStr, 'utf-8');

  return {
    success: true,
    exportedAt: userData.exportedAt,
    targetDir,
    summary: userData.summary
  };
}

export async function POST() {
  try {
    const result = await performSync();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Auto Sync Error:", error);
    return NextResponse.json({ error: "Failed to perform auto sync" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const result = await performSync();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Auto Sync Error:", error);
    return NextResponse.json({ error: "Failed to perform auto sync" }, { status: 500 });
  }
}
