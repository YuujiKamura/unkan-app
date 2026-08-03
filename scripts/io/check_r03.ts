import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const qs = await prisma.question.findMany({
    where: { year: '令和3年 (CBT)' }
  });
  
  const grouped: Record<number, number> = {};
  qs.forEach(q => {
    grouped[q.questionNumber] = (grouped[q.questionNumber] || 0) + 1;
  });
  
  console.log('Questions count per questionNumber:', grouped);
  
  // ソースファイルの確認
  const sources: Record<string, number> = {};
  qs.forEach(q => {
    const s = q.sourceSheet || 'null';
    sources[s] = (sources[s] || 0) + 1;
  });
  console.log('Sources:', sources);
}

main().finally(() => prisma.$disconnect());
