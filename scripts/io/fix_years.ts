import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

async function main() {
  const qs = await prisma.question.findMany({
    where: {
      year: { in: ['不明', '模擬問題', '模擬問題(1)'] }
    }
  });
  console.log(`Found ${qs.length} questions to fix.`);
  
  for (const q of qs) {
    let newYear = '';
    if (q.year === '模擬問題') {
      newYear = '令和5年 (CBT)';
    } else if (q.year === '模擬問題(1)') {
      newYear = '令和6年 (CBT)';
    } else if (q.year === '不明') {
      newYear = '令和3年 (CBT)'; // 仮
    }
    
    if (newYear) {
      await prisma.question.update({
        where: { id: q.id },
        data: { year: newYear }
      });
      console.log(`Updated qId ${q.id} year: ${q.year} -> ${newYear}`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
