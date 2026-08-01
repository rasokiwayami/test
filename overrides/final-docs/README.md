# Star Janitor

GitHubでスターしたリポジトリを、**理由付き・バックアップ必須・Undo可能**な手順で整理するNext.jsアプリです。

アーカイブ、無効化、保守終了・移転を示す説明文、最終pushからの経過年数、古いスターを決定論的に採点します。自動削除は行わず、ユーザーが選択したリポジトリだけを解除します。

## MVPでできること

- GitHub Appのユーザー認証でスターを取得
- 最大2,000件まで完全ページング（環境変数で変更可能）
- 判定理由と加点を各リポジトリに表示
- 名前・所有者・説明・言語・Topics・理由で検索
- 危険度と日時による絞り込み・並べ替え
- 選択対象のバージョン付きJSONバックアップ
- `UNSTAR <件数>` の明示入力後にだけ一括解除
- 1操作100件、GitHubへの同時リクエスト2件
- スキャンと解除・Undoを排他し、古いスキャン結果の競合反映を防止
- 成功・失敗をリポジトリ単位で集約
- 成功分だけを10分以内にUndo
- GitHub設定なしで全操作を試せるデモ

## セキュリティ境界

- OAuth AppやPersonal Access Tokenではなく、GitHub Appのユーザーアクセストークンを使用します。
- 要求するユーザー権限は `Starring: Read and write` だけです。MVPはREADMEを読まないため、`Contents` 権限を要求しません。
- アクセストークンと更新トークンは、AES-256-GCMで暗号化したHTTP-only Cookieにのみ保存します。
- トークンをReact props、JSON API、ログ、Local Storageへ渡しません。
- 解除・復元は、セッション、Origin、CSRF、JSON形式、100件上限の順に検証します。
- Undo情報は暗号化され、GitHubユーザーIDに束縛され、10分で失効します。
- データベース、バックグラウンド処理、解析SDKはありません。

詳細は [`docs/setup-github-app.md`](docs/setup-github-app.md) を参照してください。

## 必要環境

- Node.js 22以上
- npm 10以上
- GitHub App（ライブモードのみ）

依存バージョンは `package.json` に固定しています。

- Next.js 16.2.11
- React / React DOM 19.2.8
- TypeScript 5.9.3
- Playwright 1.62.0

## 起動

```bash
npm install
cp .env.example .env.local
openssl rand -base64 32
# 出力を SESSION_SECRET に設定
npm run dev
```

ブラウザで `http://localhost:3000` を開きます。GitHub App未設定でも `/demo` は動作します。

## 環境変数

```dotenv
APP_URL=http://localhost:3000
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
SESSION_SECRET=
GITHUB_API_VERSION=2026-03-10
MAX_STARRED_REPOSITORIES=2000
```

`SESSION_SECRET` はBase64デコード後にちょうど32バイトである必要があります。

## コマンド

```bash
npm run dev              # 開発サーバー
npm run build            # 本番ビルド
npm run start            # 本番サーバー
npm run test:unit        # 純粋TypeScriptモジュールの単体テスト
npm run test:e2e         # デモの解除・バックアップ・Undo
npm run typecheck        # TypeScript
npm run lint             # ESLint / Next.jsルール
npm run verify:secrets   # Client Componentへの秘密漏えい検査
npm run verify:repo-secrets # 成果物内の秘密値形状を検査
npm run verify:docs      # 設計・計画の未解決マーカー検査
npm run verify           # unit → client secret → repo secret → docs → typecheck → lint → build
```

## アーキテクチャ

```text
GitHub App OAuth
  └─ encrypted HTTP-only session cookie
       ├─ GET /api/scan
       │    └─ GitHub REST pagination → deterministic scoring
       ├─ POST /api/unstar
       │    └─ Origin + CSRF + validation → bounded DELETE workers
       │         └─ account-bound encrypted 10-minute undo token
       └─ POST /api/star
            └─ undo verification → bounded PUT workers

React dashboard
  ├─ typed live API adapter
  ├─ stateful demo adapter with the same contracts
  ├─ filter / selection / backup workflow
  └─ focused accessible components
```

### 主要な責務

- `lib/scoring/`: 判定ルール。ネットワーク・UIに依存しません。
- `lib/github/`: REST通信、ページング、Star/Unstarの集約。
- `lib/auth/`, `lib/security/`: OAuth、暗号化Cookie、CSRF、Origin。
- `lib/client/`: UIが利用するライブ・デモ共通API。
- `features/dashboard/`: 状態管理と画面部品。
- `styles/`: 基礎UI、ランディング、ダッシュボード、ダイアログ、レスポンシブ規則。
- `app/api/`: サーバー境界。秘密値はここよりクライアント側へ出ません。

## 判定ルール

| シグナル | 点数 |
|---|---:|
| GitHubで無効化 | 120 |
| アーカイブ済み | 100 |
| 保守終了・非推奨の表現 | 55 |
| 移転・後継の表現 | 40 |
| 最終pushから3年以上 | 50 |
| 最終pushから2年以上 | 35 |
| 最終pushから1年以上 | 15 |
| 3年以上前のスターかつ2年以上停止 | 15 |

危険度は `100以上: high`、`50以上: medium`、`20以上: low`、それ未満を `healthy` とします。スコアは自動削除の判断には使用しません。

## バックアップ形式

`schemaVersion: 1` のJSONです。アカウントの公開情報、選択したリポジトリの公開メタデータ、スコア、理由だけを明示的にコピーします。認証情報や内部セッション値は含みません。

## 現在の制約

- README本文は読みません。説明文とTopicsだけを判定対象にします。
- 後継リポジトリの自動探索はしません。
- スター数が取得上限を超える場合は、画面に打ち切りを表示します。
- Undoは10分間の一時的な安全網であり、永続履歴ではありません。
- GitHub APIの権限、Rate Limit、削除済みリポジトリなどにより部分失敗する場合があります。
- GitHub Enterprise Serverには未対応です。

## プロジェクト資料

- 設計: `docs/superpowers/specs/2026-07-31-star-janitor-design.md`
- MVP実装計画: `docs/superpowers/plans/2026-07-31-star-janitor-mvp.md`
- ダッシュボードデザイン移植計画: `docs/superpowers/plans/2026-08-01-star-janitor-design-port.md`
- GitHub App設定: `docs/setup-github-app.md`
- 検証記録: `docs/verification.md`
- Codex引き継ぎ: `CODEX_HANDOFF.md`
