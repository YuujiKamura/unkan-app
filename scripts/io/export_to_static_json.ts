import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  const questions = await prisma.question.findMany({
    include: {
      options: true,
      explanation: true
    }
  });

  const answersPath = path.join(__dirname, '../../data/json/answers.json');
  let answersData: any = {};
  if (fs.existsSync(answersPath)) {
    answersData = JSON.parse(fs.readFileSync(answersPath, 'utf-8'));
  }

  const exportData = questions.map((q: any) => {
    let ansList = null;
    
    // DBの year 例: "令和5年 (CBT)"
    // answersData の key 例: "令和5年度 CBT"
    const keys = Object.keys(answersData);
    
    for (const key of keys) {
      const yearMatchDB = q.year?.match(/令和(\d+)年/);
      const yearMatchKey = key.match(/令和(\d+)年度?/);
      if (yearMatchDB && yearMatchKey && yearMatchDB[1] === yearMatchKey[1]) {
        ansList = answersData[key];
        break;
      }
    }

    if (ansList && Array.isArray(ansList)) {
      const ans = ansList.find((a: any) => a.questionNumber === q.questionNumber);
      if (ans) {
        q.correctOptions = Array.isArray(ans.correctOptions) ? ans.correctOptions : [ans.correctOptions];
      }
    }

    // fallback
    if (!q.correctOptions) {
      q.correctOptions = [];
    }

    return q;
  });

  const outPath = path.join(__dirname, '../../public/data/questions.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(exportData, null, 2), 'utf-8');

  console.log(`Exported ${exportData.length} questions to public/data/questions.json`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
