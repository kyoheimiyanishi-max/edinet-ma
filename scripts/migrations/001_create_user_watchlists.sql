-- user_watchlists: ユーザー別の注目企業ブックマーク + 財務スナップショット
--
-- d6e-api は executeSql 経由の DDL を拒否 (DDL_FORBIDDEN) するため、
-- このファイルは d6e 運営 (DDL 権限保有者) に依頼して実行してもらう。
-- 実テーブル名は workspace prefix が付く:
--   user_data.ws_<workspace_id>_user_watchlists
--
-- 列:
--   company_id  — companies.id への FK (UUID)
--   user_email  — セッションの email をキーに持たせる (UNIQUE 制約で 1件に正規化)
--   last_seen_* — 一覧を表示/閲覧したときの財務値を保存し、
--                 次回アクセス時に EDINET 最新値との差分から「新着」を判定する
CREATE TABLE IF NOT EXISTS user_watchlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email text NOT NULL,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  note text,
  added_at timestamptz NOT NULL DEFAULT now(),
  last_viewed_at timestamptz,

  -- 最後に閲覧した時点の財務スナップショット (新着判定の基準値)
  last_seen_fiscal_year integer,
  last_seen_revenue bigint,           -- 売上 (円)
  last_seen_operating_income bigint,  -- 営業利益 (円)
  last_seen_net_income bigint,        -- 純利益 (円)
  last_seen_equity bigint,            -- 純資産 (円)

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT user_watchlists_user_company_uniq UNIQUE (user_email, company_id)
);

CREATE INDEX IF NOT EXISTS user_watchlists_user_email_idx
  ON user_watchlists (user_email);

CREATE INDEX IF NOT EXISTS user_watchlists_company_id_idx
  ON user_watchlists (company_id);
