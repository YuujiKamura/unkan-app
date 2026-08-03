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

  const outPath = path.join(__dirname, '../../public/data/questions.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(questions, null, 2), 'utf-8');

  console.log(`Exported ${questions.length} questions to public/data/questions.json`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
