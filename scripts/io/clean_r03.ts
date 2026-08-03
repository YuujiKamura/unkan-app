import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const r3qs = await prisma.question.findMany({
    where: { year: '令和3年 (CBT)' }
  });
  
  let deletedCount = 0;
  for (const q of r3qs) {
    // 令和5年・令和6年などのフォーマットである【貨物自動車運送事業法関係】を持たない方を、
    // R02.1 の重複データとみなして削除する。
    if (!q.content.startsWith('【貨物自動車運送事業法関係】')) {
      await prisma.question.delete({
        where: { id: q.id }
      });
      deletedCount++;
    }
  }
  
  console.log(`Deleted ${deletedCount} duplicate questions from R03 (CBT).`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
