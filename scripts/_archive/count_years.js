const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const counts = await prisma.question.groupBy({
    by: ['year'],
    _count: {
      id: true,
    },
    orderBy: {
      year: 'asc',
    },
  });
  console.log(counts);
}
main().finally(() => prisma.$disconnect());
