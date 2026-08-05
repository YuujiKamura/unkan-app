const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function main() {
  const ids = [249, 305];
  
  for (const id of ids) {
    const q = await prisma.question.findUnique({
      where: { id },
      include: { options: { orderBy: { optionNumber: 'asc' } } }
    });
    
    if (!q) continue;

    const groups = {};
    for (const opt of q.options) {
      // e.g. 'A : ① 遅滞なく'
      const match = opt.content.match(/^([A-Z])\s*[:：]\s*[①②③④](.*)/);
      if (match) {
        const group = match[1];
        const text = match[2].trim();
        const num = opt.content.includes('①') ? 1 : opt.content.includes('②') ? 2 : opt.content.includes('③') ? 3 : 4;
        if (!groups[group]) groups[group] = [];
        groups[group].push({ optId: opt.id, num, text });
      }
    }

    // update options
    for (const [group, choices] of Object.entries(groups)) {
      const structuredData = JSON.stringify({
        title: group,
        choices: choices.map(c => ({ num: c.num, text: c.text }))
      });
      
      // Update each option in the group to have the same structuredData
      for (const choice of choices) {
        await prisma.option.update({
          where: { id: choice.optId },
          data: { structuredData }
        });
      }
    }
    
    // update question format
    await prisma.question.update({
      where: { id },
      data: { format: 'MULTI_GROUP' }
    });
    
    console.log('Updated Question ' + id);
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
