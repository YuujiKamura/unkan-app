import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();
const yearStr = '令和4年 (CBT)';

const parseMultiOptions = (content: string) => {
  if (!content) return null;
  const match = content.match(/^(.+?)[：:]\s*(.*)$/);
  if (!match) return null;
  const title = match[1].trim();
  const rest = match[2];
  const regex = /(?:[①②③④⑤]|[12345][.:：])/;
  const parts = rest.split(regex).map(s => s.trim()).filter(s => s.length > 0);
  if (parts.length >= 2) {
    return { title, choices: parts.map((text, i) => ({ num: i + 1, text })) };
  }
  return null;
};

async function main() {
  const answersPath = path.join(__dirname, '../../data/json/R04.CBT_answers.json');
  const answersList = JSON.parse(fs.readFileSync(answersPath, 'utf8'));

  const questions = await prisma.question.findMany({
    where: { year: yearStr, format: 'MULTI_GROUP' },
    include: { options: { orderBy: { optionNumber: 'asc' } } }
  });

  for (const q of questions) {
    const ansData = answersList.find((a: any) => a.questionNumber === q.questionNumber);
    if (!ansData) continue;

    // 現在のオプションをチェック。既に平坦化されていればスキップ
    // R04.CBT.json で A, B, C の3つしかない状態なら平坦化が必要
    // 展開判定：全てのオプションの optionNumber が 1,2,3 と連続しており、
    // 内容が "A: ①... ②..." になっているか
    const needsFlattening = q.options.length > 0 && q.options.every(o => parseMultiOptions(o.content || '') !== null);

    if (needsFlattening) {
      console.log(`Flattening MULTI_GROUP options for question ${q.questionNumber}`);
      
      // まず既存の option を削除
      await prisma.option.deleteMany({ where: { questionId: q.id } });

      let globalOptNum = 1;
      let groupIndex = 0;
      
      for (const opt of q.options) {
        const parsed = parseMultiOptions(opt.content || '');
        if (parsed) {
          const correctIdxForGroup = ansData.correctOptions[groupIndex]; // ex: 2
          
          for (const choice of parsed.choices) {
            const isCorrect = choice.num === correctIdxForGroup;
            await prisma.option.create({
              data: {
                questionId: q.id,
                optionNumber: globalOptNum++,
                content: `${parsed.title} : ${choice.text}`, // flat content
                isCorrect: isCorrect,
                structuredData: JSON.stringify(parsed)
              }
            });
          }
        }
        groupIndex++;
      }
    }
  }

  // 小問形式 (問29) は parseMultiOptions で null になるかもしれないので別途確認する
  // 問29の形式: "1．Ｅ料金所からＦ料金所... ① 適切 ② 不適切"
  // これも MULTI_GROUP。手動で対応。
  const q29 = questions.find(q => q.questionNumber === 29);
  if (q29 && q29.options.length === 3) {
      console.log(`Custom flattening for Q29`);
      await prisma.option.deleteMany({ where: { questionId: q29.id } });
      let globalOptNum = 1;
      let groupIndex = 0;
      for (const opt of q29.options) {
        const text = opt.content || '';
        // split by "①", "②", "③"
        const parts = text.split(/[①②③④⑤]/).map(s => s.trim()).filter(s => s.length > 0);
        if (parts.length >= 3) {
            const title = parts[0]; // "1．Ｅ料金所..."
            const choices = parts.slice(1).map((t, i) => ({ num: i + 1, text: t }));
            const parsed = { title, choices };
            const ansDataQ29 = answersList.find((a: any) => a.questionNumber === 29);
            const correctIdxForGroup = ansDataQ29?.correctOptions ? ansDataQ29.correctOptions[groupIndex] : 1;

            for (const choice of parsed.choices) {
                const isCorrect = choice.num === correctIdxForGroup;
                await prisma.option.create({
                    data: {
                        questionId: q29.id,
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
  }

  console.log('Exporting updated questions.json...');
  const allQs = await prisma.question.findMany({
    orderBy: [{ year: 'desc' }, { questionNumber: 'asc' }],
    include: { options: { orderBy: { optionNumber: 'asc' } } }
  });
  fs.writeFileSync(path.join(__dirname, '../../public/data/questions.json'), JSON.stringify(allQs, null, 2));
  console.log('Done.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
