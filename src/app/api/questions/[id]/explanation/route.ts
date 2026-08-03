import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  const questionId = parseInt(resolvedParams.id, 10);
  
  if (isNaN(questionId)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  }

  try {
    const { content } = await request.json();

    const explanation = await prisma.questionExplanation.upsert({
      where: { questionId },
      update: { content },
      create: {
        questionId,
        content,
        isDebated: false
      }
    });

    return NextResponse.json({ success: true, explanation });
  } catch (error) {
    console.error('Failed to update explanation:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
