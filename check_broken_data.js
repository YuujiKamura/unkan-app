const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const allQs = await prisma.question.findMany({ include: { options: true } });
  
  const missingOptions = [];
  const mixedOptions = [];
  const noCorrectAnswers = [];
  
  for (const q of allQs) {
    // 選択肢が4つ未満 (MULTIPLE系のチェックはややこしいのでSINGLE限定で3つ以下のもの)
    if (q.format === 'SINGLE' && q.options.length > 0 && q.options.length < 4) {
      missingOptions.push(q);
    }
    
    // SINGLE形式の選択肢テキストの中に丸数字が含まれている（構造化失敗の疑い）
    if (q.format === 'SINGLE') {
      const hasCircleNum = q.options.some(o => /①|②|③|④|⑤/.test(o.content || ''));
      if (hasCircleNum) mixedOptions.push(q);
    }
    
    // SINGLE形式で、正解フラグ(isCorrect=true)が1つもないもの
    if (q.format === 'SINGLE') {
      const correctCount = q.options.filter(o => o.isCorrect).length;
      if (correctCount === 0) {
        noCorrectAnswers.push(q);
      }
    }
  }
  
  console.log(`Missing options (SINGLE < 4): ${missingOptions.length}`);
  for(const q of missingOptions) console.log(` - Q${q.id} [${q.year} 問${q.questionNumber}] (${q.options.length} options)`);
  
  console.log(`Mixed options (Contains ①②... in SINGLE): ${mixedOptions.length}`);
  for(const q of mixedOptions) console.log(` - Q${q.id} [${q.year} 問${q.questionNumber}]`);
  
  console.log(`No correct answers in SINGLE: ${noCorrectAnswers.length}`);
  for(const q of noCorrectAnswers) console.log(` - Q${q.id} [${q.year} 問${q.questionNumber}]`);
  
}
main().finally(() => prisma.$disconnect());
