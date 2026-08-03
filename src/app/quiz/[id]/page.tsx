import { PrismaClient } from '@prisma/client';
import Link from 'next/link';
import SingleQuizClient from '@/components/SingleQuizClient';
import { extractTags, scoreSimilarities } from '@/lib/similarity';

const prisma = new PrismaClient();

import fs from 'fs';
import path from 'path';

export async function generateStaticParams() {
  try {
    const questions = await prisma.question.findMany({
      select: { id: true },
    });
    if (questions && questions.length > 0) {
      return questions.map((q) => ({ id: q.id.toString() }));
    }
  } catch (e) {
    console.warn("DB not found in build environment, falling back to public/questions.json");
  }

  try {
    const jsonPath = path.join(process.cwd(), 'public', 'data', 'questions.json');
    if (fs.existsSync(jsonPath)) {
      const raw = fs.readFileSync(jsonPath, 'utf-8');
      const questions: any[] = JSON.parse(raw);
      return questions.map((q) => ({ id: q.id.toString() }));
    }
  } catch (e) {
    console.error("Failed fallback read of questions.json", e);
  }

  return [];
}

const getYearNum = (yearStr: string | null) => {
  if (!yearStr) return 0;
  let base = 0;
  let yearVal = 0;
  
  if (yearStr.startsWith('令和')) {
    base = 2018;
    const m = yearStr.match(/令和(\d+)年/);
    yearVal = m ? parseInt(m[1], 10) : 1;
  } else if (yearStr.startsWith('平成')) {
    base = 1988;
    const m = yearStr.match(/平成(\d+)年/);
    yearVal = m ? parseInt(m[1], 10) : 1;
  }
  
  let total = base + yearVal;
  if (yearStr.includes('12月')) total += 0.2;
  else if (yearStr.includes('10月')) total += 0.1;

  return total;
};

