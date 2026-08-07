const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const q = await prisma.question.findFirst({
    where: { year: '令和5年 (CBT)', questionNumber: 29 },
    include: { options: { orderBy: { optionNumber: 'asc' } } }
  });
  console.log(`Q${q.id} format: ${q.format}`);
  console.log(`Content:\n${q.content}`);
  console.log(`Options:`);
  for (const opt of q.options) {
    console.log(`- Opt ${opt.optionNumber} (isCorrect=${opt.isCorrect}):\n  ${opt.content}`);
  }
}
main().finally(() => prisma.$disconnect());
