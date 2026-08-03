import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

function expandChoices(choices: Record<string, string>): { optionNumber: number, content: string }[] {
  let expanded: { optionNumber: number, content: string }[] = [];
  let isGrouped = false;

  // Check if choices contain "A : ① ... ② ..." format
  const values = Object.values(choices);
  if (values.some(v => v.includes('①') && v.includes('②') && /^[A-E]\s*:/.test(v))) {
    isGrouped = true;
  }

  if (isGrouped) {
    let optNum = 1;
    for (const val of values) {
      const match = val.match(/^([A-E])\s*[:：]\s*(.*)$/);
      if (match) {
        const prefix = match[1];
        const content = match[2];
        // Split by ①, ②, ③, ④
        const parts = content.split(/[①②③④]/).map(s => s.trim()).filter(s => s.length > 0);
        const marks = content.match(/[①②③④]/g) || [];
        
        for (let i = 0; i < parts.length; i++) {
          const mark = marks[i] || `(${i+1})`;
          expanded.push({
            optionNumber: optNum++,
            content: `${prefix} : ${mark} ${parts[i]}`
          });
        }
      } else {
        expanded.push({
          optionNumber: optNum++,
          content: val
        });
      }
    }
  } else {
    for (const [key, val] of Object.entries(choices)) {
      expanded.push({
        optionNumber: parseInt(key) || expanded.length + 1,
        content: String(val)
      });
    }
  }
  return expanded;
}

async function importJson(filePath: string, yearStr: string, answersMap: any) {
  if (!fs.existsSync(filePath)) {
    console.log(`${filePath} not found`);
    return;
  }
  console.log(`Importing ${filePath} as ${yearStr}...`);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  
  const answerKey = yearStr.replace('年 (CBT)', '年度 CBT');
  const answers = answersMap[answerKey] || [];

  for (const q of data) {
    if (!q.questionNumber || !q.content) continue;
    
    // Check for existing question
    await prisma.question.deleteMany({
      where: { year: yearStr, questionNumber: q.questionNumber }
    });

    const created = await prisma.question.create({
      data: {
        year: yearStr,
        questionNumber: q.questionNumber,
        content: q.content,
        majorField: "貨物",
        subField: "その他",
      }
    });

    const ansData = answers.find((a: any) => a.questionNumber === q.questionNumber);
    let correctOpts: number[] = ansData ? ansData.correctOptions : [];

    if (q.choices) {
      const expandedOpts = expandChoices(q.choices);
      // Determine correct options logic for expanded ones
      // In answers.json, correctOptions might be [1, 2, 1] which corresponds to A=1, B=2, C=1
      // Our expanded options are A1, A2, B1, B2, C1, C2 (optionNumber 1, 2, 3, 4, 5, 6)
      // So A=1 -> 1, B=2 -> 4, C=1 -> 5
      let finalCorrect: number[] = [];
      if (expandedOpts.length > Object.keys(q.choices).length && correctOpts.length > 0) {
        // Expanded format mapping
        let groupIndex = 0;
        let currentPrefix = '';
        let optIdxInGroup = 0;
        
        for (let i = 0; i < expandedOpts.length; i++) {
          const prefixMatch = expandedOpts[i].content.match(/^([A-E])/);
          const prefix = prefixMatch ? prefixMatch[1] : '';
          if (prefix !== currentPrefix) {
            currentPrefix = prefix;
            optIdxInGroup = 1;
            groupIndex++;
          } else {
            optIdxInGroup++;
          }
          
          if (correctOpts[groupIndex - 1] === optIdxInGroup) {
            finalCorrect.push(expandedOpts[i].optionNumber);
          }
        }
      } else {
        finalCorrect = correctOpts;
      }

      for (const opt of expandedOpts) {
        await prisma.option.create({
          data: {
            questionId: created.id,
            optionNumber: opt.optionNumber,
            content: opt.content,
            isCorrect: finalCorrect.includes(opt.optionNumber)
          }
        });
      }
    }
  }
}

async function main() {
  const answersPath = path.join(__dirname, '../../data/json/answers.json');
  const answersMap = fs.existsSync(answersPath) ? JSON.parse(fs.readFileSync(answersPath, 'utf8')) : {};

  // Clean old R05 and R06
  const targetYears = ['令和5年 (CBT)', '令和6年 (CBT)'];
  for (const year of targetYears) {
    const qCount = await prisma.question.count({ where: { year } });
    if (qCount > 0) {
      console.log(`Deleting ${qCount} questions for ${year}...`);
      await prisma.question.deleteMany({ where: { year } });
    }
  }

  // Also clean '令和3年 (CBT)' and '令和4年 (CBT)' as they are wrongly mapped
  const wrongYears = ['令和3年 (CBT)', '令和4年 (CBT)'];
  for (const year of wrongYears) {
    const qCount = await prisma.question.count({ where: { year } });
    if (qCount > 0) {
      console.log(`Deleting ${qCount} incorrectly mapped questions for ${year}...`);
      await prisma.question.deleteMany({ where: { year } });
    }
  }

  const r06Path = path.join(__dirname, '../../data/json/mondai.json');
  await importJson(r06Path, '令和6年 (CBT)', answersMap);

  const r05Path = path.join(__dirname, '../../data/json/mondai_1.json');
  await importJson(r05Path, '令和5年 (CBT)', answersMap);

  console.log('Exporting all to public/data/questions.json...');
  const allQs = await prisma.question.findMany({
    orderBy: [{ year: 'desc' }, { questionNumber: 'asc' }],
    include: { options: { orderBy: { optionNumber: 'asc' } } }
  });
  fs.writeFileSync(path.join(__dirname, '../../public/data/questions.json'), JSON.stringify(allQs, null, 2));

  console.log('Done fixing R05 and R06 data!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