export default async function SingleQuizPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ groupBy?: string; subField?: string; majorField?: string; year?: string; mode?: string }>;
}) {
  const resolvedParams = await params;
  let sParams: { groupBy?: string; subField?: string; majorField?: string; year?: string; mode?: string } = {};
  try {
    if (searchParams) {
      sParams = (await searchParams) || {};
    }
  } catch {
    sParams = {};
  }
  const id = parseInt(resolvedParams.id, 10);
  
  if (isNaN(id)) {
    return (
      <div className="container" style={{ textAlign: 'center', marginTop: '20vh' }}>
        <h3>無効な問題IDです。</h3>
        <Link href="/questions" className="btn btn-primary" style={{ marginTop: '1rem' }}>一覧に戻る</Link>
      </div>
    );
  }

  const isSpaMode = process.env.NEXT_PUBLIC_APP_MODE === 'spa' || process.env.GITHUB_ACTIONS === 'true';
  let questionRaw: any = null;

  if (!isSpaMode) {
    try {
      questionRaw = await prisma.question.findUnique({
        where: { id },
        include: { 
          options: true, 
          explanation: true, 
          userMeta: true,
          attempts: {
            orderBy: { attemptedAt: 'desc' },
            take: 10
          }
        }
      });
    } catch (e) {}
  }

  if (!questionRaw) {
    try {
      const jsonPath = path.join(process.cwd(), 'public', 'data', 'questions.json');
      if (fs.existsSync(jsonPath)) {
        const raw = fs.readFileSync(jsonPath, 'utf-8');
        const questions: any[] = JSON.parse(raw);
        const qFound = questions.find(q => q.id === id);
        if (qFound) {
          questionRaw = {
            ...qFound,
            options: qFound.options || [],
            explanation: qFound.explanation ? { content: qFound.explanation, isDebated: qFound.isDebated || false } : null,
            userMeta: null,
            attempts: []
          };
        }
      }
    } catch (e) {}
  }

  if (!questionRaw) {
    return (
      <div className="container" style={{ textAlign: 'center', marginTop: '20vh' }}>
        <h3>問題が見つかりません。</h3>
        <Link href="/questions" className="btn btn-primary" style={{ marginTop: '1rem' }}>一覧に戻る</Link>
      </div>
    );
  }

  const baseTags = extractTags(questionRaw);
  const question = {
    ...questionRaw,
    explanation: questionRaw.explanation?.content || null,
    isDebated: questionRaw.explanation?.isDebated || false,
    isBookmarked: questionRaw.userMeta?.isBookmarked || false,
    keywords: baseTags.filter(t => !t.startsWith('field:') && !t.startsWith('subfield:')) 
  };

  // 類似問題の抽出
  let allOtherQuestionsRaw: any[] = [];
  try {
    allOtherQuestionsRaw = await prisma.question.findMany({
      where: { 
        id: { not: id },
        content: { not: null }
      },
      include: { options: true, explanation: true }
    });
  } catch (e) {
    try {
      const jsonPath = path.join(process.cwd(), 'public', 'data', 'questions.json');
      if (fs.existsSync(jsonPath)) {
        const raw = fs.readFileSync(jsonPath, 'utf-8');
        const questions: any[] = JSON.parse(raw);
        allOtherQuestionsRaw = questions.filter(q => q.id !== id);
      }
    } catch {}
  }

  const allOtherQuestions = allOtherQuestionsRaw.map(q => ({
    ...q,
    isDebated: q.explanation?.isDebated || false
  }));

  const scored = scoreSimilarities(questionRaw, allOtherQuestions);
  scored.sort((a, b) => b.similarityScore - a.similarityScore);
  const filtered = scored.filter(q => q.similarityScore > 0.05).slice(0, 10);

  const similarQuestions = filtered.map(q => ({
    id: q.id,
    year: q.year,
    questionNumber: q.questionNumber,
    isDebated: q.isDebated,
    score: Math.round(q.similarityScore * 100),
    field: `${q.majorField || '不明'} - ${q.subField || '未分類'}`,
    sharedKeywords: q.sharedKeywords.slice(0, 8)
  }));

  // クエリパラメータの安全な取得とデコード
  const groupBy = sParams.groupBy || (sParams.subField ? 'subField' : sParams.majorField ? 'field' : sParams.year ? 'year' : 'year');
  const subField = sParams.subField ? decodeURIComponent(sParams.subField) : (groupBy === 'subField' ? (questionRaw.subField || '小分類不明') : null);
  const majorField = sParams.majorField ? decodeURIComponent(sParams.majorField) : (groupBy === 'field' ? (questionRaw.majorField || '分野不明') : null);
  const year = sParams.year ? decodeURIComponent(sParams.year) : (groupBy === 'year' ? questionRaw.year : null);

  let whereClause: any = {
    year: { notIn: ['平成26年', '平成27年', '平成28年', '平成29年', '平成30年'] }
  };
  let contextModeLabel = '';
  let groupTitle = '';

  if (groupBy === 'subField' && subField) {
    whereClause.subField = subField;
    contextModeLabel = '🏷️ テーマ別演習';
    groupTitle = subField;
  } else if (groupBy === 'field' && majorField) {
    whereClause.majorField = majorField;
    contextModeLabel = '📚 大分類別演習';
    groupTitle = majorField;
  } else {
    const targetYear = year || questionRaw.year;
    if (targetYear) {
      whereClause.year = targetYear;
      contextModeLabel = '📅 年度別演習';
      groupTitle = targetYear;
    } else {
      contextModeLabel = '全問題演習';
      groupTitle = '全体';
    }
  }

  // 一覧画面と完全同一条件で同グループ内問題一覧を取得
  let groupQuestions: any[] = [];
  try {
    groupQuestions = await prisma.question.findMany({
      where: whereClause,
      select: { 
        id: true,
        year: true,
        questionNumber: true,
        attempts: {
          orderBy: { attemptedAt: 'desc' },
          take: 1,
          select: { isCorrect: true }
        }
      }
    });
  } catch (e) {
    try {
      const jsonPath = path.join(process.cwd(), 'public', 'data', 'questions.json');
      if (fs.existsSync(jsonPath)) {
        const raw = fs.readFileSync(jsonPath, 'utf-8');
        const questions: any[] = JSON.parse(raw);
        groupQuestions = questions.filter(q => {
          if (whereClause.subField && q.subField !== whereClause.subField) return false;
          if (whereClause.majorField && q.majorField !== whereClause.majorField) return false;
          if (whereClause.year && q.year !== whereClause.year) return false;
          return true;
        }).map(q => ({
          id: q.id,
          year: q.year,
          questionNumber: q.questionNumber,
          attempts: []
        }));
      }
    } catch {}
  }

  // 一覧画面と完全同一のソート順 (年度降順 → 問題番号昇順)
  groupQuestions.sort((a, b) => {
    const ya = getYearNum(a.year);
    const yb = getYearNum(b.year);
    if (ya !== yb) return yb - ya;
    return (a.questionNumber || 0) - (b.questionNumber || 0);
  });

  let currentIndex = groupQuestions.findIndex(q => q.id === id);

  // 万が一、現在の問題が条件フィルタで除外されていた場合の一括フォールバック
  if (currentIndex === -1) {
    try {
      groupQuestions = await prisma.question.findMany({
        where: { year: questionRaw.year },
        select: { 
          id: true,
          year: true,
          questionNumber: true,
          attempts: {
            orderBy: { attemptedAt: 'desc' },
            take: 1
          }
        }
      });
      groupQuestions.sort((a, b) => {
        const ya = getYearNum(a.year);
        const yb = getYearNum(b.year);
        if (ya !== yb) return yb - ya;
        return (a.questionNumber || 0) - (b.questionNumber || 0);
      });
    } catch (e) {
      try {
        const jsonPath = path.join(process.cwd(), 'public', 'data', 'questions.json');
        if (fs.existsSync(jsonPath)) {
          const raw = fs.readFileSync(jsonPath, 'utf-8');
          const questions: any[] = JSON.parse(raw);
          groupQuestions = questions.filter(q => q.year === questionRaw.year).map(q => ({
            id: q.id,
            year: q.year,
            questionNumber: q.questionNumber,
            attempts: []
          }));
        }
      } catch (e2) {}
    }
    currentIndex = groupQuestions.findIndex(q => q.id === id);
    contextModeLabel = '📅 年度別演習';
    groupTitle = questionRaw.year || '年度';
  }

  const totalInGroup = groupQuestions.length;
  const currentPosition = currentIndex !== -1 ? currentIndex + 1 : 1;

  let nextId: number | null = null;
  let prevId: number | null = null;
  let nextIncorrectId: number | null = null;

  if (currentIndex !== -1) {
    if (currentIndex > 0) prevId = groupQuestions[currentIndex - 1].id;
    if (currentIndex < groupQuestions.length - 1) {
      nextId = groupQuestions[currentIndex + 1].id;
    } else if (groupQuestions.length > 0) {
      nextId = groupQuestions[0].id; // 最後の問題の時は最初の問題へループ
    }

    // 環状検索（現在地以降 -> 最初の問題から現在地の手前まで）
    const totalCount = groupQuestions.length;
    for (let step = 1; step < totalCount; step++) {
      const idx = (currentIndex + step) % totalCount;
      const q = groupQuestions[idx];
      const attemptCount = q.attempts ? q.attempts.length : 0;
      const latestAttempt = attemptCount > 0 ? q.attempts[0] : null;
      const isInc = latestAttempt && (latestAttempt.isCorrect === false || (latestAttempt as any).isCorrect === 0 || (latestAttempt as any).isCorrect === 'false');
      
      if (attemptCount > 0 && isInc) {
        nextIncorrectId = q.id;
        break;
      }
    }
  }

  const qParams = new URLSearchParams();
  if (groupBy) qParams.set('groupBy', groupBy);
  if (subField) qParams.set('subField', subField);
  if (majorField) qParams.set('majorField', majorField);
  const activeYear = year || questionRaw.year;
  if (activeYear && !groupBy) qParams.set('year', activeYear);
  const navQueryStr = qParams.toString() ? `?${qParams.toString()}` : '';

  const groupQuestionIds = groupQuestions.map(q => q.id);

  return (
    <SingleQuizClient 
      initialQuestion={question} 
      similarQuestions={similarQuestions} 
      nextQuestionId={nextId}
      prevQuestionId={prevId}
      nextIncorrectId={nextIncorrectId}
      contextModeLabel={contextModeLabel}
      groupTitle={groupTitle}
      currentPosition={currentPosition}
      totalInGroup={totalInGroup}
      navQueryStr={navQueryStr}
      mode={sParams.mode || ''}
      groupQuestionIds={groupQuestionIds}
    />
  );
}
