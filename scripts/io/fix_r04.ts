import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// We reuse the expandChoices logic from fix_r05_r06.ts
function expandChoices(choices: Record<string, string>): { optionNumber: number, content: string }[] {
  let expanded: { optionNumber: number, content: string }[] = [];
  let isGrouped = false;
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
        const parts = content.split(/[①②③④]/).map(s => s.trim()).filter(s => s.length > 0);
        const marks = content.match(/[①②③④]/g) || [];
        for (let i = 0; i < parts.length; i++) {
          const mark = marks[i] || `(${i+1})`;
          expanded.push({ optionNumber: optNum++, content: `${prefix} : ${mark} ${parts[i]}` });
        }
      } else {
        expanded.push({ optionNumber: optNum++, content: val });
      }
    }
  } else {
    for (const [key, val] of Object.entries(choices)) {
      expanded.push({ optionNumber: parseInt(key) || expanded.length + 1, content: String(val) });
    }
  }
  return expanded;
}

async function importJson(filePath: string, yearStr: string, answersMap: any) {
  if (!fs.existsSync(filePath)) return;
  console.log(`Importing ${filePath} as ${yearStr}...`);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const answerKey = yearStr.replace('年 (CBT)', '年度 CBT');
  const answers = answersMap[answerKey] || [];

  for (const q of data) {
    if (!q.questionNumber || !q.content) continue;
    await prisma.question.deleteMany({ where: { year: yearStr, questionNumber: q.questionNumber } });
    const created = await prisma.question.create({
      data: { year: yearStr, questionNumber: q.questionNumber, content: q.content, majorField: "貨物", subField: "その他" }
    });

    const ansData = answers.find((a: any) => a.questionNumber === q.questionNumber);
    let correctOpts: number[] = ansData ? ansData.correctOptions : [];

    if (q.choices) {
      const expandedOpts = expandChoices(q.choices);
      let finalCorrect: number[] = [];
      if (expandedOpts.length > Object.keys(q.choices).length && correctOpts.length > 0) {
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
          } else { optIdxInGroup++; }
          if (correctOpts[groupIndex - 1] === optIdxInGroup) {
            finalCorrect.push(expandedOpts[i].optionNumber);
          }
        }
      } else { finalCorrect = correctOpts; }

      for (const opt of expandedOpts) {
        await prisma.option.create({
          data: { questionId: created.id, optionNumber: opt.optionNumber, content: opt.content, isCorrect: finalCorrect.includes(opt.optionNumber) }
        });
      }
    }
  }
}

async function main() {
  const answersPath = path.join(__dirname, '../../data/json/answers.json');
  const answersMap = fs.existsSync(answersPath) ? JSON.parse(fs.readFileSync(answersPath, 'utf8')) : {};

  // Clean old R04
  await prisma.question.deleteMany({ where: { year: '令和4年 (CBT)' } });

  const r04Path = path.join(__dirname, '../../data/json/R04.CBT.json');
  await importJson(r04Path, '令和4年 (CBT)', answersMap);

  console.log('Exporting all to public/data/questions.json...');
  const allQs = await prisma.question.findMany({
    orderBy: [{ year: 'desc' }, { questionNumber: 'asc' }],
    include: { options: { orderBy: { optionNumber: 'asc' } } }
  });
  fs.writeFileSync(path.join(__dirname, '../../public/data/questions.json'), JSON.stringify(allQs, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
