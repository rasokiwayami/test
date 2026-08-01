# Codex Handoff — Star Janitor

このリポジトリは、GitHubでスターしたリポジトリを説明可能なルールで採点し、JSONバックアップ後にだけ解除し、成功分を10分以内に復元できるNext.js MVPです。

## Codexへそのまま貼る指示

```text
このリポジトリのStar Janitor MVPを完成検証してください。

最初に以下を読んでください。
- README.md
- docs/superpowers/specs/2026-07-31-star-janitor-design.md
- docs/superpowers/plans/2026-07-31-star-janitor-mvp.md
- docs/superpowers/plans/2026-08-01-star-janitor-design-port.md
- docs/verification.md
- docs/setup-github-app.md

実装済みコードを尊重し、不要な再設計や機能追加は行わないでください。次の不変条件を維持してください。

1. GitHub Appのユーザー権限は Starring: read/write だけ。Contents、Issues、Administration等を追加しない。
2. access token / refresh token / client secretをClient Component、React props、APIレスポンス、Local Storage、ログへ出さない。
3. セッションとUndoはAES-256-GCMで目的別に暗号化する。
4. POST /api/unstar と POST /api/star は、セッション→Origin→CSRF→32KiB JSON上限→構造検証の順で防御する。
5. 解除は1回100件以下、GitHub同時リクエスト2件。部分成功を保持する。
6. 解除前のJSONバックアップと `UNSTAR <件数>` の完全一致入力を必須にする。
7. Undoは成功分だけ、GitHub user IDに束縛し、10分で失効させる。
8. GitHubや予期しない例外の生本文・トークンらしき文字列を利用者向けエラーへ出さない。
9. スコアは候補の並び替えだけに使い、自動解除しない。
10. /demo はGitHub認証なしで、スキャン、検索、選択、バックアップ、部分失敗、解除、Undoを操作可能に保つ。
11. スキャンと解除・Undoは同時実行させず、UIと操作ゲートの両方で排他する。

作業手順:
1. Node.js 22系とnpm 10系を使用する。
2. `npm install` を実行し、package-lock.jsonを生成する。
3. `npm run test:unit` を実行する。現時点の期待値は84 tests, 0 failures。
4. `npm run verify:secrets`、`npm run verify:repo-secrets`、`npm run verify:docs` を実行する。
5. `npm run typecheck`、`npm run lint`、`npm run build` を実行し、実パッケージ型で生じる問題だけを最小修正する。
6. `npx playwright install chromium` の後、`npm run test:e2e` を実行する。
7. /demo を1440×1000、390×844で目視確認する。横スクロール、文字切れ、固定アクションバーによる遮蔽、ダイアログのフォーカストラップを確認する。
8. E2Eで次を確認する。
   - old-tools/terminal-notesを検索・選択
   - JSONダウンロード
   - UNSTAR 1入力
   - 行が消える
   - 10分Undoで戻る
   - archive検索で成功1件・失敗1件の部分成功になり、失敗行だけ選択状態で残る
9. 変更が必要だった場合は、失敗を再現するテストを先に追加してから最小修正する。
10. 最後に `npm run verify && npm run test:e2e` を再実行し、実行結果、変更ファイル、残存制約を報告する。

禁止:
- PAT入力欄を追加しない。
- OAuthトークンをブラウザストレージへ保存しない。
- README取得やAI分類をMVPへ追加しない。
- DB、課金、定期実行、解析SDKを追加しない。
- Undoを永続履歴に変更しない。
- 解除を自動実行しない。
```

## 重要な実装位置

| 責務 | ファイル |
|---|---|
| 判定スコア | `lib/scoring/score-repository.ts` |
| GitHub REST境界 | `lib/github/client.ts` |
| スター全件取得 | `lib/github/stars.ts` |
| 解除・復元・部分成功 | `lib/github/mutations.ts` |
| OAuthと更新 | `lib/auth/oauth.ts`, `lib/auth/session.ts` |
| 暗号化Cookie | `lib/security/seal.ts`, `lib/auth/session-token.ts` |
| CSRF / Origin | `lib/security/csrf.ts`, `lib/security/origin.ts` |
| Undo | `lib/undo/token.ts` |
| HTTP入力上限 | `lib/util/response.ts` |
| ダッシュボード状態 | `features/dashboard/use-dashboard.ts` |
| 確認ダイアログ | `features/dashboard/confirmation-dialog.tsx` |
| ライブ・デモAPI | `lib/client/api.ts`, `lib/client/demo-api.ts` |
| デモE2E | `tests/e2e/demo.spec.ts` |

## 最新の検証基準線

2026年8月1日にNode.js 22.23.1 / npm 10.9.8で実依存を取得し、以下を確認済みです。

- `npm run verify`: PASS
- 単体テスト: 84 tests / 0 failures / 0 skipped
- lint: 0 errors / 1既知warning
- Next.js 16.2.11 webpack build: PASS
- Playwright E2E: 6 tests / 0 failures
- 1440×1000、390×844: 横overflow 0px、固定アクションバー遮蔽なし
- 確認ダイアログ: 初期フォーカス、フォーカストラップ、入力リセット、背景非dismissを確認

再作業時は、この基準線を下回らないこと。詳細な計測値と残存制約は `docs/verification.md` にあります。
