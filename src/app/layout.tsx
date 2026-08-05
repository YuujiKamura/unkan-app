import type { Metadata } from "next";
import "./globals.css";
import SaveLoadUI from "../components/SaveLoadUI";
import AutoSaveSyncProvider from "../components/AutoSaveSyncProvider";
import Link from 'next/link';

export const metadata: Metadata = {
  title: "運行管理者 過去問演習・学習ダッシュボード",
  description: "運行管理者の過去問演習・進捗管理アプリ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>
        <AutoSaveSyncProvider>
          <nav style={{ 
            padding: '0.8rem 2rem', 
            background: 'var(--surface-color)', 
            borderBottom: '1px solid var(--surface-border)',
            display: 'flex',
            position: 'sticky',
            top: 0,
            zIndex: 100,
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)'
          }}>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'space-between', width: '100%', alignItems: 'center', flexWrap: 'wrap' }}>
              <Link href="/questions" style={{ 
                textDecoration: 'none', 
                color: 'var(--text-primary)', 
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '1.2rem'
              }}>
                🏠 運行管理者過去問ダッシュボード
              </Link>
              <SaveLoadUI />
            </div>
          </nav>
          <main style={{ minHeight: 'calc(100vh - 150px)' }}>
            {children}
          </main>
          
          <footer style={{
            marginTop: '4rem',
            padding: '2rem',
            background: 'var(--surface-color)',
            borderTop: '1px solid var(--surface-border)',
            textAlign: 'center',
            fontSize: '0.85rem',
            color: 'var(--text-secondary)',
            lineHeight: '1.6'
          }}>
            <p style={{ marginBottom: '0.5rem' }}>
              本アプリケーションに収録されている運行管理者試験（貨物）の過去問題および図表等の出典・参照元は以下の通りです。<br />
              ・<a href="https://www.unkan.or.jp/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary-color)', textDecoration: 'none' }}>公益財団法人 運行管理者試験センター</a><br />
              ・<a href="https://www.unkan-net.com/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary-color)', textDecoration: 'none' }}>運行管理者試験対策.net</a>
            </p>
            <p style={{ opacity: 0.8 }}>
              ※本サイトは個人の学習目的で作成された非公式の解説・演習用アプリケーションであり、上記機関・サイトとは一切関係ありません。
            </p>
          </footer>
        </AutoSaveSyncProvider>
      </body>
    </html>
  );
}
