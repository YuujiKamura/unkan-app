'use client';

export default function Home() {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
  
  return (
    <>
      <head>
        <meta httpEquiv="refresh" content={`0; url=${basePath}/questions`} />
      </head>
      <div className="container" style={{ textAlign: 'center', padding: '4rem' }}>
        <h3>ダッシュボードに移動しています...</h3>
      </div>
    </>
  );
}
