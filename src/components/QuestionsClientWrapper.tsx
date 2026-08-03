'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import HistoryCalendar from '@/components/HistoryCalendar';
import QuestionsListContent from '@/components/QuestionsListContent';
import SubFieldChart from '@/components/SubFieldChart';
import { sortQuestionsBySimilarityChain } from '@/lib/similarity';

export default function QuestionsClientWrapper({
  initialQuestions,
  attemptsByDate
}: {
  initialQuestions: any[];
  attemptsByDate: Record<string, { total: number, correct: number }>;
}) {
  const searchParams = useSearchParams();
  const groupByParam = searchParams.get('groupBy');
  const selectedSubField = searchParams.get('subField');
  const groupBy = ['field', 'subField'].includes(groupByParam || '') ? groupByParam : 'year';

  let mappedQuestions = [...initialQuestions];

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
  const fields = Array.from(new Set(mappedQuestions.map(q => q.majorField || '分野不明').filter(Boolean)));
  const subFields = Array.from(new Set(mappedQuestions.map(q => q.subField || '小分類不明').filter(Boolean)));

  const groups = groupBy === 'subField' ? subFields : (groupBy === 'field' ? fields : years);
  const subFieldStats = subFields.map(sf => {
    const qs = mappedQuestions.filter(q => (q.subField || '小分類不明') === sf);
    const total = qs.length;
    const correct = qs.filter(q => q.attempts && q.attempts[q.attempts.length - 1]?.isCorrect).length;
    
    // 未挑戦の問題を最優先、無ければ直近不正解の問題、無ければ最初の問題
    const unansweredQ = qs.find(q => !q.attempts || q.attempts.length === 0);
    const incorrectQ = !unansweredQ ? qs.find(q => q.attempts && !q.attempts[q.attempts.length - 1]?.isCorrect) : null;
    const targetQ = unansweredQ || incorrectQ || qs[0];

    const unansweredCount = qs.filter(q => !q.attempts || q.attempts.length === 0).length;

    return { 
      field: sf as string, 
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
          <Link href="/questions?groupBy=year" className={`btn ${groupBy === 'year' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '0.5rem 1.2rem', fontSize: '0.95rem', fontWeight: 'bold' }}>
            📅 年度別
          </Link>
          <Link href="/questions?groupBy=field" className={`btn ${groupBy === 'field' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '0.5rem 1.2rem', fontSize: '0.95rem', fontWeight: 'bold' }}>
            📚 大分類別 (4大分野)
          </Link>
          <Link href="/questions?groupBy=subField" className={`btn ${groupBy === 'subField' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '0.5rem 1.2rem', fontSize: '0.95rem', fontWeight: 'bold' }}>
            🏷️ テーマ別 (小分類)
          </Link>
        </div>
      </header>

      <details style={{ marginBottom: '1.5rem', background: 'var(--surface-color)', borderRadius: '12px', border: '1px solid var(--surface-border)', overflow: 'hidden' }}>
        <summary style={{ padding: '0.8rem 1rem', cursor: 'pointer', fontWeight: 'bold', color: 'var(--text-secondary)' }}>
          📊 学習到達度ダッシュボード
        </summary>
        <div style={{ padding: '1rem' }}>
          <SubFieldChart stats={subFieldStats} />
        </div>
      </details>

      <details style={{ marginBottom: '2rem', background: 'var(--surface-color)', borderRadius: '12px', border: '1px solid var(--surface-border)', overflow: 'hidden' }}>
        <summary style={{ padding: '0.8rem 1rem', cursor: 'pointer', fontWeight: 'bold', color: 'var(--text-secondary)' }}>
          📅 学習カレンダー
        </summary>
        <div style={{ padding: '0 1rem 1rem 1rem' }}>
          <HistoryCalendar attemptsByDate={attemptsByDate} />
        </div>
      </details>

      <QuestionsListContent groups={groups as string[]} mappedQuestions={mappedQuestions} groupBy={groupBy as any} />
    </div>
  );
}
