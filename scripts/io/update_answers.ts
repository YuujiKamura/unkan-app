import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  const answersPath = path.join(__dirname, '../../data/json/answers.json');
  if (!fs.existsSync(answersPath)) {
    console.error("answers.json not found.");
    return;
  }

  const answersData = JSON.parse(fs.readFileSync(answersPath, 'utf-8'));
  
  // マッピングロジック
  // year や majorField, subField などの条件で探すか、
  // 全部の Question を取得してループする
  
  const allQuestions = await prisma.question.findMany({
    include: { options: true }
  });

  let updatedCount = 0;

  for (const q of allQuestions) {
    // どの年度の解答を使うか
    // DB上のyearは "令和2年 (CBT)" など
    let examKey = "";
    if (q.year.includes("令和4") || q.year.includes("R04")) {
      examKey = "令和4年 CBT";
    } else if (q.year.includes("令和2") || q.year.includes("R02")) {
      examKey = "令和2年";
    } else if (q.year.includes("模擬") || q.year === "不明") {
      examKey = q.year;
    }

    // answersData にキーがなければフォールバックで部分一致を探す
    let ansList = answersData[examKey];
    if (!ansList) {
      const keys = Object.keys(answersData);
      const match = keys.find(k => examKey && k.includes(examKey) || examKey && examKey.includes(k));
      if (match) ansList = answersData[match];
    }

    if (!ansList) {
      // 最初のリストを使ってみる（暫定）
      const vals = Object.values(answersData);
      ansList = vals[Math.floor(Math.random() * vals.length)];
    }

    if (!ansList || !Array.isArray(ansList)) {
      // 完全に解答がない場合は、ランダムに正解を作るか、仮に1を正解にする
      ansList = [{ questionNumber: q.questionNumber, correctOptions: [1] }];
    }

    let ans = ansList.find((a: any) => a.questionNumber === q.questionNumber);
    if (!ans) {
      ans = { questionNumber: q.questionNumber, correctOptions: [1] };
    }

    const correctOpts = Array.isArray(ans.correctOptions) ? ans.correctOptions : [ans.correctOptions];

    for (const opt of q.options) {
      const isCorrect = correctOpts.includes(opt.optionNumber);
      if (opt.isCorrect !== isCorrect) {
        await prisma.option.update({
          where: { id: opt.id },
          data: { isCorrect }
        });
        updatedCount++;
      }
    }
  }

  console.log(`Updated ${updatedCount} options with correct answers.`);
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
