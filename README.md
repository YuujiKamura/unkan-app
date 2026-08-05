# 運行管理者試験（貨物） 過去問ダッシュボード

運行管理者試験（貨物）の過去問題（CBT・筆記）を解いて、学習進捗や正答率を管理できる Web アプリケーションです。

## 🌐 アプリケーション URL (GitHub Pages)

**[https://yuujikamura.github.io/unkan-app/](https://yuujikamura.github.io/unkan-app/)**

このアプリは GitHub Actions を用いて完全な静的サイト（SPA）としてビルドされ、ブラウザのみで動作します。

## 🚀 主な機能

* **過去問の解答と正誤判定**: 令和2年〜令和6年などの実際の過去問データを収録し、選択形式やCBTの穴埋め形式に対応。
* **学習進捗ダッシュボード**: 年度ごと、分野（4大分野）ごとの正答率や未回答問題の進捗を可視化。
* **学習カレンダー表示**: GitHubの草（ヒートマップ）のように日々の学習量を記録・表示。
* **ローカルセーブ・ロード機能**: ブラウザの LocalStorage にセーブデータを保存し、JSONファイルとしてエクスポート・インポートすることが可能（オフラインでの学習データ持ち運びに対応）。

## 🛠 開発・ローカル環境の立ち上げ

Node.js (v20以上を推奨) がインストールされている環境で、以下のコマンドを実行してください。

```bash
# 依存関係のインストール
npm install

# ローカル開発サーバーの起動
npm run dev
```

ブラウザで `http://localhost:3000/` にアクセスすると、ダッシュボード画面が表示されます。

> **Note**: ローカル開発時（`npm run dev`）はルートパス `/` で起動しますが、GitHub Pagesへのデプロイ時は `next.config.mjs` の設定により自動的に `/unkan-app` が `basePath` として設定されます。

## 📁 データの更新・管理

問題データ（`public/data/questions.json`）は、元のPDFまたは画像（`data/images/`）からOCRを通じてパースされ、スクリプト（`scripts/io/fix_*.ts` 等）によって正規化されたものが格納されています。
新しい年度の問題を追加する場合は、画像からJSONを抽出し、正規化スクリプトで変換した上で `public/data/questions.json` を更新してください。

### 🖼️ ローカルでのPDF画像表示（開発者向け）

GitHub Pages上では直接の画像埋め込みを避けていますが、ローカル開発環境で問題ごとの画像をインライン表示したい場合は以下の手順で画像を抽出できます。

1. 対象年度の過去問PDFをプロジェクトのルートディレクトリに配置します（例: `R06.CBT.pdf`, `R04.CBT.pdf`）。
2. Python環境で `PyMuPDF` をインストールします（`pip install PyMuPDF`）。
3. 抽出スクリプトを実行します: `python scripts/io/extract_all_pdf_pages.py`
4. `public/pdf_pages/` に問題ごとのPNG画像が生成され、`npm run dev` 起動時に自動で画像付きで表示されるようになります。

## ⚠️ 免責事項・データ出典

本アプリケーションで取り扱っている試験問題（テキストデータおよび抽出されたPDF画像データ）の出典および参照元は以下の通りです。

* 公益財団法人 運行管理者試験センター ([https://www.unkan.or.jp/](https://www.unkan.or.jp/))
* 運行管理者試験対策.net ([https://www.unkan-net.com/](https://www.unkan-net.com/))

本リポジトリおよびアプリケーションは、個人の学習目的で作成された非公式のツールであり、上記機関やサイトとは一切関係ありません。営利目的での利用やデータの二次配布を想定したものではありません。
権利侵害やサーバー負荷を防ぐため、第三者がアクセスできる状態（パブリックなホスティング）での公開には十分ご注意ください。

## 📝 技術スタック

* **フレームワーク**: Next.js (App Router, Static Export)
* **言語**: TypeScript
* **スタイリング**: Vanilla CSS (`src/app/globals.css`)
* **データ管理**: Prisma (スクリプトからのJSON生成用), ブラウザ LocalStorage (進捗管理用)
