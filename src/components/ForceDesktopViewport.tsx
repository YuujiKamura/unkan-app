"use client";

import { useEffect } from 'react';

// Next.jsのviewport/metadata APIはinitialScaleを省略しても常にdefault(1)を
// 補完し、width=1200と衝突して横スクロールが発生する(device-width/1 < 1200なので
// widthが勝ち、画面には収まらない)。initial-scaleを付けずwidthのみのmetaタグに
// することでブラウザにdevice-width/1200のスケールを自動計算させ、PCレイアウトを
// 画面幅ぴったりに縮小表示する。metadata API経由では実現できないためマウント後に
// DOMを直接書き換える。
export default function ForceDesktopViewport() {
  useEffect(() => {
    document.querySelectorAll('meta[name="viewport"]').forEach((el) => el.remove());
    const meta = document.createElement('meta');
    meta.setAttribute('name', 'viewport');
    meta.setAttribute('content', 'width=1200');
    document.head.appendChild(meta);
  }, []);

  return null;
}
