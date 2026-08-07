import fs from 'fs';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const JSON_PATH = 'public/data/questions.json';
async function main() {
  const data = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
  let updatedCount = 0;
  for (const q of data) {
    if (q.id) {
      await prisma.question.update({
        where: { id: q.id },
        data: {
          situationCategory: q.situationCategory || null,
          knowledgeTags: q.knowledgeTags || null
        }
      });
      updatedCount++;
    }
  }
  console.log('Successfully updated ' + updatedCount + ' questions in DB');
}
main().catch(console.error).finally(() => prisma.$disconnect());
