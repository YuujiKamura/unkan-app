import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const questions = await prisma.question.findMany({
      where: {
        OR: [
          { userMeta: { isNot: null } },
          { attempts: { some: {} } },
          { explanation: { isNot: null } }
        ]
      },
      include: {
        userMeta: true,
        attempts: true,
        explanation: true
      }
    });

    const exportData = questions.map(q => {
      return {
        year: q.year,
        questionNumber: q.questionNumber,
        meta: q.userMeta ? {
          isBookmarked: q.userMeta.isBookmarked
        } : null,
        attempts: q.attempts.map(a => ({
          isCorrect: a.isCorrect,
          selectedOptions: a.selectedOptions,
          reasoning: a.reasoning,
          attemptedAt: a.attemptedAt.toISOString()
        })),
        explanation: q.explanation ? {
          content: q.explanation.content,
          isDebated: q.explanation.isDebated
        } : null
      };
    });

    return NextResponse.json(exportData);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to export data' }, { status: 500 });
  }
}
