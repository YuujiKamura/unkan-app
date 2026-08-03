import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: Request, context: any) {
  const params = await context.params;
  const id = parseInt(params.id);
  const body = await request.json();
  const { isBookmarked } = body;

  const updated = await prisma.userQuestionMeta.upsert({
    where: { questionId: id },
    update: { isBookmarked },
    create: { questionId: id, isBookmarked },
  });

  return NextResponse.json(updated);
}
