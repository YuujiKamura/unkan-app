# unkan-app リポジトリ固有ルール

グローバルのCLAUDE.mdを補完する、このリポジトリ固有の運用ルール。衝突時はこちらが優先(指示階層: repo > project > global)。

## 配布元(出典)は2つある、混同するな

このアプリが参照する過去問データ・図表の配布元は以下の2つで、年度によって使い分ける(2026-08-10 user確認)。

| 配布元 | URL | 対象年度 |
|---|---|---|
| 公益財団法人 運行管理者試験センター | https://www.unkan.or.jp/ | **令和5年度(CBT)・令和6年度(CBT)** — センターが直接PDFを公開している(実PDFパスは`/after/answer/pdf/05_cbtkamotsumondai.pdf`等、年度が新しいほどJSテンプレートで動的配信されURLが変わりうるためアプリからは`過去の試験問題`トップ相当にのみリンクする) |
| 運行管理者試験対策.net | https://www.unkan-net.com/ | それ以外の年度(令和4年度以前・令和2年度第1回等) |

- フッター(`src/app/layout.tsx`)はこの2つを両方クレジット表示している。片方だけを出典として扱わない。
- `SingleQuizClient.tsx`内で配布元リンクを出す箇所は、`currentQ.year`が`令和5年 (CBT)`/`令和6年 (CBT)`かどうかで`sourceSiteUrl`/`sourceSiteName`を切り替えている(`isCenterSourceYear`)。新しい年度を追加する時は、その年度のCBT問題がどちらの配布元で公開されているか実際に確認してから振り分けること(推測で両方unkan-net.comに倒さない)。

## 図表・イラストは著作物、Pagesでは掲載しない(ローカル専用)

- 過去問の図表・イラスト画像(`public/extracted_images/`, `public/pdf_pages/`)は著作物であり、GitHub Pages(公開の静的サイト)には一切コミット・配信しない。`.gitignore`対象、これは意図的な仕様(「それは仕様だ」2026-08-09 user確認済み)。
- ローカル開発サーバー(`isLocal`環境)でのみ画像を表示する。本番Pagesでは`hasLocalImage`が常にfalseになり、画像は出ない。
- **画像が必要な問題かどうかの判定にタグ(`knowledgeTags`の`#NEEDS_IMAGE`)だけを信用するな**。タグ付けは網羅されていない(2026-08-10時点、imageUrlを持つ74問中6問しかタグが付いていなかった)。フォールバック表示の条件は`needsImage`タグだけでなく`currentQ.imageUrl`の有無でも判定すること(`SingleQuizClient.tsx`の該当箇所を参照)。
- Pages上で画像を表示できない問題には、**必ず「なぜ画像が無いのか」を説明する**(著作物のため掲載していない旨)。ただ配布元へのリンクを置くだけで理由を書かないのは不親切、というのが2026-08-10のuser指摘。
- 配布元へのリンクのボタン文言は、リンク先が**該当問題のPDFではなくサイトのトップページであること**を文言自体に反映させる(例:「配布元サイトを開く（トップページ）」)。「この問題の図表を確認する」のような、あたかも該当ページに直接飛ぶかのような文言にしない(2026-08-10 user指摘で修正)。

## 学習データ(default_user.json)は別リポで管理

- ユーザーの学習進捗データは`unkan-app`本体とは別のリポジトリ https://github.com/YuujiKamura/unkan-app-userdata で管理する(2026-08-10移行)。
- 理由: 共有ボタン(および解答するボタンごとの自動publish)のpushがコード側の履歴にスナップショットcommitを積み続けるのを避けるため。専用リポにはビルドworkflowが存在せず、pushしてもCIが一切走らない。
- `unkan-app`側のローカルサーバー(`src/app/api/userdata/publish-default/route.ts`)は、`process.cwd()`から見て兄弟ディレクトリの`unkan-app-userdata`(事前にclone済み前提)へ書き込み・push する。パスはハードコードせず`path.join(process.cwd(), '..', 'unkan-app-userdata')`で相対解決すること。
- Pages側の`#share=default`読み込み(`ShareUrlImporter.tsx`)は、Pagesのビルド成果物ではなく`https://raw.githubusercontent.com/YuujiKamura/unkan-app-userdata/main/data/default_user.json`を直接fetchする(GitHub側で5分キャッシュ・CORS全許可、curlで確認済み)。これにより共有pushがPagesの再ビルド完了を待たずに反映される。

## デフォルトデータの解説(explanation)はGemini生成、無検証

- `unkan-app-userdata`で配布している`default_user.json`に含まれる各問題の解説メモ(`explanation`)は、Geminiとの対話で生成されたものであり、**間違いや不明瞭な記述を多分に含んでいる可能性がある**(2026-08-10 user申告)。
- 解説の内容を出典・法令根拠として扱わない。解説メモを修正・追記する作業をする時は「既存の解説文が正しい」という前提を置かず、必要なら一次資料(法令・公式PDF)で裏取りしてから直すこと。
- UI上でこの注意書きを利用者に見せるかどうかは2026-08-10時点で未実装・未合意。追加するならこの項目を更新すること。

## 「解答する」ボタンで自動publish

- DBモード(ローカルサーバー)限定で、問題に解答するたびに学習データが自動的に`unkan-app-userdata`へpush される(`SingleQuizClient.tsx`の`autoPublishAfterAnswer`、fire-and-forget、UIをブロックしない)。2026-08-10 user指示「解答ボタンを押したときだけでいい」を反映。
- 共有ボタン(`SaveLoadUI.tsx`)は「今すぐ手動で反映したい時」用として引き続き残す。
