import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
  // Find R05 questions
  const qs = await prisma.question.findMany({
    where: {
      year: {
        contains: '令和5'
      }
    }
  });

  console.log(`Found ${qs.length} questions for R05.`);

  let updatedCount = 0;
  for (const q of qs) {
    if (q.knowledgeTags && q.knowledgeTags.includes('#NEEDS_IMAGE')) {
      await prisma.question.update({
        where: { id: q.id },
        data: { imageUrl: 'https://www.unkan-net.com/kakomon/R05.CBT.pdf' }
      });
      console.log(`Updated Q${q.questionNumber} with PDF link`);
      updatedCount++;
    } else if (
      // R05において、運行計画、空欄補充、図が必須な問題番号などがハードコードされている場合
      // もし knowledgeTags が無かった時のため、問22, 23, 29, 30 のように画像必須な問題かをチェック
      q.content?.includes('下の図') || 
      q.content?.includes('標識') ||
      q.content?.includes('下の表')
    ) {
      // #NEEDS_IMAGEタグが無くても文字列的に図表必須なら追加
      await prisma.question.update({
        where: { id: q.id },
        data: { 
          imageUrl: 'https://www.unkan-net.com/kakomon/R05.CBT.pdf',
          knowledgeTags: (q.knowledgeTags ? q.knowledgeTags + ',' : '') + '#NEEDS_IMAGE'
        }
      });
      console.log(`Updated Q${q.questionNumber} (auto-detected) with PDF link`);
      updatedCount++;
    }
  }
  
  console.log(`Updated ${updatedCount} questions.`);

  console.log('Exporting all to public/data/questions.json...');
  const allQs = await prisma.question.findMany({
    orderBy: [{ year: 'desc' }, { questionNumber: 'asc' }],
    include: { options: { orderBy: { optionNumber: 'asc' } } }
  });
  fs.writeFileSync(path.join(__dirname, '../../public/data/questions.json'), JSON.stringify(allQs, null, 2));
  console.log('Done.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
