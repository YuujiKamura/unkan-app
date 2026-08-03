import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  const body = await request.json();
  const { questionId, selectedOptions, isCorrect, reasoning, judgments } = body;

  try {
    const attempt = await prisma.attempt.create({
      data: {
        questionId,
        selectedOptions,
        isCorrect,
        reasoning,
        judgments: judgments ? JSON.stringify(judgments) : null,
      },
    });

    return NextResponse.json(attempt);
  } catch (error: any) {
    console.error("Prisma error in /api/attempts:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const dateFilter = searchParams.get('date');
  const fetchAll = searchParams.get('all') === 'true';

  try {
    if (fetchAll) {
      const allRecentAttempts = await prisma.attempt.findMany({
        orderBy: { attemptedAt: 'desc' },
        take: 2000, 
        select: { attemptedAt: true, isCorrect: true }
      });
      return NextResponse.json(allRecentAttempts);
    }

    let dateWhereClause = {};
    if (dateFilter) {
      const startOfDay = new Date(`${dateFilter}T00:00:00+09:00`);
      const endOfDay = new Date(`${dateFilter}T23:59:59+09:00`);
      dateWhereClause = {
        attemptedAt: {
          gte: startOfDay,
          lte: endOfDay
        }
      };
    }

    const attempts = await prisma.attempt.findMany({
      where: dateWhereClause,
      orderBy: { attemptedAt: 'desc' },
      include: { 
        question: {
          include: {
            _count: {
              select: { attempts: true }
            }
          }
        }
      },
      take: dateFilter ? 1000 : 100
    });

    return NextResponse.json(attempts);
  } catch (error: any) {
    console.error("Prisma error in GET /api/attempts:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
