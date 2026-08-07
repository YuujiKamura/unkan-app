import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const body = await request.json();
    const { correctionText } = body;
    if (typeof correctionText !== 'string') {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const updated = await prisma.optionCorrection.update({
      where: { id },
      data: { correctionText }
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating correction:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    await prisma.optionCorrection.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting correction:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
