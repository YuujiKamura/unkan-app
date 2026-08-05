import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();
const yearStr = '令和4年 (CBT)';

async function main() {
  const answersPath = path.join(__dirname, '../../data/json/R04.CBT_answers.json');
  if (!fs.existsSync(answersPath)) {
    console.error("No answers file found.");
    return;
  }
  const answersList = JSON.parse(fs.readFileSync(answersPath, 'utf8'));

  const questions = await prisma.question.findMany({
    where: { year: yearStr },
    include: { options: { orderBy: { optionNumber: 'asc' } } }
  });

  for (const q of questions) {
    const ansData = answersList.find((a: any) => a.questionNumber === q.questionNumber);
    if (!ansData) continue;

    const correctOpts: number[] = ansData.correctOptions;

    if (q.format === 'SINGLE') {
      // 単純な択一または複数選択
      for (const opt of q.options) {
        const isCorrect = correctOpts.includes(opt.optionNumber);
        await prisma.option.update({
          where: { id: opt.id },
          data: { isCorrect }
        });
      }
    } else if (q.format === 'MULTI_GROUP') {
      // MULTI_GROUP (穴埋め等) は現在 optionNumber 1, 2, 3 のようになっている。
      // もし opt.structuredData がない場合で、展開されていないなら
      // 今回はまず isCorrect だけでも適当に更新する（正解番号をそのまま使う）
      let groupIndex = 0;
      for (const opt of q.options) {
        // q.options が 3つ (A, B, C) で correctOpts が [2, 1, 1] の場合
        // option の中身自体を展開していない場合は、isCorrect=falseのままになるか、
        // あるいは何もしない。
        // （展開やstructuredDataの付与は別途全体のマイグレーションが必要）
      }
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
