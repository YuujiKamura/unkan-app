import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

const parseMultiOptions = (content: string) => {
  if (!content) return null;
  const match = content.match(/^(.+?)[：:]\s*(.*)$/);
  if (!match) return null;
  const title = match[1].trim();
  const rest = match[2];
  const regex = /(?:[①②③④]|[1234][.:：])/;
  const parts = rest.split(regex).map(s => s.trim()).filter(s => s.length > 0);
  if (parts.length >= 2) {
    return { title, choices: parts.map((text, i) => ({ num: i + 1, text })) };
  }
  return null;
};

async function main() {
  const questions = await prisma.question.findMany({
    include: { options: true }
  });

  let updateCount = 0;

  for (const q of questions) {
    if (!q.options || q.options.length < 2) continue;
    
    // Parse each option
    const parsedOpts = q.options.map(o => ({
      optId: o.id,
      parsed: parseMultiOptions(o.content || '')
    }));

    // If every option is successfully parsed into parts >= 2
    if (parsedOpts.every(p => p.parsed !== null)) {
      // It's a MULTI_GROUP question
      await prisma.question.update({
        where: { id: q.id },
        data: { format: 'MULTI_GROUP' }
      });

      // Update options with structuredData
      for (const p of parsedOpts) {
        await prisma.option.update({
          where: { id: p.optId },
          data: {
            structuredData: JSON.stringify(p.parsed)
          }
        });
      }
      console.log(`Updated Question ID: ${q.id} to MULTI_GROUP`);
      updateCount++;
    }
  }

  console.log(`Total updated: ${updateCount}`);
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
