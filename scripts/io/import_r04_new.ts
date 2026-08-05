import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();
const yearStr = '令和4年 (CBT)';

async function main() {
  const filePath = path.join(__dirname, '../../data/json/R04.CBT.json');
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  // Clean old R04
  await prisma.question.deleteMany({ where: { year: yearStr } });

  // Read answers
  const answersPath = path.join(__dirname, '../../data/json/answers.json');
  const answersMap = fs.existsSync(answersPath) ? JSON.parse(fs.readFileSync(answersPath, 'utf8')) : {};
  const answerKey = '令和4年度 CBT';
  const answers = answersMap[answerKey] || [];

  for (const q of data) {
    if (!q.questionNumber || !q.content) continue;
    
    // DB に追加
    const created = await prisma.question.create({
      data: { 
        year: yearStr, 
        questionNumber: q.questionNumber, 
        content: q.content, 
        majorField: "貨物", // デフォルト
        subField: "その他", // デフォルト
        format: q.format || 'SINGLE',
        knowledgeTags: q.knowledgeTags || ''
      }
    });

    const ansData = answers.find((a: any) => a.questionNumber === q.questionNumber);
    let correctOpts: number[] = ansData ? ansData.correctOptions : [];

    for (const opt of q.options) {
      // isCorrect の判定 (answers.json から取得できた場合上書き)
      let isCorrect = correctOpts.includes(opt.optionNumber);
      
      await prisma.option.create({
        data: { 
          questionId: created.id, 
          optionNumber: opt.optionNumber, 
          content: opt.content, 
          isCorrect: isCorrect 
        }
      });
    }
  }

  console.log('Exporting all to public/data/questions.json...');
  const allQs = await prisma.question.findMany({
    orderBy: [{ year: 'desc' }, { questionNumber: 'asc' }],
    include: { options: { orderBy: { optionNumber: 'asc' } } }
  });
  fs.writeFileSync(path.join(__dirname, '../../public/data/questions.json'), JSON.stringify(allQs, null, 2));
  console.log('Done.');
}
main().catch(console.error).finally(() => prisma.$disconnect());
