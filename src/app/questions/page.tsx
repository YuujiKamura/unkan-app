import { PrismaClient } from '@prisma/client';
import { Suspense } from 'react';
import QuestionsClientWrapper from '@/components/QuestionsClientWrapper';

const prisma = new PrismaClient();

import fs from 'fs';
import path from 'path';

const isSpaMode = process.env.NEXT_PUBLIC_APP_MODE === 'spa' || process.env.GITHUB_ACTIONS === 'true';

export default async function QuestionsList() {
  let mappedQuestions: any[] = [];
  let allRecentAttempts: any[] = [];

  if (!isSpaMode) {
    try {
      const questions = await prisma.question.findMany({
        orderBy: [
          { questionNumber: 'asc' }
        ],
        include: {
          attempts: {
            orderBy: { attemptedAt: 'asc' }
          },
          _count: {
            select: { attempts: true }
          },
          explanation: true,
          userMeta: true
        }
      });

      mappedQuestions = questions.map(q => ({
        ...q,
        explanation: q.explanation?.content || null,
        isDebated: q.explanation?.isDebated || false,
        isBookmarked: q.userMeta?.isBookmarked || false
      })).filter(q => {
        // 破綻している年度（未整備）をメモリ上で除外（スキーマ変更不要）
        const brokenYears = ['平成26年', '平成27年', '平成28年', '平成29年', '平成30年'];
        if (q.year && brokenYears.includes(q.year)) {
          return false;
        }
        return true;
      });

      allRecentAttempts = await prisma.attempt.findMany({
        orderBy: { attemptedAt: 'desc' },
        take: 2000, 
        select: { attemptedAt: true, isCorrect: true }
      });
    } catch (e) {}
  }

  // SPAモードまたはDB未接続時は完全クリーンな（個人履歴なしの）データをセット
  if (mappedQuestions.length === 0) {
    try {
      const jsonPath = path.join(process.cwd(), 'public', 'questions.json');
      if (fs.existsSync(jsonPath)) {
        const raw = fs.readFileSync(jsonPath, 'utf-8');
        const questions: any[] = JSON.parse(raw);
        mappedQuestions = questions.map(q => ({
          ...q,
          options: q.options || [],
          attempts: [],
          _count: { attempts: 0 },
          explanation: q.explanation || null,
          isDebated: q.isDebated || false,
          isBookmarked: false
        }));
      }
    } catch {}
  }

  const attemptsByDate: Record<string, { total: number, correct: number }> = {};
  allRecentAttempts.forEach(a => {
    const d = new Date(a.attemptedAt);
    d.setHours(d.getHours() + 9);
    const dateStr = d.toISOString().split('T')[0];
    
    if (!attemptsByDate[dateStr]) {
      attemptsByDate[dateStr] = { total: 0, correct: 0 };
    }
    attemptsByDate[dateStr].total++;
    if (a.isCorrect) {
      attemptsByDate[dateStr].correct++;
    }
  });

  return (
    <Suspense fallback={<div className="container" style={{ textAlign: 'center', padding: '4rem' }}>読み込み中...</div>}>
      <QuestionsClientWrapper initialQuestions={mappedQuestions} attemptsByDate={attemptsByDate} />
    </Suspense>
  );
}
