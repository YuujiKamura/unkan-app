
/**
 * 運行管理者ドメイン語抽出・類似度スコアリングエンジン
 * 
 * 【上位概念とドメイン階層の仕組み】
 * 1. ワード長によるドメイン解像度（Specificity）の重み付け
 *    - 文字数が長い複合語（例: 「造成宅地防災区域」「宅地造成工事規制区域」）ほど、
 *      特定性の高い下位ドメイン（高解像度概念）として重みを増幅 (length ^ 1.2)。
 *    - 逆に短い語（例: 「代理」「登記」）は一般的な大枠概念として相対的に軽く扱う。
 * 2. 包含関係（Subsumption）の自動集約
 *    - 「造成宅地防災区域」と「宅地造成」が同時に含まれる場合、より具体的な長文概念へ重みを吸収。
 * 3. 動的複合名詞の抽出（辞書非依存フォールバック）
 *    - 辞書未登録の専門用語でも、漢字・カタカナの連続（3文字以上）を動的に抽出。
 */

// 辞書語句
export const TAKKEN_TERMS = [
  '抵当権', '地上権', '損害賠償', '債務不履行', '連帯保証', '時効取得', '法定地上権', 
  '代理', '無権代理', '表見代理', '瑕疵担保', '契約不適合', '相殺', '解除', '取消し', '転貸', 
  '対抗要件', '登記', '善意', '悪意', '過失', '無過失', '不法行為', '連帯債務', '保証',
  '根抵当権', '留置権', '先取特権', '質権', '共有', '分割', '遺産分割', '遺留分', '相続',
  '重要事項説明', 'クーリング・オフ', '35条書面', '37条書面', '媒介契約', '専任媒介', '専属専任',
  '手付金', '手付解除', '保全措置', '報酬限度額', '免許', '主任者', '運行管理者', '取引士',
  '営業保証金', '保証協会', '自ら売主', '８種制限', '誇大広告', '帳簿', '従業者名簿',
  '農地法', '国土利用計画法', '開発許可', '建築確認', '用途地域', '建蔽率', '容積率', 
  '防火地域', '準防火地域', '斜線制限', '日影規制', 'セットバック', '地区計画',
  '土地区画整理', '換地', '仮換地', '清算金', '宅地造成', '宅造法', '宅地造成等規制法', '宅地造成及び特定盛土等規制法', '盛土規制法', '造成宅地防災区域', '宅地造成工事規制区域', '宅地造成等工事規制区域', '特定盛土等規制区域',
  '印紙税', '登録免許税', '不動産取得税', '固定資産税', '贈与税', '住宅ローン控除',
  '借地借家法', '借地権', '借家権', '定期借地', '定期借家', '造作買取', '建物買取',
  '区分所有法', '集会', '規約', '共用部分', '専有部分', '管理者', '不動産登記法', '表題部', '権利部',
  '地価公示', '鑑定評価', '住宅金融支援機構'
];

/**
 * テキストから動的に複合名詞（3文字以上の漢字・カタカナ語）を抽出
 */
export function extractDynamicNounChunks(text: string): string[] {
  if (!text) return [];
  // 3文字以上の連続する漢字、または4文字以上のカタカナ
  const kanjiRegex = /[\u4e00-\u9faf]{3,}/g;
  const katakanaRegex = /[\u30a0-\u30ff]{4,}/g;
  
  const matches = [...(text.match(kanjiRegex) || []), ...(text.match(katakanaRegex) || [])];
  // 一般的な定型句を除外
  const stopWords = new Set(['正しいものはどれか', '誤っているものはどれか', '次の記述のうち', '民法の規定', '判例によれば', '成立した', '締結した']);
  return matches.filter(m => !stopWords.has(m));
}

/**
 * ドメイン概念の抽出と包含関係の整理
 */
export function getTakkenConcepts(text: string): Set<string> {
  const matchedSet = new Set<string>();
  if (!text) return matchedSet;

  // 1. 辞書マッチング
  TAKKEN_TERMS.forEach(term => {
    if (text.includes(term)) matchedSet.add(term);
  });

  // 2. 動的名詞句の追加（未登録用語のカバー）
  const dynamicChunks = extractDynamicNounChunks(text);
  dynamicChunks.forEach(chunk => matchedSet.add(chunk));

  // 3. 包含関係（Subsumption）のフィルタリング：
  // 長い語句に含まれる短文語句（例：「造成宅地防災区域」に含まれる「宅地造成」）は、
  // 長文側の特異性を重視して単体の重複候補から除外・包含処理
  const rawList = Array.from(matchedSet);
  const filteredSet = new Set<string>();

  rawList.forEach(term => {
    // 自分より長く、自分を包含する別の単語が同テキスト内に存在するか確認
    const isSubsumed = rawList.some(other => other !== term && other.length > term.length && other.includes(term));
    if (!isSubsumed) {
      filteredSet.add(term);
    } else {
      // 包含されている短い語でも、重要な基幹用語（例：農地法、宅造法など）は残す
      if (term.length >= 4) {
        filteredSet.add(term);
      }
    }
  });

  return filteredSet;
}

