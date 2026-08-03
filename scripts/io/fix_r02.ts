import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  // 1. 令和2年 (CBT) の missing options を修復する
  const r2cbtJsonPath = path.join(__dirname, '../../data/json/R02.CBT.json');
  const r2cbtRaw = JSON.parse(fs.readFileSync(r2cbtJsonPath, 'utf8'));
  
  const cbtQs = await prisma.question.findMany({
    where: { year: '令和2年 (CBT)' },
    include: { options: true }
  });
  
  for (const q of cbtQs) {
    if (q.options.length === 0) {
      console.log(`Fixing options for R02 CBT Q${q.questionNumber}...`);
      const rawQ = r2cbtRaw.find((x: any) => x.questionNumber === q.questionNumber);
      if (rawQ && rawQ.choices) {
        let optIndex = 1;
        for (const [key, val] of Object.entries(rawQ.choices)) {
          // A, B, C... などのキーを文字列として含める
          const content = `${key}: ${val}`;
          await prisma.option.create({
            data: {
              questionId: q.id,
              optionNumber: optIndex++,
              content: content,
              isCorrect: false // 正解は手動設定または別ソースが必要なのでとりあえずfalse
            }
          });
        }
      }
    }
  }

  // 2. 令和2年 の 3問しかないものを削除し、R02.1_full.json から全30問を再登録する
  const r2Qs = await prisma.question.findMany({
    where: { year: '令和2年' }
  });
  if (r2Qs.length > 0) {
    console.log(`Deleting ${r2Qs.length} incomplete R02 questions...`);
    await prisma.question.deleteMany({
      where: { year: '令和2年' }
    });
  }

  const r2fullJsonPath = path.join(__dirname, '../../data/json/R02.1_full.json');
  const r2fullRaw = JSON.parse(fs.readFileSync(r2fullJsonPath, 'utf8'));
  
  console.log(`Importing ${r2fullRaw.length} questions for R02...`);
  for (const rawQ of r2fullRaw) {
    const createdQ = await prisma.question.create({
      data: {
        year: '令和2年 第1回', // 明確化のため名前を変更
        questionNumber: rawQ.questionNumber,
        content: rawQ.content || '',
        sourceSheet: 'R02.1_full.json',
      }
    });

    if (rawQ.choices) {
      let optIndex = 1;
      for (const [key, val] of Object.entries(rawQ.choices)) {
        await prisma.option.create({
          data: {
            questionId: createdQ.id,
            optionNumber: optIndex++,
            content: `${key}: ${val}`,
            isCorrect: false
          }
        });
      }
    }
  }

  console.log('Done!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
