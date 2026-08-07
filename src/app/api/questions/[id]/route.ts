import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const question = await prisma.question.findUnique({
      where: { id },
      include: {
        options: { orderBy: { optionNumber: 'asc' } },
        explanation: true,
        userMeta: true,
        corrections: true
      }
    });

    if (!question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }

    return NextResponse.json({
      ...question,
      explanation: question.explanation?.content || null,
      isDebated: question.explanation?.isDebated || false,
      isBookmarked: question.userMeta?.isBookmarked || false
    });
  } catch (error) {
    console.error('Error fetching question:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

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
    const { content, field, situationCategory, knowledgeTags, explanation, options, imageUrl } = body;

    // 1. Questionの更新データ構築
    // 正答肢は Question に持たせず Option.isCorrect が正 (SoT)。下の options 配列更新で反映する。
    const updateData: Record<string, unknown> = {};
    if (content !== undefined) updateData.content = content;
    if (field !== undefined) updateData.field = field;
    if (situationCategory !== undefined) updateData.situationCategory = situationCategory;
    if (knowledgeTags !== undefined) updateData.knowledgeTags = knowledgeTags;
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl;

    await prisma.question.update({
      where: { id },
      data: updateData,
    });

    // 2. Optionの個別の内容・解説・正解更新があれば処理
    if (Array.isArray(options)) {
      for (const optInput of options) {
        if (optInput.id) {
          await prisma.option.update({
            where: { id: optInput.id },
            data: {
              content: optInput.content !== undefined ? optInput.content : undefined,
              explanation: optInput.explanation !== undefined ? optInput.explanation : undefined,
              isCorrect: optInput.isCorrect !== undefined ? optInput.isCorrect : undefined,
              structuredData: optInput.structuredData !== undefined ? optInput.structuredData : undefined,
            }
          });
        }
      }
    }

    // 4. 解説 (QuestionExplanation) の更新
    if (explanation !== undefined) {
      await prisma.questionExplanation.upsert({
        where: { questionId: id },
        create: {
          questionId: id,
          content: explanation,
        },
        update: {
          content: explanation,
        }
      });
    }

    // 更新後の最新データを再取得して返却
    const finalQuestion = await prisma.question.findUnique({
      where: { id },
      include: {
        options: { orderBy: { optionNumber: 'asc' } },
        explanation: true,
        userMeta: true,
        corrections: true
      }
    });

    return NextResponse.json({
      ...finalQuestion,
      explanation: finalQuestion?.explanation?.content || null,
      isDebated: finalQuestion?.explanation?.isDebated || false,
      isBookmarked: finalQuestion?.userMeta?.isBookmarked || false
    });
  } catch (error) {
    console.error('Error updating question:', error);
    return NextResponse.json({ error: 'Failed to update question' }, { status: 500 });
  }
}
