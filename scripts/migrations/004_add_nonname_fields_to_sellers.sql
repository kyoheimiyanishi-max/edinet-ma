-- sellers テーブルに ノンネーム資料 (blind profile / teaser) 用カラムを追加
--
-- d6e-api は executeSql 経由の DDL を拒否 (DDL_FORBIDDEN) するため、
-- このファイルは d6e 運営 (DDL 権限保有者) に依頼して実行してもらう。
-- 実テーブル名は workspace prefix が付く:
--   user_data.ws_<workspace_id>_sellers
--
-- 追加カラムはすべて NULL 可 (既存行を壊さない、入力任意)。
-- freeform TEXT で持つ理由: 売上 "5〜10億円" のような人手レンジ表記を
-- そのまま載せたいため (数値化は将来検討)。
--
--   revenue_range           売上高レンジ        例: "5〜10億円"
--   operating_profit_range  営業利益レンジ      例: "5,000万〜1億円"
--   employee_range          従業員数レンジ      例: "30〜50名"
--   founded_year            設立年 (西暦)       例: 2008
--   sale_reason             売却理由            例: "後継者不在・事業承継"
--   strengths               強み・特色          例: "大手との直接取引、独自技術..."

ALTER TABLE sellers
  ADD COLUMN IF NOT EXISTS revenue_range text,
  ADD COLUMN IF NOT EXISTS operating_profit_range text,
  ADD COLUMN IF NOT EXISTS employee_range text,
  ADD COLUMN IF NOT EXISTS founded_year integer,
  ADD COLUMN IF NOT EXISTS sale_reason text,
  ADD COLUMN IF NOT EXISTS strengths text;
