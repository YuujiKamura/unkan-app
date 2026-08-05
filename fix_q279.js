const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const q = await prisma.question.findFirst({
    where: { id: 279 },
    include: { options: { orderBy: { optionNumber: 'asc' } } }
  });

  if (!q) return console.log('Q279 not found.');

  for (const opt of q.options) {
    if (opt.optionNumber === 3) { // B: ① 勧告
      await prisma.option.update({
        where: { id: opt.id },
        data: { isCorrect: false }
      });
    }
    if (opt.optionNumber === 4) { // B: ② 指導
      await prisma.option.update({
        where: { id: opt.id },
        data: { isCorrect: true }
      });
    }
    if (opt.optionNumber === 5) { // C: ① 20 -> 29
      const newSD = JSON.stringify({title: 'C', choices: [{num: 1, text: '29'}, {num: 2, text: '30'}]});
      await prisma.option.update({
        where: { id: opt.id },
        data: { 
          content: 'C : ① 29',
          isCorrect: true,
          structuredData: newSD
        }
      });
    }
    if (opt.optionNumber === 6) { // C: ② 30
      const newSD = JSON.stringify({title: 'C', choices: [{num: 1, text: '29'}, {num: 2, text: '30'}]});
      await prisma.option.update({
        where: { id: opt.id },
        data: { 
          isCorrect: false,
          structuredData: newSD
        }
      });
    }
    if (opt.optionNumber === 7) { // D: ① 安全管理者
      const newSD = JSON.stringify({title: 'D', choices: [{num: 1, text: '安全管理者'}, {num: 2, text: '統括運行管理者'}]});
      await prisma.option.update({
        where: { id: opt.id },
        data: { 
          structuredData: newSD
        }
      });
    }
    if (opt.optionNumber === 8) { // D: ② 運行管理者 -> 統括運行管理者
      const newSD = JSON.stringify({title: 'D', choices: [{num: 1, text: '安全管理者'}, {num: 2, text: '統括運行管理者'}]});
      await prisma.option.update({
        where: { id: opt.id },
        data: { 
          content: 'D : ② 統括運行管理者',
          isCorrect: true,
          structuredData: newSD
        }
      });
    }
  }
  console.log('Q279 updated successfully.');
}

main().finally(() => prisma.$disconnect());
