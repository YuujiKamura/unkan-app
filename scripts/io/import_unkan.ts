import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();
const jsonDir = path.join(process.cwd(), 'data', 'json');

async function main() {
  const files = fs.readdirSync(jsonDir).filter(f => f.endsWith('.json') && !f.endsWith('_full.json'));
  
  for (const file of files) {
    const filePath = path.join(jsonDir, file);
    let data;
    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      data = JSON.parse(raw);
    } catch (e) {
      console.log(`Failed to parse ${file}`);
      continue;
    }
    
    // Determine year/majorField based on filename
    // e.g. R04.CBT.json -> 令和4年度 CBT
    let year = "不明";
    let subField = "その他";
    let isCbt = file.includes("CBT");
    
    if (file.includes("R02")) year = "令和2年";
    if (file.includes("R04")) year = "令和4年";
    if (file.includes("mondai")) {
      year = "模擬問題";
      if (file.includes("1")) year = "模擬問題(1)";
    }
    if (isCbt) {
      year += " (CBT)";
    }

    console.log(`Processing ${file} as ${year}...`);

    for (const qData of data) {
      if (!qData.questionNumber || !qData.content) continue;
      
      const createdQ = await prisma.question.create({
        data: {
          questionNumber: qData.questionNumber,
          content: qData.content,
          year: year,
          majorField: "貨物",
          subField: subField,
        }
      });
      
      if (qData.choices) {
        for (const [optNumStr, optContent] of Object.entries(qData.choices)) {
          const optNum = parseInt(optNumStr);
          if (isNaN(optNum)) continue;
          
          await prisma.option.create({
            data: {
              questionId: createdQ.id,
              optionNumber: optNum,
              content: String(optContent),
              // We don't have correct answer data yet for most, default to false
              // or true if it's an answer JSON
              isCorrect: false 
            }
          });
        }
      }
    }
  }
  
  console.log("Import completed!");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
