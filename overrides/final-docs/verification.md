# Verification Record

最終実施日: 2026-08-01

## 検証対象

Claude Designで確定したダッシュボード提案を、既存の状態管理・API・採点ロジックを変更せずに移植した版です。主な変更範囲は、既存CSSトークンの拡張、4カラム台帳、危険度レールとスコア階調、配点別理由チップ、確認ダイアログ、390×844向けレスポンシブ構成です。

UI実装の基準コミット:

```text
6982528 test: verify dialog dismissal and capture design states
```

この記録を含む配布物は、チャットで提示する最終ソースZIPのSHA-256によって同定します。中間のデザイン差分アーカイブは配布物ではありません。

## 実行環境

| 項目 | 値 |
|---|---|
| OS | Ubuntu 24.04.4 LTS（GitHub Actions） |
| Node.js | v22.23.1 |
| npm | 10.9.8 |
| Next.js | 16.2.11（webpack） |
| Playwright Chromium | Chrome for Testing 151.0.7922.34 / Playwright Chromium v1234 |
| 日本語フォント | Noto Sans CJK JP |

ローカル環境の内部npmミラーには一部依存が無かったため、純粋なソース契約テストはローカルで実行し、実依存を必要とする検証はGitHub Actions上で実行しました。

## コマンド結果

| 検証 | 結果 | 実測 |
|---|---|---|
| `npm install` | PASS | 347 packages added / 348 packages audited |
| `npm run test:unit` | PASS | **84 tests / 0 failures / 0 skipped** |
| `npm run verify:secrets` | PASS | Client Componentの秘密値境界を29ファイルで確認 |
| `npm run verify:repo-secrets` | PASS | 既知の秘密値形状を検出せず |
| `npm run verify:docs` | PASS | 3文書の未解決マーカーなし |
| `npm run typecheck` | PASS | 実パッケージ型で成功 |
| `npm run lint` | PASS相当 | 0 errors / 1 non-blocking warning |
| `npm run build` | PASS | Next.js 16.2.11 webpack、5静的ページ生成 |
| `npm run verify` | **PASS** | unit → secrets → repo secrets → docs → typecheck → lint → build |
| `npx playwright install chromium` | PASS | Chromium、Headless Shell、FFmpegを取得 |
| `npm run test:e2e` | **PASS** | **6 tests / 0 failures** |
| 画面撮影スクリプト | PASS | 4状態 × 2解像度 = 8枚 |

lintに残る1件は、`features/dashboard/dashboard-header.tsx` の既存`<img>`に対する `@next/next/no-img-element` 警告です。画像最適化へ切り替えると表示挙動が変わるため、今回のデザイン移植範囲では変更していません。lintエラーは0件です。

## E2Eで確認した操作

1. `old-tools/terminal-notes` を検索して選択
2. JSONバックアップをダウンロード
3. `UNSTAR 1` を完全一致で入力
4. 対象行が消える
5. 10分Undoで対象行が戻る
6. `archive` 検索で成功1件・失敗1件の部分成功になる
7. 成功行だけ消え、失敗行だけ選択状態で残る
8. ダイアログ再表示時に確認文字列が空へ戻る
9. 初期フォーカスが「JSONを保存」になる
10. Tab / Shift+Tabがダイアログ内を循環する
11. Escape、閉じる、キャンセルが機能する
12. 背景クリックではダイアログが閉じない

## レスポンシブ・目視検証

### Desktop 1440×1000

| 計測 | 値 |
|---|---:|
| 横方向overflow | 0px |
| 最終行下端 | 859.97px |
| 固定アクションバー上端 | 900px |
| 最終行との余白 | 40.03px |
| 入力前ダイアログ | 660 × 562.67px |
| 入力後ダイアログ | 660 × 608.55px |

### Mobile 390×844

| 計測 | 値 |
|---|---:|
| 横方向overflow | 0px |
| 最終行下端 | 587.70px |
| 固定アクションバー上端 | 662.81px |
| 最終行との余白 | 75.11px |
| 入力前ダイアログ | 342 × 673.44px |
| 入力後ダイアログ | 342 × 733.25px |

両解像度で、ダイアログ全体がビューポート内に収まり、コンソールエラーは0件でした。Mobileの下余白は `calc(256px + env(safe-area-inset-bottom))` を維持しています。

## デザイン移植で追加した回帰テスト

- 既存`:root`へ提案トークンを追加し、並行する変数系統を作らないこと
- 理由チップを配点で100点以上・40〜99点・39点以下へ分類すること
- 台帳のリポジトリ・理由・スコア領域とスコア構成を維持すること
- 確認ダイアログを2段階で表示し、背景クリックで閉じないこと
- Mobileの3カラム台帳と固定アクションバー用下余白を維持すること
- E2EがDesktop 1440×1000とMobile 390×844を対象にすること

## 依存関係監査

`npm audit`は3件のhigh severityを報告しました。いずれも現在の依存ツリー内のアドバイザリで、npmが提示する自動修正はNext.jsを破壊的にダウングレードする内容でした。MVPの挙動・不変条件を壊すため、`npm audit fix --force`は実行していません。監査結果JSONは検証証跡に保存しています。

## 未実施・外部条件

- 実GitHub AppのClient ID、Client Secret、Session Secretを使ったライブOAuth接続
- 実GitHubアカウントに対する解除・Undo
- Chromium以外のブラウザ
- GitHub Enterprise Server

ライブ認証以外のデモ操作、API・OAuth・暗号化・入力境界は単体テストとE2Eで確認しています。

## 成果物から除外するもの

- `node_modules/`
- `.test-build/`
- `.next/`
- `ci-artifacts/`
- `playwright-report/`
- `test-results/`
- `*.tsbuildinfo`
- `.env*`（`.env.example`を除く）
