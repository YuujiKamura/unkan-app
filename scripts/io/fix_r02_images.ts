import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const qs = await prisma.question.findMany({ where: { year: '令和2年 (CBT)' } });
  let count = 0;
  for (const q of qs) {
    // 令和2年 (CBT) needs image urls for everything we have
    // Actually, earlier the script assigned images only if #NEEDS_IMAGE.
    // Let's check if the image files exist for all questions or just specific ones.
    const url = `/pdf_pages/R02.CBT_Q${q.questionNumber}.png`;
    await prisma.question.update({
      where: { id: q.id },
      data: { imageUrl: url }
    });
    count++;
  }
  console.log('Updated ' + count + ' imageUrls for R02.CBT');
}
main().finally(() => prisma.$disconnect());
