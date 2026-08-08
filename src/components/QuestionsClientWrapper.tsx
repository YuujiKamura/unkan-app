'use client';

import { useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
import HistoryCalendar from '@/components/HistoryCalendar';
import QuestionsListContent from '@/components/QuestionsListContent';
import SubFieldChart from '@/components/SubFieldChart';
import { sortQuestionsBySimilarityChain } from '@/lib/similarity';
import { apiClient } from '@/lib/apiClient';
import { computeAttemptsByDate, DayStat } from '@/lib/attemptStats';

export default function QuestionsClientWrapper({
  initialQuestions,
  attemptsByDate: initialAttemptsByDate
}: {
  initialQuestions: any[];
  attemptsByDate: Record<string, DayStat>;
}) {
  const searchParams = useSearchParams();
  const groupByParam = searchParams.get('groupBy');
  const selectedField = searchParams.get('field');
  const groupBy = ['field', 'knowledge', 'situation'].includes(groupByParam || '') ? groupByParam : 'year';

  const [questionsState, setQuestionsState] = useState(initialQuestions);
  const [attemptsByDate, setAttemptsByDate] = useState(initialAttemptsByDate);

  // SPA(Pages)版: サーバー側では常に空データで静的生成されているため、
  // クライアント側でLocalStorageの実データ(セーブ/ロードで復元したものを含む)をマージする
  useEffect(() => {
    const isSpaMode = process.env.NEXT_PUBLIC_APP_MODE === 'spa' || window.location.hostname.includes('github.io');
    if (!isSpaMode) return;

    const local = apiClient.getLocalUserData();

    const attemptsByQuestion = new Map<number, typeof local.attempts>();
    for (const a of local.attempts) {
      const list = attemptsByQuestion.get(a.questionId) || [];
      list.push(a);
      attemptsByQuestion.set(a.questionId, list);
    }

    const merged = initialQuestions.map((q) => {
      const qAttempts = (attemptsByQuestion.get(q.id) || [])
        .slice()
        .sort((a, b) => new Date(a.attemptedAt).getTime() - new Date(b.attemptedAt).getTime());
      const explanationContent = local.explanations[q.id];

      return {
        ...q,
        attempts: qAttempts,
        _count: { attempts: qAttempts.length },
        explanation: explanationContent !== undefined ? explanationContent : q.explanation,
        isDebated: local.debates[q.id] || false,
        isBookmarked: local.bookmarks[q.id] || false,
        corrections: local.corrections[q.id] || []
      };
    });
    setQuestionsState(merged);

    setAttemptsByDate(computeAttemptsByDate(local.attempts));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  let mappedQuestions = [...questionsState];

  // カスタムソート: 和暦を西暦相当に変換して降順でソート
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

  mappedQuestions.sort((a, b) => {
    const ya = getYearNum(a.year);
    const yb = getYearNum(b.year);
    if (ya !== yb) return yb - ya;
    return (a.questionNumber || 0) - (b.questionNumber || 0);
  });

  const years = Array.from(new Set(mappedQuestions.map(q => q.year).filter(Boolean)));
  const fields = Array.from(new Set(mappedQuestions.map(q => q.field || '分野不明').filter(Boolean)));
  
  // knowledgeTags のユニークなリストを取得 (カンマ区切り対応)
  const knowledgeTagSet = new Set<string>();
  mappedQuestions.forEach(q => {
    if (q.knowledgeTags) {
      q.knowledgeTags.split(',').forEach((t: string) => knowledgeTagSet.add(t.trim()));
    } else {
      knowledgeTagSet.add('テーマ未分類');
    }
  });
  const knowledgeTagsList = Array.from(knowledgeTagSet);

  // situationCategory のユニークなリストを取得
  const situationSet = new Set<string>();
  mappedQuestions.forEach(q => {
    if (q.situationCategory) {
      q.situationCategory.split(',').forEach((t: string) => situationSet.add(t.trim()));
    } else {
      situationSet.add('形式未分類');
    }
  });
  const situationList = Array.from(situationSet);

  let groups: string[];
  if (groupBy === 'knowledge') groups = knowledgeTagsList;
  else if (groupBy === 'situation') groups = situationList;
  else if (groupBy === 'field') groups = fields;
  else groups = years;

  // テーマ別（knowledgeTags）の進捗ダッシュボード用データ
  const knowledgeStats = knowledgeTagsList.map(tag => {
    const qs = mappedQuestions.filter(q => {
      if (tag === 'テーマ未分類') return !q.knowledgeTags;
      return q.knowledgeTags && q.knowledgeTags.split(',').map((t: string) => t.trim()).includes(tag);
    });
    const total = qs.length;
    const correct = qs.filter(q => q.attempts && q.attempts[q.attempts.length - 1]?.isCorrect).length;
    
    // 未挑戦の問題を最優先、無ければ直近不正解の問題、無ければ最初の問題
    const unansweredQ = qs.find(q => !q.attempts || q.attempts.length === 0);
    const incorrectQ = !unansweredQ ? qs.find(q => q.attempts && !q.attempts[q.attempts.length - 1]?.isCorrect) : null;
    const targetQ = unansweredQ || incorrectQ || qs[0];

    const unansweredCount = qs.filter(q => !q.attempts || q.attempts.length === 0).length;

    return { 
      field: tag as string, 
      total, 
      correct, 
      nextId: targetQ ? targetQ.id : null,
      unansweredCount
    };
  });

  return (
    <div className="container animate-fade-in-up" style={{ maxWidth: '1400px' }}>
      <header style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ffffff', padding: '0.8rem 1.2rem', borderRadius: '14px', border: '2px solid #000000', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontWeight: 'bold', color: '#000000', fontSize: '0.95rem' }}>📁 表示切替:</span>
          <a href={`${basePath}/questions?groupBy=year`} className={`btn ${groupBy === 'year' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '0.5rem 1.2rem', fontSize: '0.95rem', fontWeight: 'bold', textDecoration: 'none' }}>
            📅 年度別
          </a>
          <a href={`${basePath}/questions?groupBy=field`} className={`btn ${groupBy === 'field' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '0.5rem 1.2rem', fontSize: '0.95rem', fontWeight: 'bold', textDecoration: 'none' }}>
            📚 大分類別 (分野)
          </a>
          <a href={`${basePath}/questions?groupBy=knowledge`} className={`btn ${groupBy === 'knowledge' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '0.5rem 1.2rem', fontSize: '0.95rem', fontWeight: 'bold', textDecoration: 'none' }}>
            🏷️ テーマ別 (重要テーマタグ)
          </a>
          <a href={`${basePath}/questions?groupBy=situation`} className={`btn ${groupBy === 'situation' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '0.5rem 1.2rem', fontSize: '0.95rem', fontWeight: 'bold', textDecoration: 'none' }}>
            🔍 形式・アプローチ別
          </a>
        </div>
      </header>

      <details style={{ marginBottom: '1.5rem', background: 'var(--surface-color)', borderRadius: '12px', border: '1px solid var(--surface-border)', overflow: 'hidden' }}>
        <summary style={{ padding: '0.8rem 1rem', cursor: 'pointer', fontWeight: 'bold', color: 'var(--text-secondary)' }}>
          📊 学習到達度ダッシュボード
        </summary>
        <div style={{ padding: '1rem' }}>
          <SubFieldChart stats={knowledgeStats} groupBy="knowledge" />
        </div>
      </details>

      <details open style={{ marginBottom: '2rem', background: 'var(--surface-color)', borderRadius: '12px', border: '1px solid var(--surface-border)', overflow: 'hidden' }}>
        <summary style={{ padding: '0.8rem 1rem', cursor: 'pointer', fontWeight: 'bold', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>
          📅 学習カレンダー
          <span style={{ fontSize: '0.85rem', fontWeight: 'normal', color: 'var(--text-muted, #666)', marginLeft: '1rem' }}>※色が付いている日付を押すと、解答時刻のタイムライン履歴を見ることができます</span>
        </summary>
        <div style={{ padding: '0 1rem 1rem 1rem' }}>
          <HistoryCalendar attemptsByDate={attemptsByDate} />
        </div>
      </details>

      <QuestionsListContent groups={groups as string[]} mappedQuestions={mappedQuestions} groupBy={groupBy as any} />
    </div>
  );
}
