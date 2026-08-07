import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 正答肢の文章内で「実は誤りを含む一部分」をユーザーがマークし、訂正文を添える機能。
// 解答完了後にのみクライアント側で表示される想定 (問題を解答するまでは再表示しない仕様)。
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const questionId = parseInt(resolvedParams.id, 10);
    if (isNaN(questionId)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const body = await request.json();
    const { optionNumber, selectedText, startOffset, endOffset, correctionText } = body;

    if (
      typeof optionNumber !== 'number' ||
      typeof selectedText !== 'string' || selectedText.trim() === '' ||
      typeof startOffset !== 'number' ||
      typeof endOffset !== 'number' ||
      endOffset <= startOffset ||
      typeof correctionText !== 'string'
    ) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const created = await prisma.optionCorrection.create({
      data: {
        questionId,
        optionNumber,
        selectedText,
        startOffset,
        endOffset,
        correctionText, // 訂正コメントは空文字も許可(「間違っているのは分かるが正解は不明」のケース)
      }
    });

    return NextResponse.json(created);
  } catch (error) {
    console.error('Error creating correction:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
