import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  // 1. Delete incomplete R03 and R04 questions
  const incompleteYears = ['令和3年 (CBT)', '令和4年 (CBT)', '模擬問題', '模擬問題(1)'];
  for (const year of incompleteYears) {
    const qCount = await prisma.question.count({ where: { year } });
    if (qCount > 0) {
      console.log(`Deleting ${qCount} questions for ${year}...`);
      await prisma.question.deleteMany({ where: { year } });
    }
  }

  // 2. Import mondai.json as 令和3年 (CBT)
  const r03Path = path.join(__dirname, '../../data/json/mondai.json');
  if (fs.existsSync(r03Path)) {
    console.log('Importing mondai.json as 令和3年 (CBT)...');
    const data = JSON.parse(fs.readFileSync(r03Path, 'utf8'));
    for (const q of data) {
      if (!q.questionNumber || !q.content) continue;
      const created = await prisma.question.create({
        data: {
          year: '令和3年 (CBT)',
          questionNumber: q.questionNumber,
          content: q.content,
          majorField: "貨物",
          subField: "その他",
        }
      });
      if (q.choices) {
        for (const [key, val] of Object.entries(q.choices)) {
          const num = parseInt(key);
          if (!isNaN(num)) {
            await prisma.option.create({
              data: {
                questionId: created.id,
                optionNumber: num,
                content: String(val),
                isCorrect: false
              }
            });
          }
        }
      }
    }
  }

  // 3. Import mondai_1.json as 令和4年 (CBT)
  const r04Path = path.join(__dirname, '../../data/json/mondai_1.json');
  if (fs.existsSync(r04Path)) {
    console.log('Importing mondai_1.json as 令和4年 (CBT)...');
    const data = JSON.parse(fs.readFileSync(r04Path, 'utf8'));
    for (const q of data) {
      if (!q.questionNumber || !q.content) continue;
      const created = await prisma.question.create({
        data: {
          year: '令和4年 (CBT)',
          questionNumber: q.questionNumber,
          content: q.content,
          majorField: "貨物",
          subField: "その他",
        }
      });
      if (q.choices) {
        for (const [key, val] of Object.entries(q.choices)) {
          const num = parseInt(key);
          if (!isNaN(num)) {
            await prisma.option.create({
              data: {
                questionId: created.id,
                optionNumber: num,
                content: String(val),
                isCorrect: false
              }
            });
          }
        }
      }
    }
  }

  console.log('Done fixing data!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
