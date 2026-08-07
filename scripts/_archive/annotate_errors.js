const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const allQs = await prisma.question.findMany({ include: { options: true } });
  
  let updatedCount = 0;
  
  for (const q of allQs) {
    const newTags = new Set(q.knowledgeTags ? q.knowledgeTags.split(',').map(s => s.trim()).filter(Boolean) : []);
    let needsUpdate = false;
    
    // 選択肢が4つ未満 (SINGLE形式)
    if (q.format === 'SINGLE' && q.options.length > 0 && q.options.length < 4) {
      newTags.add('#ERR_MISSING_OPT');
      needsUpdate = true;
    }
    
    // SINGLE形式の選択肢テキストの中に丸数字が含まれている
    if (q.format === 'SINGLE') {
      const hasCircleNum = q.options.some(o => /①|②|③|④|⑤/.test(o.content || ''));
      if (hasCircleNum) {
        newTags.add('#ERR_MIXED_OPT');
        needsUpdate = true;
      }
    }
    
    // SINGLE形式で、正解フラグ(isCorrect=true)が1つもない
    if (q.format === 'SINGLE' && q.options.length > 0) {
      const correctCount = q.options.filter(o => o.isCorrect).length;
      if (correctCount === 0) {
        newTags.add('#ERR_NO_CORRECT');
        needsUpdate = true;
      }
    }
    
    // 標識や図表への言及がある
    if (q.content && (
        q.content.includes('標識') || 
        q.content.includes('下図') || 
        q.content.includes('下の図') || 
        q.content.includes('次の図') || 
        q.content.includes('次表') || 
        q.content.includes('次の表')
       )) {
      newTags.add('#NEEDS_IMAGE');
      needsUpdate = true;
    }
    
    if (needsUpdate) {
      const updatedTagsStr = Array.from(newTags).join(',');
      await prisma.question.update({
        where: { id: q.id },
        data: { knowledgeTags: updatedTagsStr }
      });
      updatedCount++;
    }
  }
  
  console.log(`Successfully annotated ${updatedCount} questions in the database.`);
}
main().finally(() => prisma.$disconnect());
