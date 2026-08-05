import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const q = await prisma.question.findFirst({
    where: { year: '令和4年 (CBT)', questionNumber: 3 }
  });
  if (!q) { console.log("Question not found"); return; }
  
  const content = `この問題は、近年の試験における典型的なひっかけ（法改正アップデートの落とし穴）です。

かつて、運転者台帳の作成・備え置きは法令上「事業者の義務」とだけ規定されていましたが、その後の法改正により、現在では「運転者等台帳を作成し、営業所に備え置くこと」が明確に『運行管理者の業務』として追加されています。

各選択肢の解説は以下の通りです。

1：×（事業者の義務）
休憩・睡眠施設の「管理」は運行管理者の業務（第20条第1項第2号）ですが、本肢のように「施設を整備し、保守すること」まで含まれると、それは事業者の義務（第11条）になります。

2：×（事業者の義務）
「運行管理規程を定める」のは事業者の義務です。運行管理者はその規程に基づき指導監督等を行います。

3：◯（運行管理者の業務）
非常信号用具や消火器の取扱い指導は、運行管理者の業務です（貨物自動車運送事業輸送安全規則 第20条第1項第12号）。

4：◯（運行管理者の業務）
運転者等台帳の作成・備え置きは、法改正によって運行管理者の業務に追加されています（貨物自動車運送事業輸送安全規則 第20条第1項第13号等 ※年次改正により号数は変動あり、現在は第13号等として規定されています）。

昔のテキストの知識や、過去問の古い解説を覚えている人ほど引っかかりやすいため、最新の法規に基づき「事業者」と「運行管理者」の義務の境界線を正確に区別しておくことが重要です。`;

  await prisma.questionExplanation.upsert({
    where: { questionId: q.id },
    update: { content: content, isDebated: true },
    create: { questionId: q.id, content: content, isDebated: true }
  });
  console.log("Explanation saved.");
}
main().catch(console.error).finally(() => prisma.$disconnect());
