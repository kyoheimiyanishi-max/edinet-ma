-- 各アライアンステーブルに contact_status カラムを追加
--
-- d6e-api は executeSql 経由の DDL を拒否 (DDL_FORBIDDEN) するため、
-- このファイルは d6e 運営 (DDL 権限保有者) に依頼して実行してもらう。
-- 実テーブル名は workspace prefix が付く:
--   user_data.ws_<workspace_id>_<table>
--
-- contact_status: アライアンス先との接点状況
--   'none'          — 未接触
--   'contacted'     — 接触済
--   'in_discussion' — 商談中
--   'partnered'     — 提携中
--   'declined'      — 見送り

ALTER TABLE tax_advisors
  ADD COLUMN IF NOT EXISTS contact_status text NOT NULL DEFAULT 'none';

ALTER TABLE banks
  ADD COLUMN IF NOT EXISTS contact_status text NOT NULL DEFAULT 'none';

ALTER TABLE ma_advisors
  ADD COLUMN IF NOT EXISTS contact_status text NOT NULL DEFAULT 'none';

ALTER TABLE financial_planners
  ADD COLUMN IF NOT EXISTS contact_status text NOT NULL DEFAULT 'none';
