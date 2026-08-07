const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const multiQ = await prisma.question.findMany({
    where: { format: 'MULTI_GROUP' },
    include: { options: true }
  });

  let migratedCount = 0;

  for (const q of multiQ) {
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

    // Identify Pattern 2
    if (q.options.length === seenTitles.size && totalChoices > seenTitles.size) {
      console.log(`Migrating Q${q.id} ...`);
      
      let newOptions = [];
      let currentOptionNumber = 1;

      // Ensure stable order of groups (e.g., A, B, C, D)
      const sortedOptions = q.options.sort((a, b) => a.optionNumber - b.optionNumber);

      for (const opt of sortedOptions) {
        if (!opt.structuredData) continue;
        const sd = JSON.parse(opt.structuredData);
        
        // isCorrect: true -> choice 0 (①) is correct.
        // isCorrect: false -> choice 1 (②) is correct.
        const correctChoiceIndex = opt.isCorrect ? 0 : 1;

        for (let i = 0; i < sd.choices.length; i++) {
          newOptions.push({
            questionId: q.id,
            optionNumber: currentOptionNumber++,
            content: `${sd.title} : ${sd.choices[i].num === 1 ? '①' : '②'} ${sd.choices[i].text}`,
            isCorrect: (i === correctChoiceIndex),
            structuredData: opt.structuredData // Keep the same structured data for rendering
          });
        }
      }

      // Delete old options
      await prisma.option.deleteMany({
        where: { questionId: q.id }
      });

      // Insert new options
      await prisma.option.createMany({
        data: newOptions
      });

      migratedCount++;
    }
  }

  console.log(`Migrated ${migratedCount} questions.`);
}

main().finally(() => prisma.$disconnect());
