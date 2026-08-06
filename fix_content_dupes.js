const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();

async function run() {
  const qs = await prisma.question.findMany({
    include: { options: true }
  });

  let updatedCount = 0;

  for (const q of qs) {
    if (!q.content || !q.options || q.options.length === 0) continue;
    
    const opt1 = q.options.find(o => o.optionNumber === 1);
    if (opt1 && opt1.content) {
      const prefix = opt1.content.substring(0, 15);
      const idx = q.content.indexOf(prefix);
      
      if (idx > 10) { // Ensure it's not the actual start of the question
        let cutIdx = idx;
        while (cutIdx > 0 && q.content[cutIdx - 1] !== '\n') {
          cutIdx--;
        }
        let newContent = q.content.substring(0, cutIdx).trim();
        
        console.log(`\n--- Fixing QID ${q.id} (${q.year} Q${q.questionNumber}) ---`);
        console.log(`Removed part:\n${q.content.substring(cutIdx)}`);
        
        await prisma.question.update({
          where: { id: q.id },
          data: { content: newContent }
        });
        updatedCount++;
      }
    }
  }

  console.log(`\nUpdated ${updatedCount} questions in DB.`);
  
  const updatedQs = await prisma.question.findMany({
    include: { options: true, explanation: true, userMeta: true }
  });
  
  const mapped = updatedQs.map(q => ({
    ...q,
    explanation: q.explanation?.content || null,
    isDebated: q.explanation?.isDebated || false,
    correctOptions: q.format === 'MULTI_GROUP' ? q.options.filter(o => o.isCorrect).map(o => o.optionNumber) : []
  }));
  fs.writeFileSync('./public/data/questions.json', JSON.stringify(mapped, null, 2), 'utf8');
}

run().catch(console.error).finally(() => prisma.$disconnect());
