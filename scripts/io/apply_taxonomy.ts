import fs from 'fs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const JSON_PATH = 'public/data/questions.json';

async function main() {
  const data = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
  let updatedCount = 0;

  for (const q of data) {
    const num = q.questionNumber;
    const text = q.content || "";
    
    // 1. Field Mapping
    let field = null;
    if (num >= 1 && num <= 8) field = '貨物自動車運送事業法';
    else if (num >= 9 && num <= 12) field = '道路運送車両法';
    else if (num >= 13 && num <= 17) field = '道路交通法';
    else if (num >= 18 && num <= 23) field = '労働基準法';
    else if (num >= 24 && num <= 30) field = '実務上の知識及び能力';
    
    q.field = field;
    q.majorField = null;
    q.subField = null;

    // 2. situationCategory Mapping
    const situations: string[] = [];
    if (text.includes('標識') || text.includes('標示')) situations.push('#標識・マーク');
    if (text.includes('運行記録計') || text.includes('タコグラフ')) situations.push('#乗務記録・タコグラフ');
    if ((text.includes('下表') || text.includes('下図') || text.includes('ダイヤ') || text.includes('運行計画')) && !situations.includes('#標識・マーク')) situations.push('#表・グラフ');
    
    if (text.match(/時間.*?計算/)|| text.match(/計算.*?時間/)|| text.includes('平均し') || text.includes('平均して') || (text.includes('何時間') && text.includes('拘束時間'))) situations.push('#時間計算(改善基準等)');
    if ((text.includes('制動距離') || text.includes('停止距離') || text.includes('空走距離')) && (text.includes('計算') || text.includes('何メートル'))) situations.push('#距離・速度計算');
    
    if (text.includes('事故') && (text.includes('措置') || text.includes('対応') || text.includes('報告'))) situations.push('#事故対応事例');
    if (text.includes('雪') || text.includes('雨') || text.includes('風') || text.includes('霧') || text.includes('悪天候')) situations.push('#悪天候・異常気象');
    if (text.includes('いくつあるか')) situations.push('#個数問題');

    q.situationCategory = situations.length > 0 ? situations.join(',') : null;

    // 3. knowledgeTags Mapping
    const tags: string[] = [];
    
    // 事業法
    if (field === '貨物自動車運送事業法' && (text.includes('許可') || text.includes('認可') || text.includes('届出'))) tags.push('#許可・届出ルール');
    if (text.includes('点呼')) tags.push('#点呼・乗務制限(管理者義務)');
    if (field === '貨物自動車運送事業法' && (text.includes('過労') || text.includes('休憩施設'))) tags.push('#点呼・乗務制限(管理者義務)'); // Overlap with overwork management
    if (field === '貨物自動車運送事業法' && text.includes('過積載')) tags.push('#過積載防止(管理者義務)');
    if (text.includes('選任') && text.includes('運行管理者')) tags.push('#運行管理者の要件・選任');

    // 車両法
    if (text.includes('保安基準')) tags.push('#保安基準(寸法・重量・灯火)');
    if (text.includes('日常点検') || text.includes('定期点検')) tags.push('#日常点検・定期点検');
    if (text.includes('登録') || text.includes('車検') || text.includes('検査')) tags.push('#自動車の登録・車検');

    // 道交法
    if (field === '道路交通法' && (text.includes('過労') || text.includes('酒気') || text.includes('過積載'))) tags.push('#過労・酒気・過積載(禁止行為)');
    if (text.includes('最高速度') || text.includes('法定速度')) tags.push('#法定速度');
    if (text.includes('追越し') || text.includes('交差点')) tags.push('#追い越し・交差点');
    if (text.includes('駐車') || text.includes('停車')) tags.push('#駐停車禁止ルール');
    if (text.includes('免許') || text.includes('点数')) tags.push('#免許・点数制度');

    // 労基法・改善基準
    if (text.includes('改善のための基準') || text.includes('拘束時間') || text.includes('休息期間') || text.includes('連続運転') || text.includes('運転時間')) tags.push('#改善基準(拘束・休息)');
    if (text.includes('就業規則') || text.includes('賃金')) tags.push('#就業規則・賃金');
    if (text.includes('労働契約') || text.includes('休日')) tags.push('#労働契約・休日');

    // 実務
    if (text.includes('要因分析') || text.includes('再発防止') || text.includes('危険予知')) tags.push('#交通事故の要因・防止策');
    if (text.includes('フェード現象') || text.includes('ベーパー・ロック') || text.includes('スタンディング・ウェーブ') || text.includes('ABS') || text.includes('ハイドロプレーニング') || text.includes('アンチロック')) tags.push('#自動車の構造・特性');
    if (text.includes('SAS') || text.includes('睡眠時無呼吸') || text.includes('疾病') || text.includes('健康診断')) tags.push('#健康管理・疾病');

    q.knowledgeTags = tags.length > 0 ? tags.join(',') : null;
    
    // DB Update
    if (q.id) {
      await prisma.question.update({
        where: { id: q.id },
        data: {
          field: q.field,
          majorField: q.majorField,
          subField: q.subField,
          situationCategory: q.situationCategory,
          knowledgeTags: q.knowledgeTags
        }
      });
      updatedCount++;
    }
  }

  // Write back to JSON
  fs.writeFileSync(JSON_PATH, JSON.stringify(data, null, 2));
  console.log(`Successfully updated ${updatedCount} questions in DB and ${JSON_PATH}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
