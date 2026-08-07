const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const multiQ = await prisma.question.findMany({
    where: { format: 'MULTI_GROUP' },
    include: { options: true }
  });

  let pattern1 = 0;
  let pattern2 = 0;
  let pattern2Questions = [];

  for (const q of multiQ) {
    // Check if the number of options matches the number of total choices in structuredData
    let totalChoices = 0;
    const seenTitles = new Set();
    for (const opt of q.options) {
      if (opt.structuredData) {
        try {
          const sd = JSON.parse(opt.structuredData);
          if (!seenTitles.has(sd.title)) {
            totalChoices += sd.choices.length;
            seenTitles.add(sd.title);
          }
        } catch(e) {}
      }
    }

    if (q.options.length === totalChoices) {
      pattern1++;
    } else if (q.options.length === seenTitles.size && totalChoices > seenTitles.size) {
      pattern2++;
      pattern2Questions.push(q.id);
    } else {
      console.log(`Unknown pattern for Q${q.id}: options.length=${q.options.length}, totalChoices=${totalChoices}, seenTitles=${seenTitles.size}`);
    }
  }

  console.log(`Pattern 1 (Expanded, like Q249): ${pattern1}`);
  console.log(`Pattern 2 (Compressed, like Q279): ${pattern2}`);
  console.log(`Pattern 2 Question IDs:`, pattern2Questions.join(', '));
}

main().finally(() => prisma.$disconnect());
