const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const qs = await prisma.question.findMany({
    where: {
      OR: [
        { content: { contains: '標識' } },
        { content: { contains: '下図' } },
        { content: { contains: '下の図' } },
        { content: { contains: '次の図' } },
        { content: { contains: '次表' } },
        { content: { contains: '次の表' } }
      ]
    },
    select: { id: true, year: true, questionNumber: true, content: true }
  });
  
  console.log(`Found ${qs.length} questions that might require images/tables.`);
  for (const q of qs) {
    console.log(`- Q${q.id} [${q.year} 問${q.questionNumber}]`);
  }
}
main().finally(() => prisma.$disconnect());
