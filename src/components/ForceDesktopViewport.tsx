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
//
// スマホでホームリンク(🏠)からの戻る操作後など、Next.jsのApp Routerが
// クライアントサイド遷移のたびにこのmetaタグをdefault-metadata.jsの
// "width=device-width, initial-scale=1"へ書き戻すことがあり、その後の
// ページがPCレイアウト(width=1200)に戻らなくなる不具合があった。
// マウント時1回の上書きだけでは対抗できないため、MutationObserverで
// content属性の変更を監視し、我々の意図した値以外に変わった瞬間に
// 即座に書き戻す(何が・いつ変更してきても防御できる恒久対応)。
const FORCED_CONTENT = 'width=1200';

export default function ForceDesktopViewport() {
  useEffect(() => {
    const applyForced = (meta: Element) => {
      if (meta.getAttribute('content') !== FORCED_CONTENT) {
        meta.setAttribute('content', FORCED_CONTENT);
      }
    };

    let existing = document.querySelector('meta[name="viewport"]');
    if (!existing) {
      existing = document.createElement('meta');
      existing.setAttribute('name', 'viewport');
      document.head.appendChild(existing);
    }
    applyForced(existing);

    const observer = new MutationObserver(() => {
      const meta = document.querySelector('meta[name="viewport"]');
      if (meta) applyForced(meta);
    });
    observer.observe(document.head, {
      attributes: true,
      attributeFilter: ['content'],
      // Next.jsのApp Routerはページ遷移のたびにmetaタグの属性を書き換えるのではなく、
      // 古いノードをremoveして新しいノードをinsertすることがある(要素そのものの
      // 差し替え)。attributesだけでは検知できないため、要素の追加・削除(childList)
      // も併せて監視する。
      childList: true,
      subtree: true
    });

    return () => observer.disconnect();
  }, []);

  return null;
}
