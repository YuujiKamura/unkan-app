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
          {children}
        </AutoSaveSyncProvider>
      </body>
    </html>
  );
}
