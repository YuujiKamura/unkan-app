'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

interface SubFieldStat {
  field: string;
  total: number;
  correct: number;
  nextId?: number | null;
  unansweredCount?: number;
}

export default function SubFieldChart({ stats, groupBy = 'knowledge' }: { stats: SubFieldStat[], groupBy?: 'knowledge' | 'situation' | 'field' }) {
  const router = useRouter();

  // 全分野・全テーマの到達度を集計（ソート順: 問題数が多い順）
  const topStats = [...stats]
    .filter(s => s.total > 0)
    .map(s => ({
      ...s,
      accuracy: Math.round((s.correct / s.total) * 100),
    }))
    .sort((a, b) => b.total - a.total);

  // 正答率に応じた条件付きカラー判定
  const getBarColor = (accuracy: number) => {
    if (accuracy >= 80) return 'rgba(5, 150, 105, 0.9)';   // 80%以上: エメラルドグリーン (得意)
    if (accuracy >= 50) return 'rgba(37, 99, 235, 0.9)';   // 50-79%: サファイアブルー (順調)
    return 'rgba(220, 38, 38, 0.9)';                        // 50%未満: レッド (弱点)
  };

  const data = {
    labels: topStats.map(s => s.field),
    datasets: [
      {
        label: '正答率 (%)',
        data: topStats.map(s => s.accuracy),
        backgroundColor: topStats.map(s => getBarColor(s.accuracy)),
        borderColor: '#000000',
        borderWidth: 2,
        borderRadius: 6,
        barThickness: 20,
      },
    ],
  };

  const options = {
    indexAxis: 'y' as const, // 横棒グラフに設定
    responsive: true,
    maintainAspectRatio: false,
    onClick: (event: any, elements: any[]) => {
      if (elements && elements.length > 0) {
        const index = elements[0].index;
        const stat = topStats[index];
        if (stat) {
          router.push(`/questions?groupBy=${groupBy}&${groupBy}=${encodeURIComponent(stat.field)}#questions-list`);
        }
      }
    },
    onHover: (event: any, elements: any[]) => {
      if (event.native && event.native.target) {
        event.native.target.style.cursor = elements.length > 0 ? 'pointer' : 'default';
      }
    },
    scales: {
      x: {
        min: 0,
        max: 100,
        grid: {
          color: 'rgba(0, 0, 0, 0.15)',
          lineWidth: 1,
        },
        ticks: {
          color: '#000000',
          font: { size: 12, weight: 'bold' as const, family: 'Inter, sans-serif' },
          callback: (value: any) => `${value}%`,
        },
        title: {
          display: true,
          text: '正答率 (%) — クリックでこの分野の全問題リストを表示 📋',
          color: '#000000',
          font: { size: 12, weight: 'bold' as const },
        },
      },
      y: {
        grid: {
          display: false,
        },
        ticks: {
          color: '#000000',
          font: { size: 13, weight: 'bold' as const, family: 'Inter, sans-serif' },
        },
      },
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: '#000000',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        titleFont: { weight: 'bold' as const, size: 14 },
        bodyFont: { size: 13 },
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: (context: any) => {
            const stat = topStats[context.dataIndex];
            const unansweredText = stat.unansweredCount !== undefined ? ` (未挑戦: ${stat.unansweredCount}問)` : '';
            return ` 正答率: ${stat.accuracy}% (${stat.correct} / ${stat.total}問正解)${unansweredText} ➔ クリックで問題一覧を表示`;
          },
        },
      },
    },
  };

  // 全体の解答問題数サマリー計算
  const totalQuestions = topStats.reduce((acc, curr) => acc + curr.total, 0);
  const chartHeight = Math.max(450, topStats.length * 32);

  return (
    <div className="subfield-dashboard">
      {/* 集計対象の明記サマリーバー */}
      <div className="dataset-scope-badge">
        <span className="scope-icon">📚</span>
        <span className="scope-text">
          集計範囲: <strong>全14年度（平成26年〜令和7年） / 全{totalQuestions}問</strong> の学習結果を表示中（バー・カードクリックで該当分野の問題一覧へ移動）
        </span>
      </div>

      {/* サマリーバー */}
      <div className="summary-header">
        <div className="summary-title">
          <span>📊 {groupBy === 'knowledge' ? 'テーマ別' : groupBy === 'situation' ? '形式別' : '分野別'} 正答率ランキング (クリックして問題一覧を表示 📋)</span>
        </div>
        <div className="legend-pills">
          <span className="pill pill-green">🟢 得意 (80%以上)</span>
          <span className="pill pill-blue">🔵 普通 (50〜79%)</span>
          <span className="pill pill-red">🔴 弱点 (50%未満)</span>
        </div>
      </div>

      {/* 横棒グラフ本体 (テーマ数に応じた動的高度) */}
      <div className="chart-wrapper" style={{ height: `${chartHeight}px` }}>
        <Bar data={data} options={options} />
      </div>

      {/* データ詳細カード一覧 */}
      <div className="details-list-container" id="questions-list">
        <h4 className="list-title">📌 分野別到達度データ詳細 (カードクリックで該当分野の問題一覧を開く)</h4>
        <div className="stats-grid">
          {topStats.map((stat) => {
            const isGood = stat.accuracy >= 80;
            const isWeak = stat.accuracy < 50;
            const badgeClass = isGood ? 'badge-good' : isWeak ? 'badge-weak' : 'badge-normal';
            const badgeText = isGood ? '得意' : isWeak ? '要復習' : '順調';

            return (
              <div 
                key={stat.field} 
                className="stat-card clickable"
                onClick={() => router.push(`/questions?groupBy=${groupBy}&${groupBy}=${encodeURIComponent(stat.field)}#questions-list`)}
              >
                <div className="stat-header">
                  <span className="field-name">{stat.field}</span>
                  <span className={`status-badge ${badgeClass}`}>{badgeText}</span>
                </div>

                <div className="stat-body">
                  <div className="accuracy-val">{stat.accuracy}%</div>
                  <div className="count-val">({stat.correct} / {stat.total}問)</div>
                </div>

                <div className="progress-bg">
                  <div
                    className={`progress-fill ${badgeClass}`}
                    style={{ width: `${stat.accuracy}%` }}
                  />
                </div>

                <div className="stat-action-btn">
                  <span>全{stat.total}問のリストを見る 📋 ➔</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <style jsx>{`
        .subfield-dashboard {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          width: 100%;
        }

        .dataset-scope-badge {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          background: #eff6ff;
          border: 2px solid #2563eb;
          border-radius: 12px;
          padding: 0.8rem 1.2rem;
          color: #0f172a;
          font-size: 0.95rem;
          box-shadow: 0 2px 8px rgba(37, 99, 235, 0.08);
        }

        .scope-icon {
          font-size: 1.2rem;
        }

        .scope-text strong {
          color: #2563eb;
          font-weight: 800;
        }

        .summary-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #ffffff;
          border: 2px solid #000000;
          border-radius: 14px;
          padding: 1rem 1.25rem;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
          flex-wrap: wrap;
          gap: 0.8rem;
        }

        .summary-title {
          font-size: 1.05rem;
          font-weight: 800;
          color: #000000;
        }

        .legend-pills {
          display: flex;
          gap: 0.6rem;
        }

        .pill {
          font-size: 0.85rem;
          font-weight: 700;
          padding: 0.3rem 0.7rem;
          border-radius: 20px;
          border: 1px solid #000000;
        }

        .pill-green { background: #d1fae5; color: #065f46; }
        .pill-blue { background: #dbeafe; color: #1e40af; }
        .pill-red { background: #fee2e2; color: #991b1b; }

        .chart-wrapper {
          position: relative;
          height: 480px;
          width: 100%;
          background: #ffffff;
          padding: 1.25rem;
          border-radius: 16px;
          border: 2px solid #000000;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.08);
        }

        .details-list-container {
          background: #ffffff;
          border: 2px solid #000000;
          border-radius: 16px;
          padding: 1.5rem;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.08);
        }

        .list-title {
          font-size: 1.1rem;
          font-weight: 800;
          color: #000000;
          margin-bottom: 1.25rem;
          border-bottom: 2px solid #000000;
          padding-bottom: 0.5rem;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
          gap: 1rem;
        }

        .stat-card {
          background: #ffffff;
          border: 2px solid #000000;
          border-radius: 12px;
          padding: 0.9rem;
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);
          transition: all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1);
        }

        .stat-card.clickable {
          cursor: pointer;
        }

        .stat-card.clickable:hover {
          transform: translateY(-3px);
          box-shadow: 0 6px 16px rgba(37, 99, 235, 0.15);
          border-color: #2563eb;
          background: #f8fafc;
        }

        .stat-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 0.5rem;
        }

        .field-name {
          font-size: 0.95rem;
          font-weight: 800;
          color: #000000;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .status-badge {
          font-size: 0.75rem;
          font-weight: 800;
          padding: 0.2rem 0.55rem;
          border-radius: 10px;
          border: 1px solid #000000;
          flex-shrink: 0;
        }

        .badge-good { background: #d1fae5; color: #065f46; }
        .badge-normal { background: #dbeafe; color: #1e40af; }
        .badge-weak { background: #fee2e2; color: #991b1b; }

        .stat-body {
          display: flex;
          align-items: baseline;
          gap: 0.5rem;
        }

        .accuracy-val {
          font-size: 1.35rem;
          font-weight: 900;
          color: #000000;
        }

        .count-val {
          font-size: 0.85rem;
          font-weight: 700;
          color: #000000;
        }

        .progress-bg {
          height: 10px;
          background: #e2e8f0;
          border-radius: 5px;
          overflow: hidden;
          border: 1px solid #000000;
        }

        .progress-fill {
          height: 100%;
          border-radius: 4px;
          transition: width 0.4s ease;
        }

        .progress-fill.badge-good { background: #059669; }
        .progress-fill.badge-normal { background: #2563eb; }
        .progress-fill.badge-weak { background: #dc2626; }

        .stat-action-btn {
          margin-top: 0.2rem;
          font-size: 0.82rem;
          font-weight: 800;
          color: #2563eb;
          display: flex;
          justify-content: flex-end;
          align-items: center;
        }

        .stat-card:hover .stat-action-btn {
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
}
