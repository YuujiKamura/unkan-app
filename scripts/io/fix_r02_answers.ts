import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

const r02CorrectAnswers: Record<number, number[]> = {
  1: [1, 3],
  3: [1],
  4: [1, 2],
  5: [1, 4],
  6: [4],
  7: [2],
  8: [4],
  9: [4],
  10: [2, 3],
  12: [4],
  13: [2],
  14: [1, 4],
  16: [2],
  17: [3],
  18: [2, 4],
  19: [2],
  21: [2, 3],
  22: [3],
  23: [2],
  24: [2, 4],
  25: [2, 3],
  26: [1, 4],
  27: [1, 3, 4],
  28: [3],
  30: [4, 6, 9]
};

// For MULTI_GROUP, we map the correct sub-choice index (1-based) for each group
const r02MultiGroupAnswers: Record<number, number[]> = {
  2: [2, 1, 1], // A2, B1, C1
  11: [1, 1, 2, 2], // A1, B1, C2, D2
  15: [2, 1, 1], // A2, B1, C1
  20: [1, 1, 2, 2], // A1, B1, C2, D2
  29: [1, 1, 1] // 1:1, 2:1, 3:1
};

async function main() {
  const questions = await prisma.question.findMany({
    where: { year: '令和2年 (CBT)' },
    include: { options: { orderBy: { optionNumber: 'asc' } } }
  });

  for (const q of questions) {
    if (r02CorrectAnswers[q.questionNumber]) {
      const correct = r02CorrectAnswers[q.questionNumber];
      for (const opt of q.options) {
        const isCorrect = correct.includes(opt.optionNumber);
        await prisma.option.update({
          where: { id: opt.id },
          data: { isCorrect }
        });
      }
    } else if (r02MultiGroupAnswers[q.questionNumber]) {
      // It's a MULTI_GROUP question.
      const correctIndices = r02MultiGroupAnswers[q.questionNumber];
      
      if (q.questionNumber === 29 && q.format !== 'MULTI_GROUP') {
        console.log('Fixing Q29 format to MULTI_GROUP...');
        await prisma.question.update({ where: { id: q.id }, data: { format: 'MULTI_GROUP' } });
        
        // Delete existing options
        await prisma.option.deleteMany({ where: { questionId: q.id } });
        
        // Recreate options based on hardcoded R02 Q29 text
        const q29Data = [
          { title: '1', choices: ['7時30分', '7時40分', '7時50分'] },
          { title: '2', choices: ['違反していない', '違反している'] },
          { title: '3', choices: ['違反していない', '違反している'] }
        ];
        
        let globalOptNum = 1;
        for (let i = 0; i < q29Data.length; i++) {
          const group = q29Data[i];
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
        // Normal MULTI_GROUP
        // The options are grouped by structuredData.title
        // But they are flattened.
        let groupIndex = -1;
        let lastTitle = '';
        for (const opt of q.options) {
          if (opt.structuredData) {
            const parsed = JSON.parse(opt.structuredData);
            if (parsed.title !== lastTitle) {
              groupIndex++;
              lastTitle = parsed.title;
            }
            // choice number inside the group
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

  console.log('Exporting all to public/data/questions.json...');
  const allQs = await prisma.question.findMany({
    orderBy: [{ year: 'desc' }, { questionNumber: 'asc' }],
    include: { options: { orderBy: { optionNumber: 'asc' } } }
  });
  fs.writeFileSync(path.join(__dirname, '../../public/data/questions.json'), JSON.stringify(allQs, null, 2));
  console.log('Done fixing R02 answers.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
