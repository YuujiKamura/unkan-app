import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
  const qs = await prisma.question.findMany({
    orderBy: [{ year: 'desc' }, { questionNumber: 'asc' }],
    include: { 
      options: { orderBy: { optionNumber: 'asc' } },
      explanation: true
    }
  });
  fs.writeFileSync(path.join(__dirname, '../../public/data/questions.json'), JSON.stringify(qs, null, 2));
  console.log("Exported questions.json");
}
main().catch(console.error).finally(() => prisma.$disconnect());
