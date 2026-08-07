import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '10');
  const mode = searchParams.get('mode'); // 'random' or 'review'

  let queryWhere: any = {
    content: { not: null },
    year: { notIn: ['平成26年', '平成27年', '平成28年', '平成29年', '平成30年'] }
  };

  if (mode === 'review') {
    // 復習モード: ブックマークされているか、過去に間違えたことがある問題
    queryWhere = {
      content: { not: null },
      year: { notIn: ['平成26年', '平成27年', '平成28年', '平成29年', '平成30年'] },
      OR: [
        { userMeta: { isBookmarked: true } },
        {
          attempts: {
            some: {
              isCorrect: false
            }
          }
        }
      ]
    };
  }

  // Randomly select questions
  const allIds = await prisma.question.findMany({ 
    where: queryWhere,
    select: { id: true } 
  });
  
  // Fisher-Yates shuffle
  for (let i = allIds.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allIds[i], allIds[j]] = [allIds[j], allIds[i]];
  }
  
  const selectedIds = allIds.slice(0, limit).map(x => x.id);
  
  const questions = await prisma.question.findMany({
    where: { id: { in: selectedIds } },
    include: {
      options: true,
      attempts: true, // クライアントで履歴を見るために含める
      explanation: true,
      userMeta: true,
      corrections: true
    }
  });

  const mappedQuestions = questions.map(q => ({
    ...q,
    explanation: q.explanation?.content || null,
    isDebated: q.explanation?.isDebated || false,
    isBookmarked: q.userMeta?.isBookmarked || false
  }));
  
  return NextResponse.json(mappedQuestions);
}
