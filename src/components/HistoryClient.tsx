'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import HistoryCalendar from '@/components/HistoryCalendar';
import { apiClient } from '@/lib/apiClient';
import { computeAttemptsByDate } from '@/lib/attemptStats';

export default function HistoryClient() {
  const searchParams = useSearchParams();
  const dateFilter = searchParams.get('date');

  const [attempts, setAttempts] = useState<any[]>([]);
  const [allRecentAttempts, setAllRecentAttempts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [filteredAttempts, allAttempts] = await Promise.all([
          apiClient.getAttempts(dateFilter || undefined),
          apiClient.getAllAttempts()
        ]);
        // データソース(localStorageの追加順/DB取得順)に依存せず常に新しい順に揃える
        const sorted = [...filteredAttempts].sort(
          (a, b) => new Date(b.attemptedAt).getTime() - new Date(a.attemptedAt).getTime()
        );
        setAttempts(sorted);
        setAllRecentAttempts(allAttempts);
      } catch (err) {
        console.error('Failed to load history', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [dateFilter]);

  const attemptsByDate = computeAttemptsByDate(allRecentAttempts);

  return (
    <div className="container animate-fade-in-up" style={{ maxWidth: '1000px' }}>
      <header style={{ marginBottom: '2rem', textAlign: 'center' }}>
        <h1 className="text-gradient" style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>
          {dateFilter ? `${dateFilter}の解答履歴` : '解答履歴'}
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
          {dateFilter ? 'その日に解いた問題のリストです' : '日々の学習の記録と、過去の解答日時を振り返ることができます'}
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
          <Link href="/" className="btn btn-secondary">
            ホームに戻る
          </Link>
          {dateFilter && (
            <Link href="/history" className="btn btn-primary">
              すべての履歴を見る
            </Link>
          )}
        </div>
      </header>

      {!loading && <HistoryCalendar attemptsByDate={attemptsByDate} />}

      <div className="glass-panel" style={{ padding: '2rem', overflowX: 'auto', marginTop: '2rem' }}>
        {loading ? (
          <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>読み込み中...</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--surface-border)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '1rem 0.5rem' }}>解答日時</th>
                <th style={{ padding: '1rem 0.5rem' }}>年度・番号</th>
                <th style={{ padding: '1rem 0.5rem' }}>分野</th>
                <th style={{ padding: '1rem 0.5rem' }}>結果</th>
                <th style={{ padding: '1rem 0.5rem' }}>アクション</th>
              </tr>
            </thead>
            <tbody>
              {attempts.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    まだ解答履歴がありません。ランダム演習などで問題を解くとここに記録されます。
                  </td>
                </tr>
              ) : (
                attempts.map(attempt => {
                  const dateStr = new Date(attempt.attemptedAt).toLocaleString('ja-JP', { 
                    year: 'numeric', month: '2-digit', day: '2-digit', 
                    hour: '2-digit', minute: '2-digit' 
                  });
                  
                  const isCorrect = attempt.isCorrect;
                  const attemptCount = attempt.question?._count?.attempts || 1;
                  
                  return (
                    <tr key={attempt.id} style={{ 
                      borderBottom: '1px solid rgba(255,255,255,0.05)',
                      background: isCorrect ? 'transparent' : 'rgba(255, 68, 68, 0.05)'
                    }}>
                      <td style={{ padding: '1rem 0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{dateStr}</td>
                      <td style={{ padding: '1rem 0.5rem', fontWeight: 'bold' }}>
                        {attempt.question?.year} 問{attempt.question?.questionNumber}
                      </td>
                      <td style={{ padding: '1rem 0.5rem' }}>{attempt.question?.field || '-'}</td>
                      <td style={{ padding: '1rem 0.5rem', fontWeight: 'bold', color: isCorrect ? 'var(--success)' : 'var(--error)' }}>
                        {isCorrect ? '✅ 正解' : '❌ 不正解'}
                      </td>
                      <td style={{ padding: '1rem 0.5rem' }}>
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                          <Link 
                            href={`/quiz/${attempt.questionId}`}
                            className={`btn ${!isCorrect ? 'btn-primary' : 'btn-secondary'}`}
                            style={{ padding: '0.4rem 1rem', fontSize: '0.9rem' }}
                          >
                            復習する
                          </Link>
                          <span style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>
                            {(() => {
                              const diffMs = Date.now() - new Date(attempt.attemptedAt).getTime();
                              const diffMins = Math.floor(diffMs / (1000 * 60));
                              const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                              const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                              if (diffMins < 60) return `${Math.max(1, diffMins)}分前`;
                              if (diffHours < 24) return `${diffHours}時間前`;
                              return `${diffDays}日前`;
                            })()}
                            <span style={{ marginLeft: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                              (計{attemptCount}回)
                            </span>
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
