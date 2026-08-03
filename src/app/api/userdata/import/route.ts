import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    if (!Array.isArray(data)) {
      return NextResponse.json({ error: 'Invalid data format' }, { status: 400 });
    }

    let updatedCount = 0;

    for (const item of data) {
      if (!item.year || item.questionNumber === undefined) continue;

      const q = await prisma.question.findFirst({
        where: { year: item.year, questionNumber: item.questionNumber }
      });

      if (!q) continue;

      // 1. Update UserMeta (bookmarks)
      if (item.meta) {
        await prisma.userQuestionMeta.upsert({
          where: { questionId: q.id },
          create: { questionId: q.id, isBookmarked: item.meta.isBookmarked },
          update: { isBookmarked: item.meta.isBookmarked }
        });
      }

      // 2. Update Explanation
      if (item.explanation) {
        await prisma.questionExplanation.upsert({
          where: { questionId: q.id },
          create: { 
            questionId: q.id, 
            content: item.explanation.content, 
            isDebated: item.explanation.isDebated || false 
          },
          update: { 
            content: item.explanation.content,
            isDebated: item.explanation.isDebated
          }
        });
      }

      // 3. Import Attempts
      if (item.attempts && Array.isArray(item.attempts)) {
        // Option: Delete old attempts or just append new ones. Here we append to preserve history,
        // or we could replace them to prevent duplicates if importing the same file twice.
        // For simplicity and to avoid duplicate bloat on re-import, let's clear and re-insert.
        await prisma.attempt.deleteMany({ where: { questionId: q.id } });
        
        for (const a of item.attempts) {
          await prisma.attempt.create({
            data: {
              questionId: q.id,
              isCorrect: a.isCorrect,
              selectedOptions: a.selectedOptions,
              reasoning: a.reasoning,
              attemptedAt: a.attemptedAt ? new Date(a.attemptedAt) : new Date()
            }
          });
        }
      }

      updatedCount++;
    }

    return NextResponse.json({ success: true, updatedCount });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to import data' }, { status: 500 });
  }
}
