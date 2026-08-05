import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// The correct answer option numbers based on R02.1 PDF table.
// For Q24, Q26, Q27, we set isCorrect for the "適" (K) options.
const r02_1CorrectAnswers: Record<number, number[]> = {
  1: [4],
  2: [2, 3],
  3: [2],
  4: [4],
  5: [2, 4],
  6: [2, 4],
  8: [4],
  9: [2],
  10: [2],
  12: [1],
  13: [3],
  14: [3],
  16: [1],
  17: [1, 2],
  18: [2, 3],
  19: [4],
  21: [1, 3],
  22: [2, 4],
  23: [2],
  24: [2, 4], // K2,4
  25: [1, 2],
  26: [1, 2, 3], // K1,2,3
  27: [2, 3, 4], // K2,3,4
};

// For MULTI_GROUP, we map the correct sub-choice index (1-based) for each group
const r02_1MultiGroupAnswers: Record<number, number[]> = {
  7: [2, 2, 1], // A2, B2, C1
  11: [1, 2, 5, 2], // A1, B2, C5, D2
  15: [2, 1, 1], // A2, B1, C1
  20: [1, 2, 2, 2], // A1, B2, C2, D2
  28: [2, 2, 1], // A2, C2, E1
  29: [3, 2, 1], // A3, C2, E1
  30: [5, 3, 8], // 5, 3, 8
};

async function main() {
  const questions = await prisma.question.findMany({
    where: { year: '令和2年 第1回' },
    include: { options: { orderBy: { optionNumber: 'asc' } } }
  });

  for (const q of questions) {
    if (r02_1CorrectAnswers[q.questionNumber]) {
      const correct = r02_1CorrectAnswers[q.questionNumber];
      for (const opt of q.options) {
        const isCorrect = correct.includes(opt.optionNumber);
        await prisma.option.update({
          where: { id: opt.id },
          data: { isCorrect }
        });
      }
    } else if (r02_1MultiGroupAnswers[q.questionNumber]) {
      // Normal MULTI_GROUP
      const correctIndices = r02_1MultiGroupAnswers[q.questionNumber];
      
      if (q.questionNumber === 30 && q.options.length === 0) {
        console.log('Fixing Q30 format to MULTI_GROUP and injecting options...');
        await prisma.question.update({ where: { id: q.id }, data: { format: 'MULTI_GROUP' } });
        
        const q30Data = [
          { title: 'A', choices: Array.from({length: 8}, (_, i) => String(i + 1)) },
          { title: 'B', choices: Array.from({length: 8}, (_, i) => String(i + 1)) },
          { title: 'C', choices: Array.from({length: 8}, (_, i) => String(i + 1)) }
        ];
        
        let globalOptNum = 1;
        for (let i = 0; i < q30Data.length; i++) {
          const group = q30Data[i];
          const correctIdx = correctIndices[i];
          const parsed = { title: group.title, choices: group.choices.map((t, idx) => ({ num: idx + 1, text: t })) };
          
          for (const choice of parsed.choices) {
            await prisma.option.create({
              data: {
                questionId: q.id,
                optionNumber: globalOptNum++,
                content: `${group.title} : ${choice.text}`,
                isCorrect: choice.num === correctIdx,
                structuredData: JSON.stringify(parsed)
              }
            });
          }
        }
      } else {
        let groupIndex = -1;
        let lastTitle = '';
        for (const opt of q.options) {
          if (opt.structuredData) {
            const parsed = JSON.parse(opt.structuredData);
            if (parsed.title !== lastTitle) {
              groupIndex++;
              lastTitle = parsed.title;
            }
            const matchChoice = parsed.choices.find((c: any) => opt.content.includes(c.text));
            const choiceNum = matchChoice ? matchChoice.num : 1; 
            const isCorrect = (choiceNum === correctIndices[groupIndex]);
            
            await prisma.option.update({
              where: { id: opt.id },
              data: { isCorrect }
            });
          }
        }
      }
    }
  }

  // Update questions.json
  const allQs = await prisma.question.findMany({
    orderBy: [{ year: 'desc' }, { questionNumber: 'asc' }],
    include: { options: { orderBy: { optionNumber: 'asc' } } }
  });
  fs.writeFileSync(path.join(__dirname, '../../public/data/questions.json'), JSON.stringify(allQs, null, 2));
  console.log('Done fixing R02.1 answers.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
