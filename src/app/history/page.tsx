'use client';

import { Suspense } from 'react';
import HistoryClient from '@/components/HistoryClient';

export default function HistoryPage() {
  return (
    <Suspense fallback={<div className="container" style={{ textAlign: 'center', padding: '4rem' }}>読み込み中...</div>}>
      <HistoryClient />
    </Suspense>
  );
}
