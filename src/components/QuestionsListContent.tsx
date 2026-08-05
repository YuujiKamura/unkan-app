'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import EditQuestionModal from './EditQuestionModal';

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

type QuestionItem = {
  id: number;
  year: string | null;
  questionNumber: number | null;
  field: string | null;
  knowledgeTags?: string | null;
  situationCategory?: string | null;
  isDebated: boolean;
  content: string | null;
  correctAnswer?: number | null;
  explanation?: string | null;
  options?: any[];
  attempts: any[];
  _count: { attempts: number };
};

export default function QuestionsListContent({
  groups,
  mappedQuestions,
  groupBy
}: {
  groups: string[];
  mappedQuestions: QuestionItem[];
  groupBy: 'year' | 'field' | 'knowledge' | 'situation';
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryParam = searchParams.get('knowledge') || searchParams.get('situation') || searchParams.get('field') || searchParams.get('year');
  const storageKey = `takken_active_tab_${groupBy}`;

  const [activeTab, setActiveTab] = useState<string>(queryParam || groups[0] || '');
  const [selectedIteration, setSelectedIteration] = useState<number | 'latest'>('latest');
  const [isMounted, setIsMounted] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<QuestionItem | null>(null);

  useEffect(() => {
    setIsMounted(true);
    if (queryParam && groups.includes(queryParam)) {
      setActiveTab(queryParam);
      return;
    }
    const saved = sessionStorage.getItem(storageKey);
    if (saved && groups.includes(saved)) {
      setActiveTab(saved);
    }
  }, [groups, storageKey, queryParam]);

  useEffect(() => {
    if (isMounted && activeTab) {
      sessionStorage.setItem(storageKey, activeTab);
    }
  }, [activeTab, storageKey, isMounted]);

  useEffect(() => {
    if (isMounted && groups.length > 0 && !groups.includes(activeTab)) {
      setActiveTab(groups[0] || '');
    }
  }, [groups, activeTab, isMounted]);



  // Find the maximum number of attempts any question has, so we know how many iterations to show in the dropdown
  const maxAttempts = Math.max(...mappedQuestions.map(q => q.attempts.length), 0);
  const iterationOptions = Array.from({ length: maxAttempts }, (_, i) => i);

  // If grouping by field, maybe we don't use tabs, or we do?
  // User said "年度別の時はタブで年度を切り替えられるように" (When grouped by year, make it possible to switch years with tabs)
  // Let's use tabs for both, it's actually much cleaner! But if they specifically asked for year, let's at least make sure year has tabs.
  // Actually, tabs for field is also great because otherwise the page is huge. Let's use tabs for whatever the group is.

  const renderTable = (groupKey: string) => {
    const qsForGroup = mappedQuestions.filter(q => {
      if (groupBy === 'year') return q.year === groupKey;
      if (groupBy === 'field') return (q.field || '分野不明') === groupKey;
      if (groupBy === 'knowledge') {
        if (groupKey === 'テーマ未分類') return !q.knowledgeTags;
        return !!(q.knowledgeTags && q.knowledgeTags.split(',').map(t => t.trim()).includes(groupKey));
      }
      if (groupBy === 'situation') {
        if (groupKey === '形式未分類') return !q.situationCategory;
        return !!(q.situationCategory && q.situationCategory.split(',').map(t => t.trim()).includes(groupKey));
      }
      return false;
    });
    if (qsForGroup.length === 0) return null;

    const getAttemptForIteration = (q: QuestionItem) => {
      if (selectedIteration === 'latest') return q.attempts[q.attempts.length - 1];
      return q.attempts[selectedIteration as number];
    };

    const answeredCount = qsForGroup.filter(q => getAttemptForIteration(q) !== undefined).length;
    const correctCount = qsForGroup.filter(q => getAttemptForIteration(q)?.isCorrect).length;
    const totalCount = qsForGroup.length;

    return (
      <div className="glass-panel animate-fade-in" style={{ padding: '2rem', overflowX: 'auto' }}>
        <h2 className="text-secondary" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '1.5rem', borderBottom: '1px solid var(--surface-border)', paddingBottom: '0.5rem' }}>
          <span>{groupKey}{groupBy === 'year' && !groupKey.includes('年') ? '年度' : ''}</span>
          <span style={{ fontSize: '1.1rem', color: 'var(--text-primary)', fontWeight: 'normal' }}>
            回答進捗: <strong style={{ color: 'var(--accent-primary)' }}>{answeredCount}</strong> / {totalCount} 問
            <span style={{ margin: '0 0.8rem', color: 'var(--surface-border)' }}>|</span>
            正答数: <strong style={{ color: 'var(--success)' }}>{correctCount}</strong> 問
          </span>
        </h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--surface-border)', color: 'var(--text-secondary)' }}>
              <th style={{ padding: '0.4rem 0.5rem', whiteSpace: 'nowrap' }}>年度・番号</th>
              <th style={{ padding: '0.4rem 0.5rem', whiteSpace: 'nowrap' }}>分野・タグ</th>
              <th style={{ padding: '0.4rem 0.5rem', whiteSpace: 'nowrap' }}>状態</th>
              <th style={{ padding: '0.4rem 0.5rem', whiteSpace: 'nowrap' }}>
                <select 
                  value={selectedIteration} 
                  onChange={(e) => setSelectedIteration(e.target.value === 'latest' ? 'latest' : Number(e.target.value))}
                  style={{ background: 'var(--bg-base)', color: 'var(--text-primary)', border: '1px solid var(--surface-border)', borderRadius: '6px', padding: '0.3rem 0.5rem', fontSize: '0.9rem', outline: 'none' }}
                >
                  <option value="latest">直近の回答結果</option>
                  {iterationOptions.map(i => (
                    <option key={i} value={i}>{i + 1}回目の回答結果</option>
                  ))}
                </select>
              </th>
              <th style={{ padding: '0.4rem 0.5rem', whiteSpace: 'nowrap' }}>アクション</th>
            </tr>
          </thead>
          <tbody>
            {qsForGroup.map(q => {
              const isDebated = q.isDebated;
              const isPopulated = !!q.content;
              const displayAttempt = getAttemptForIteration(q);
              const lastAttemptDate = displayAttempt?.attemptedAt;
              const attemptCount = q.attempts.length;
              
              let statusLabel = '未入力';
              let statusColor = 'var(--text-secondary)';
              if (isDebated) {
                statusLabel = '✨ ディベート済';
                statusColor = 'var(--accent-primary)';
              } else if (isPopulated) {
                statusLabel = '問題あり (未解説)';
                statusColor = 'var(--text-primary)';
              }

              const dateStr = lastAttemptDate 
                ? new Date(lastAttemptDate).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) 
                : '未挑戦';

              let elapsedStr = '';
              if (lastAttemptDate) {
                const diffMs = Date.now() - new Date(lastAttemptDate).getTime();
                const diffMins = Math.floor(diffMs / (1000 * 60));
                const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                if (diffMins < 60) elapsedStr = `${Math.max(1, diffMins)}分前`;
                else if (diffHours < 24) elapsedStr = `${diffHours}時間前`;
                else elapsedStr = `${diffDays}日前`;
              }

              let quizHref = `/quiz/${q.id}?groupBy=${groupBy}`;
              if (groupBy === 'knowledge') quizHref += `&knowledge=${encodeURIComponent(groupKey)}`;
              else if (groupBy === 'situation') quizHref += `&situation=${encodeURIComponent(groupKey)}`;
              else if (groupBy === 'field') quizHref += `&field=${encodeURIComponent(groupKey)}`;
              else if (groupBy === 'year') quizHref += `&year=${encodeURIComponent(groupKey)}`;

              return (
                <tr key={q.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '0.2rem 0.5rem', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                    <a href={`${basePath}${quizHref}`} style={{ color: 'var(--text-primary)', textDecoration: 'underline' }}>
                      {q.year} 問{q.questionNumber}
                    </a>
                  </td>
                  <td style={{ padding: '0.2rem 0.5rem' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{q.field || '未分類'}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {q.situationCategory?.split(',').map(t => <span key={t} style={{ display: 'inline-block', marginRight: '6px', color: '#60a5fa' }}>{t}</span>)}
                      {q.knowledgeTags?.split(',').map(t => <span key={t} style={{ display: 'inline-block', marginRight: '6px', color: '#34d399' }}>{t}</span>)}
                    </div>
                  </td>
                  <td style={{ padding: '0.2rem 0.5rem', whiteSpace: 'nowrap' }}>
                    <div style={{ color: statusColor, fontWeight: isDebated ? 'bold' : 'normal' }}>
                      {statusLabel}
                    </div>
                  </td>
                  <td style={{ padding: '0.2rem 0.5rem', whiteSpace: 'nowrap' }}>
                    {displayAttempt ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ color: displayAttempt.isCorrect ? 'var(--success)' : 'var(--error)', fontWeight: 'bold' }}>
                          {displayAttempt.isCorrect ? '✅ 正解' : '❌ 不正解'}
                        </span>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          ({dateStr})
                        </span>
                      </div>
                    ) : (
                      <span style={{ color: 'var(--text-secondary)' }}>未挑戦</span>
                    )}
                  </td>
                  <td style={{ padding: '0.2rem 0.5rem', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
                      <a
                        href={`${basePath}${quizHref}`}
                        className={`btn ${isDebated ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ padding: '0.3rem 0.8rem', fontSize: '0.85rem', textDecoration: 'none' }}
                      >
                        {q.attempts.length > 0 ? '復習する' : '挑戦する'}
                      </a>
                      <button
                        onClick={async () => {
                          // 全データの取得が必要な場合はAPIから取得
                          try {
                            const res = await fetch(`/api/questions/${q.id}`);
                            if (res.ok) {
                              const fullQ = await res.json();
                              setEditingQuestion(fullQ);
                            } else {
                              setEditingQuestion(q);
                            }
                          } catch {
                            setEditingQuestion(q);
                          }
                        }}
                        className="btn"
                        style={{
                          padding: '0.3rem 0.6rem',
                          fontSize: '0.8rem',
                          background: 'rgba(56, 189, 248, 0.15)',
                          border: '1px solid #38bdf8',
                          color: '#38bdf8',
                          borderRadius: '6px',
                          cursor: 'pointer'
                        }}
                      >
                        ✏️ 修正
                      </button>
                      {lastAttemptDate && (
                        <span style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>
                          {elapsedStr}
                          <span style={{ marginLeft: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 'normal' }}>
                            (計{attemptCount}回)
                          </span>
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Tabs */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <div className="tabs-container" style={{ maxWidth: '100%' }}>
          {groups.map(g => (
            <button
              key={g}
              onClick={() => setActiveTab(g)}
              className={`tab-btn ${activeTab === g ? 'active' : ''}`}
            >
              {g}{groupBy === 'year' && !g.includes('年') ? '年度' : ''}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {renderTable(activeTab)}

      {editingQuestion && (
        <EditQuestionModal
          question={editingQuestion}
          isOpen={!!editingQuestion}
          onClose={() => setEditingQuestion(null)}
          onSaveSuccess={() => {
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