export function getCombinedText(q: any): string {
  let text = q.content || '';
  if (q.options && Array.isArray(q.options)) {
    text += ' ' + q.options.map((o: any) => o.content).join(' ');
  }
  return text;
}

export function extractTags(q: any): string[] {
  const text = getCombinedText(q);
  const concepts = Array.from(getTakkenConcepts(text));
  const tags = [...concepts];
  if (q.field) tags.push(`field:${q.field}`);
  if (q.situationCategory) q.situationCategory.split(',').forEach((t: string) => tags.push(`situation:${t}`));
  if (q.knowledgeTags) q.knowledgeTags.split(',').forEach((t: string) => tags.push(`knowledge:${t}`));
  return tags;
}

/**
 * ワード長（ドメイン解像度）を反映させた重み付き類似度スコアリング
 */
export function scoreSimilarities(baseQ: any, allOtherQs: any[]) {
  const baseTags = extractTags(baseQ);
  
  const docs = allOtherQs.map(q => {
    const tags = extractTags(q);
    return { q, tags };
  });
  docs.push({ q: baseQ, tags: baseTags });

  // 1. DF (Document Frequency) の集計
  const df = new Map<string, number>();
  docs.forEach(doc => {
    const uniqueTags = new Set(doc.tags);
    uniqueTags.forEach(t => df.set(t, (df.get(t) || 0) + 1));
  });

  const N = docs.length;
  // 2. TF-IDF + ワード長（解像度）による動的ウェイトの計算
  const tagWeights = new Map<string, number>();
  df.forEach((count, term) => {
    const idf = Math.log((N + 1) / (count + 1)) + 1;
    // ワード長補正: 文字数が長い単語（例: 造成宅地防災区域 = 7文字）ほど
    // 特定性の高い専門ドメインとして指数関数的に高い重みを与える
    const cleanTerm = term.replace(/^field:/, '').replace(/^subfield:/, '');
    const lengthFactor = Math.pow(Math.max(1, cleanTerm.length), 1.2); 
    
    tagWeights.set(term, idf * lengthFactor);
  });

  const getVector = (tags: string[]) => {
    const vec = new Map<string, number>();
    const unique = new Set(tags);
    unique.forEach(t => vec.set(t, tagWeights.get(t) || 0));
    return vec;
  };

  const baseVec = getVector(baseTags);
  let baseNorm = 0;
  baseVec.forEach(val => baseNorm += val * val);
  baseNorm = Math.sqrt(baseNorm);

  return allOtherQs.map(q => {
    const doc = docs.find(d => d.q.id === q.id)!;
    const vec = getVector(doc.tags);
    
    let norm = 0;
    let dotProduct = 0;
    vec.forEach((val, term) => {
      norm += val * val;
      if (baseVec.has(term)) {
        dotProduct += val * baseVec.get(term)!;
      }
    });
    norm = Math.sqrt(norm);
    
    const similarityScore = (baseNorm > 0 && norm > 0) ? dotProduct / (baseNorm * norm) : 0;
    
    // 共有タグの抽出（文字長が長い解像度の高い専門語順にソート）
    const sharedTags = doc.tags.filter(t => baseTags.includes(t));
    const uniqueShared = Array.from(new Set(sharedTags))
      .sort((a, b) => b.length - a.length)
      .map(t => {
        if (t.startsWith('field:')) return `分野: ${t.replace('field:', '')}`;
        if (t.startsWith('subfield:')) return `項目: ${t.replace('subfield:', '')}`;
        return t;
      });

    return { ...q, similarityScore, sharedKeywords: uniqueShared };
  });
}

// 配列を類似度で連鎖的にソートする（Nearest Neighbor TSP風）
export function sortQuestionsBySimilarityChain(questions: any[]) {
  if (questions.length <= 1) return questions;
  
  const sorted = [];
  let remaining = [...questions];
  
  // 最初の1問目は、一番年度が新しい問題を選ぶ（例えばリストの先頭）
  let current = remaining.shift()!;
  sorted.push(current);
  
  while (remaining.length > 0) {
    // 現在の問題に対する残りの問題の類似度を計算
    const scored = scoreSimilarities(current, remaining);
    
    // 類似度が最も高い問題を選ぶ
    scored.sort((a, b) => b.similarityScore - a.similarityScore);
    const bestNext = scored[0];
    
    // nextをsortedに追加し、remainingから削除
    // 注：similarityScoreなどのプロパティを消して元のオブジェクトに戻す
    const nextQ = remaining.find(q => q.id === bestNext.id)!;
    sorted.push(nextQ);
    remaining = remaining.filter(q => q.id !== bestNext.id);
    current = nextQ;
  }
  
  return sorted;
}
