'use client';

import React, { useEffect, useState } from 'react';

export type ThemeType = 'midnight' | 'light' | 'ocean' | 'emerald' | 'sunset';

interface ThemeOption {
  id: ThemeType;
  name: string;
  icon: string;
  color: string;
}

const THEMES: ThemeOption[] = [
  { id: 'midnight', name: 'ミッドナイト (Cyber)', icon: '🌌', color: '#a855f7' },
  { id: 'light', name: 'エレガント (Light)', icon: '☀️', color: '#2563eb' },
  { id: 'ocean', name: 'オーシャン (Navy)', icon: '🌊', color: '#06b6d4' },
  { id: 'emerald', name: 'エメラルド (Forest)', icon: '🌿', color: '#10b981' },
  { id: 'sunset', name: 'サンセット (Amber)', icon: '🌅', color: '#f97316' },
];

export default function ThemeSelector() {
  const [currentTheme, setCurrentTheme] = useState<ThemeType>('midnight');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const saved = localStorage.getItem('takken_color_theme') as ThemeType | null;
    if (saved && THEMES.some(t => t.id === saved)) {
      setCurrentTheme(saved);
      document.documentElement.setAttribute('data-theme', saved);
    } else {
      document.documentElement.setAttribute('data-theme', 'midnight');
    }
  }, []);

  const changeTheme = (themeId: ThemeType) => {
    setCurrentTheme(themeId);
    localStorage.setItem('takken_color_theme', themeId);
    document.documentElement.setAttribute('data-theme', themeId);
  };

  if (!isMounted) {
    return null;
  }

  return (
    <div className="theme-selector-container">
      <div className="theme-pills">
        {THEMES.map((theme) => {
          const isActive = currentTheme === theme.id;
          return (
            <button
              key={theme.id}
              onClick={() => changeTheme(theme.id)}
              className={`theme-pill ${isActive ? 'active' : ''}`}
              title={theme.name}
            >
              <span className="theme-icon">{theme.icon}</span>
              <span className="theme-name">{theme.name.split(' ')[0]}</span>
            </button>
          );
        })}
      </div>

      <style jsx>{`
        .theme-selector-container {
          display: flex;
          align-items: center;
        }

        .theme-pills {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          background: rgba(0, 0, 0, 0.25);
          padding: 0.3rem 0.4rem;
          border-radius: 20px;
          border: 1px solid var(--surface-border);
          backdrop-filter: blur(10px);
        }

        .theme-pill {
          display: flex;
          align-items: center;
          gap: 0.3rem;
          background: transparent;
          border: 1px solid transparent;
          color: var(--text-secondary);
          padding: 0.3rem 0.65rem;
          border-radius: 14px;
          font-size: 0.82rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1);
          white-space: nowrap;
        }

        .theme-pill:hover {
          color: var(--text-primary);
          background: rgba(255, 255, 255, 0.1);
        }

        .theme-pill.active {
          background: var(--surface-hover);
          color: var(--text-primary);
          border-color: var(--accent-primary);
          box-shadow: 0 2px 8px var(--accent-glow);
          font-weight: 700;
        }

        .theme-icon {
          font-size: 0.95rem;
        }

        @media (max-width: 640px) {
          .theme-name {
            display: none;
          }
          .theme-pill {
            padding: 0.35rem 0.5rem;
          }
        }
      `}</style>
    </div>
  );
}
