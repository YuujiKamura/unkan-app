const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const fixes = {
  288: {
    content: `【道路運送車両法関係】\n\n道路運送車両法に定める自動車の点検整備等に関する次の文中、A、B、C、Dに入るべき字句としていずれか正しいものを１つ選びなさい。\n\n1. 自動車運送事業の用に供する自動車の使用者は、点検整備記録簿を当該自動車に備え置き、道路運送車両法の規定により定期点検整備を実施したときは、遅滞なく、点検の結果、整備の概要等所定事項を記載して、その記載の日から A 間保存しなければならない。\n\n2. 自動車の使用者は、自動車の点検をし、及び必要に応じ B をすることにより、当該自動車を保安基準に適合するように維持しなければならない。\n\n3. 大型自動車使用者等は、整備管理者を選任したときは、その日から C 以内に、地方運輸局長にその旨を届け出なければならない。これを変更したときも同様である。\n\n4. 道路運送車両法第54条の2の規定による整備命令を受けた自動車の D は、当該命令を受けた日から15日以内に、地方運輸局長に対し、保安基準に適合させるために必要な整備を行った当該自動車及び当該自動車に係る自動車検査証を提示しなければならない。`,
    options: [
      { letter: 'A', c1: '1年', c2: '2年', ans: 1 },
      { letter: 'B', c1: '整備', c2: '検査', ans: 1 },
      { letter: 'C', c1: '15日', c2: '30日', ans: 1 },
      { letter: 'D', c1: '所有者', c2: '使用者', ans: 2 }
    ]
  },
  292: {
    content: `【道路交通法関係】\n\n道路交通法に定める横断歩行者等の保護のための通行方法についての次の文中、A、B、Cに入るべき字句としていずれか正しいものを１つ選びなさい。\n\n1. 車両等は、横断歩道に接近する場合には、当該横断歩道を通過する際に当該横断歩道によりその進路の前方を横断しようとする歩行者がないことが明らかな場合を除き、当該横断歩道の直前で A しなければならない。この場合において、横断歩道によりその進路の前方を横断し、又は横断しようとする歩行者があるときは、当該横断歩道の直前で B 、かつ、その通行を妨げないようにしなければならない。\n\n2. 車両等は、横断歩道（当該車両等が通過する際に信号機の表示する信号又は警察官等の手信号等により当該横断歩道による歩行者等の横断が禁止されているものを除く。）又はその手前の直前で停止している車両等がある場合において、当該停止している車両等の側方を通過してその前方に出ようとするときは、 C しなければならない。`,
    options: [
      { letter: 'A', c1: '停止することができるような速度で進行', c2: '徐行又は一時停止を', ans: 1 },
      { letter: 'B', c1: '徐行し', c2: '一時停止し', ans: 2 },
      { letter: 'C', c1: '安全な速度で進行', c2: 'その前方に出る前に一時停止', ans: 2 }
    ]
  },
  297: {
    content: `【労働基準法関係】\n\n「自動車運転者の労働時間等の改善のための基準」（以下「改善基準告示」という。）に定める貨物自動車運送事業に従事する自動車運転者（以下「トラック運転者」という。）の拘束時間等に関する次の文中、A、B、C、Dに入るべき字句としていずれか正しいものを１つ選びなさい。\n\n1. 使用者は、トラック運転者に労働基準法（以下「法」という。）第35条の休日に労働させる場合は、当該労働させる休日は2週間について A を超えないものとし、当該休日の労働によって改善基準告示第4条第1項に定める拘束時間及び B の限度を超えないものとする。\n\n2. 労使当事者は、法第36条第1項の協定（時間外労働協定（労働時間の延長に係るものに限る。））においてトラック運転者に係る一定期間についての延長時間について協定するに当たっては、当該一定期間は、 C 及び D 以内の一定の期間とするものとする。`,
    options: [
      { letter: 'A', c1: '1回', c2: '2回', ans: 1 },
      { letter: 'B', c1: '連続運転時間', c2: '最大拘束時間', ans: 2 },
      { letter: 'C', c1: '2週間', c2: '4週間', ans: 1 },
      { letter: 'D', c1: '1ヵ月以上3ヵ月', c2: '3ヵ月以上6ヵ月', ans: 1 }
    ]
  }
};

async function main() {
  for (const qid of Object.keys(fixes)) {
    const id = parseInt(qid);
    const data = fixes[id];

    await prisma.question.update({
      where: { id },
      data: {
        format: 'MULTI_GROUP',
        content: data.content
      }
    });

    await prisma.option.deleteMany({
      where: { questionId: id }
    });

    const newOptions = [];
    let currentOptNum = 1;
    for (const optDef of data.options) {
      const sd = JSON.stringify({
        title: optDef.letter,
        choices: [
          { num: 1, text: optDef.c1 },
          { num: 2, text: optDef.c2 }
        ]
      });

      newOptions.push({
        questionId: id,
        optionNumber: currentOptNum++,
        content: `${optDef.letter} : ① ${optDef.c1}`,
        isCorrect: optDef.ans === 1,
        structuredData: sd
      });
      newOptions.push({
        questionId: id,
        optionNumber: currentOptNum++,
        content: `${optDef.letter} : ② ${optDef.c2}`,
        isCorrect: optDef.ans === 2,
        structuredData: sd
      });
    }

    await prisma.option.createMany({
      data: newOptions
    });
    console.log(`Q${id} fixed.`);
  }
}

main().finally(() => prisma.$disconnect());
