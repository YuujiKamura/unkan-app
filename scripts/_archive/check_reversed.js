const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const qs = await prisma.question.findMany({
    where: { format: 'SINGLE' },
    include: { options: true }
  });
  
  let reversedCount = 0;
  for (const q of qs) {
    if (q.content && q.content.includes('A: ①') && q.options.some(o => o.content.length > 30)) {
      console.log(`Q${q.id} (Year: ${q.year}, Num: ${q.questionNumber}) seems reversed.`);
      reversedCount++;
    }
  }
  console.log(`Total reversed questions found: ${reversedCount}`);
}
main().finally(() => prisma.$disconnect());
