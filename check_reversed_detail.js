const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  for (const id of [288, 292, 297]) {
    const q = await prisma.question.findUnique({
      where: { id },
      include: { options: { orderBy: { optionNumber: 'asc' } } }
    });
    console.log(`Q${id} Content:\n${q.content}\n`);
    for (const o of q.options) {
      console.log(`Opt ${o.optionNumber} (isCorrect=${o.isCorrect}): ${o.content}`);
    }
    console.log('---------------------------');
  }
}
main().finally(() => prisma.$disconnect());
