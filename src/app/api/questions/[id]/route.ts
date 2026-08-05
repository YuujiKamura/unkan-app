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
        userMeta: true
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
    const { correctAnswer, content, majorField, subField, explanation, options } = body;

    // 1. Questionの更新データ構築
    const updateData: any = {};
    if (correctAnswer !== undefined && correctAnswer !== null) {
      const parsedAns = parseInt(String(correctAnswer), 10);
      if (parsedAns >= 1 && parsedAns <= 4) {
        updateData.correctAnswer = parsedAns;
      }
    }
    if (content !== undefined) updateData.content = content;
    if (majorField !== undefined) updateData.majorField = majorField;
    if (subField !== undefined) updateData.subField = subField;

    const updatedQuestion = await prisma.question.update({
      where: { id },
      data: updateData,
      include: {
        options: { orderBy: { optionNumber: 'asc' } },
        explanation: true,
        userMeta: true
      }
    });

    // 2. 正答肢の変更があった場合、OptionsのisCorrectフラグを一括更新
    if (updateData.correctAnswer !== undefined) {
      const targetAns = updateData.correctAnswer;
      for (const opt of updatedQuestion.options) {
        await prisma.option.update({
          where: { id: opt.id },
          data: { isCorrect: opt.optionNumber === targetAns }
        });
      }
    }

    // 3. Optionの個別の内容・解説・正解更新があれば処理
    if (Array.isArray(options)) {
      // フロントエンドから複数の正解（二項目選択など）が設定された場合、
      // 従来の correctAnswer による一括更新を上書きする
      for (const optInput of options) {
        if (optInput.id) {
          await prisma.option.update({
            where: { id: optInput.id },
            data: {
              content: optInput.content !== undefined ? optInput.content : undefined,
              explanation: optInput.explanation !== undefined ? optInput.explanation : undefined,
              isCorrect: optInput.isCorrect !== undefined ? optInput.isCorrect : undefined,
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
        userMeta: true
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
