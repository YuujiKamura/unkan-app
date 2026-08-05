import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
  const qs = await prisma.question.findMany({
    where: {
      year: '令和4年 (CBT)'
    }
  });

  console.log(`Found ${qs.length} questions for R04.`);

  let updatedCount = 0;
  for (const q of qs) {
    if (q.knowledgeTags?.includes('#NEEDS_IMAGE') || 
        q.content?.includes('下の図') || 
        q.content?.includes('標識') ||
        q.content?.includes('下の表')) {
      
      const newTags = q.knowledgeTags?.includes('#NEEDS_IMAGE') 
        ? q.knowledgeTags 
        : (q.knowledgeTags ? q.knowledgeTags + ',#NEEDS_IMAGE' : '#NEEDS_IMAGE');

      await prisma.question.update({
        where: { id: q.id },
        data: { 
          imageUrl: 'https://www.unkan-net.com/kakomon/R04.CBT.pdf',
          knowledgeTags: newTags
        }
      });
      console.log(`Updated Q${q.questionNumber} with R04 PDF link`);
      updatedCount++;
    }
  }
  
  console.log(`Updated ${updatedCount} questions for R04.`);

  // public/data/questions.jsonを再出力
  const allQs = await prisma.question.findMany({
    orderBy: [{ year: 'desc' }, { questionNumber: 'asc' }],
    include: { 
      options: { orderBy: { optionNumber: 'asc' } },
      explanation: true
    }
  });
  fs.writeFileSync(path.join(__dirname, 'public/data/questions.json'), JSON.stringify(allQs, null, 2));
  console.log('Exported questions.json');
}

main().catch(console.error).finally(() => prisma.$disconnect());
