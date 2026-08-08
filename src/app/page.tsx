'use client';

import { useEffect } from 'react';

export default function Home() {
  useEffect(() => {
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
    // meta refreshはURLフラグメント(#share=...)を保持せず、共有URLをトップページ
    // 経由で開いた際にデータが消えるバグの原因だったため、JSリダイレクトに変更し
    // hashを明示的に引き継ぐ。
    window.location.replace(`${basePath}/questions/${window.location.hash}`);
  }, []);

  return (
    <div className="container" style={{ textAlign: 'center', padding: '4rem' }}>
      <h3>ダッシュボードに移動しています...</h3>
    </div>
  );
}
