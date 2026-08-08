'use client';

import React, { useEffect, useState } from 'react';

type Props = {
  attemptsByDate: Record<string, { total: number, correct: number }>;
};

export default function HistoryCalendar({ attemptsByDate }: Props) {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

  // ForceDesktopViewportがwidth=1200を強制しているため、CSSのメディアクエリは
  // 常にレイアウトビューポート(1200px)基準で評価され実機幅を判定できない。
  // window.screen.width(物理画面幅、viewport強制の影響を受けない)で判定する。
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    setIsMobile(window.screen.width <= 820);
  }, []);

  // Get current date
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  // Calculate days in month and starting day of week
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 = Sunday

  const days = [];
  // Add empty slots for days before the 1st
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(null);
  }
  // Add actual days
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  const weekDays = ['日', '月', '火', '水', '木', '金', '土'];

  const getHeatmapColor = (count: number) => {
    if (count === 0) return '#f1f5f9';
    if (count < 5) return 'rgba(16, 185, 129, 0.25)';
    if (count < 10) return 'rgba(16, 185, 129, 0.45)';
    if (count < 20) return 'rgba(16, 185, 129, 0.7)';
    return 'rgba(16, 185, 129, 0.95)';
  };

  const weekdayFontSize = isMobile ? '2.7rem' : '0.9rem';
  const dateFontSize = isMobile ? '2.85rem' : '0.95rem';
  const statFontSize = isMobile ? '1.5rem' : '0.85rem';
  const cellMinHeight = isMobile ? '160px' : '60px';
  const cellPadding = isMobile ? '0.8rem' : '0.5rem';
  const todayBorder = isMobile ? '3px' : '2.5px';

  return (
    <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem', border: '2px solid #000000', background: '#ffffff' }}>
      <h3 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#000000', fontWeight: 'bold' }}>
        <span style={{ fontSize: '1.2rem' }}>📅</span> {year}年 {month + 1}月 の学習記録
      </h3>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: '6px',
        textAlign: 'center'
      }}>
        {weekDays.map(day => (
          <div key={day} style={{ fontSize: weekdayFontSize, color: '#000000', fontWeight: 'bold', padding: '0.5rem 0' }}>
            {day}
          </div>
        ))}

        {days.map((day, index) => {
          if (day === null) {
            return <div key={`empty-${index}`} style={{ padding: '0.5rem' }} />;
          }

          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const stat = attemptsByDate[dateStr] || { total: 0, correct: 0 };
          const isToday = day === now.getDate();

          const content = (
            <div
              style={{
                background: getHeatmapColor(stat.total),
                borderRadius: '8px',
                padding: cellPadding,
                minHeight: cellMinHeight,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                border: isToday ? `${todayBorder} solid #2563eb` : '1px solid #000000',
                color: '#000000',
                transition: 'transform 0.2s',
                cursor: stat.total > 0 ? 'pointer' : 'default'
              }}
              title={`${dateStr}: ${stat.total}問解答 (${stat.correct}問正解)`}
            >
              <div style={{ fontSize: dateFontSize, fontWeight: 'bold', color: '#000000' }}>{day}</div>
              {stat.total > 0 && (
                <div style={{ fontSize: statFontSize, marginTop: '8px', fontWeight: 'bold', color: '#000000', whiteSpace: 'nowrap' }}>
                  {stat.correct}/{stat.total}問
                </div>
              )}
            </div>
          );

          if (stat.total > 0) {
            return (
              <a key={day} href={`${basePath}/history?date=${dateStr}`} style={{ textDecoration: 'none' }}>
                {content}
              </a>
            );
          }

          return <div key={day}>{content}</div>;
        })}
      </div>
    </div>
  );
}
