-- seller_documents をファイル参照対応に拡張
--
-- d6e-api は executeSql 経由の DDL を拒否 (DDL_FORBIDDEN) するため、
-- このファイルは d6e 運営 (DDL 権限保有者) に依頼して実行してもらう。
-- 実テーブル名は workspace prefix が付く:
--   user_data.ws_<workspace_id>_seller_documents
--
-- 背景:
--   seller_documents は元々 title + content (テキスト) を想定。
--   ノンネーム .pptx のようにバイナリを d6e /files に保存する場合、
--   生成物の storage_file.id を参照するカラムを追加する。
--
--   - storage_file_id が NULL:   従来のテキストメモ
--   - storage_file_id が non-NULL: 対応する storage_file の参照
--                                  (content はメタ的な短い説明 or 空)
--
-- storage_file は d6e 内部テーブルでワークスペース共通スキーマ。
-- Row-Level Security により自 workspace の storage_file のみ参照可能。
-- FK を張らない理由: storage_file は user_data 外の内部テーブルで
-- workspace prefix も付かないため、user_data 配下のカラムから FK で
-- 縛ると d6e のテーブルレジストリが壊れるケースがある。参照整合性は
-- アプリケーション層で保証する (削除時の cascade は soft delete で対応)。

ALTER TABLE seller_documents
  ADD COLUMN IF NOT EXISTS storage_file_id uuid;

CREATE INDEX IF NOT EXISTS seller_documents_storage_file_id_idx
  ON seller_documents (storage_file_id)
  WHERE storage_file_id IS NOT NULL;
