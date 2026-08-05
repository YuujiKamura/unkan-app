import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  const q29Data = JSON.parse(fs.readFileSync(path.join(__dirname, '../../data/json/R04.CBT_21_30.json'), 'utf8')).find((q: any) => q.questionNumber === 29);
  const answersList = JSON.parse(fs.readFileSync(path.join(__dirname, '../../data/json/R04.CBT_answers.json'), 'utf8'));
  const ansDataQ29 = answersList.find((a: any) => a.questionNumber === 29);

  const dbQ29 = await prisma.question.findFirst({ where: { year: '令和4年 (CBT)', questionNumber: 29 } });
  if (!dbQ29) {
    console.log("Q29 not found in DB");
    return;
  }

  await prisma.option.deleteMany({ where: { questionId: dbQ29.id } });

  let globalOptNum = 1;
  let groupIndex = 0;
  for (const opt of q29Data.options) {
    const text = opt.content || '';
    const parts = text.split(/[①②③④⑤]/).map((s: string) => s.trim()).filter((s: string) => s.length > 0);
    if (parts.length >= 3) {
        const title = parts[0]; 
        const choices = parts.slice(1).map((t: string, i: number) => ({ num: i + 1, text: t }));
        const parsed = { title, choices };
        const correctIdxForGroup = ansDataQ29?.correctOptions ? ansDataQ29.correctOptions[groupIndex] : 1;

        for (const choice of parsed.choices) {
            const isCorrect = choice.num === correctIdxForGroup;
            await prisma.option.create({
                data: {
                    questionId: dbQ29.id,
                    optionNumber: globalOptNum++,
                    content: `${title} : ${choice.text}`,
                    isCorrect: isCorrect,
                    structuredData: JSON.stringify(parsed)
                }
            });
        }
    }
    groupIndex++;
  }

  console.log('Exporting all to public/data/questions.json...');
  const allQs = await prisma.question.findMany({
    orderBy: [{ year: 'desc' }, { questionNumber: 'asc' }],
    include: { options: { orderBy: { optionNumber: 'asc' } } }
  });
  fs.writeFileSync(path.join(__dirname, '../../public/data/questions.json'), JSON.stringify(allQs, null, 2));
  console.log('Done fixing Q29.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
