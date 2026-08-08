"use client";

import { useEffect } from 'react';

// Next.jsのviewport/metadata APIはinitialScaleを省略しても常にdefault(1)を
// 補完し、width=1200と衝突して横スクロールが発生する(device-width/1 < 1200なので
// widthが勝ち、画面には収まらない)。initial-scaleを付けずwidthのみのmetaタグに
// することでブラウザにdevice-width/1200のスケールを自動計算させ、PCレイアウトを
// 画面幅ぴったりに縮小表示する。metadata API経由では実現できないためマウント後に
// 属性を書き換える。
// 注意: Next.jsのmetaタグはReactが自身のfiber木で管理しているノードなので、
// removeしてcreateElementで作り直すとReactが後で行うremoveChildが対象喪失で
// クラッシュする("Cannot read properties of null (reading 'removeChild')")。
// 既存ノードのcontent属性だけをその場で書き換え、ノードの生成・削除はしない。
export default function ForceDesktopViewport() {
  useEffect(() => {
    const existing = document.querySelector('meta[name="viewport"]');
    if (existing) {
      existing.setAttribute('content', 'width=1200');
    } else {
      const meta = document.createElement('meta');
      meta.setAttribute('name', 'viewport');
      meta.setAttribute('content', 'width=1200');
      document.head.appendChild(meta);
    }
  }, []);

  return null;
}
