import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const id = parseInt(resolvedParams.id, 10);
  const body = await request.json();
  const { reasoning } = body;

  const attempt = await prisma.attempt.update({
    where: { id },
    data: { reasoning },
  });

  return NextResponse.json(attempt);
}
