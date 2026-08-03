import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id, 10);
    const { isDebated } = await request.json();

    if (isNaN(id) || typeof isDebated !== 'boolean') {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const questionExp = await prisma.questionExplanation.upsert({
      where: { questionId: id },
      update: { isDebated },
      create: { questionId: id, isDebated }
    });

    return NextResponse.json(questionExp);
  } catch (error) {
    console.error('Error updating isDebated:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
