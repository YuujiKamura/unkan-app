'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/questions');
  }, [router]);

  return (
    <div className="container" style={{ textAlign: 'center', padding: '4rem' }}>
      <h3>ダッシュボードに移動しています...</h3>
    </div>
  );
}
