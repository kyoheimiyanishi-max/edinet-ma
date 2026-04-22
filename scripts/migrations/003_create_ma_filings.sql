-- ma_filings: EDINET 臨時報告書 (docTypeCode=180) から抽出した M&A 関連イベント
--
-- d6e-api は executeSql 経由の DDL を拒否 (DDL_FORBIDDEN) するため、
-- このファイルは d6e 運営 (DDL 権限保有者) に依頼して実行してもらう。
-- 実テーブル名は workspace prefix が付く:
--   user_data.ws_<workspace_id>_ma_filings
--
-- 設計意図:
--   ma_deals はニュース起点の M&A 履歴 (買手/売手が明確)。
--   ma_filings は EDINET 提出書類起点の M&A 履歴 (網羅性はこちらが圧倒的に高い)。
--   両者は /api/ma-ranking で UNION して企業別カウント集計される。
--
-- event_type: 臨時報告書の提出事由 (5 分類)
--   'stock_acquisition'   — 特定子会社の異動(株式取得)
--   'merger'              — 合併
--   'split'               — 会社分割 (吸収分割/新設分割)
--   'business_transfer'   — 事業譲渡 / 事業譲受
--   'tob'                 — 公開買付 (TOB)
--   'other'               — 上記に分類できない M&A 関連事由 (分析用)

CREATE TABLE IF NOT EXISTS ma_filings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- EDINET 書類の一意 ID。upsert の自然キー
  doc_id text NOT NULL,

  -- 書類提出日
  submit_date date NOT NULL,

  -- 提出会社 (M&A の主体者)
  filer_edinet_code text,
  filer_sec_code text,
  filer_name text NOT NULL,

  -- M&A 事由分類
  event_type text NOT NULL,

  -- 相手方社名 (CSV から抽出できた場合のみ。best-effort)
  counterparty_name text,

  -- 書類タイトル / 提出事由原文 (分類のトレーサビリティ用)
  doc_description text,

  -- 情報源の区別 ('edinet' 固定。ma_deals と UNION する際のタグ)
  source text NOT NULL DEFAULT 'edinet',

  -- EDINET 書類詳細ページ URL (disclosure2.edinet-fsa.go.jp)
  raw_doc_url text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT ma_filings_doc_id_uniq UNIQUE (doc_id),
  CONSTRAINT ma_filings_event_type_chk CHECK (
    event_type IN (
      'stock_acquisition',
      'merger',
      'split',
      'business_transfer',
      'tob',
      'other'
    )
  ),
  CONSTRAINT ma_filings_source_chk CHECK (source IN ('edinet', 'news'))
);

-- 企業別・年別集計でヒットさせるための複合インデックス
CREATE INDEX IF NOT EXISTS ma_filings_filer_submit_idx
  ON ma_filings (filer_edinet_code, submit_date DESC);

CREATE INDEX IF NOT EXISTS ma_filings_filer_name_idx
  ON ma_filings (filer_name);

CREATE INDEX IF NOT EXISTS ma_filings_submit_date_idx
  ON ma_filings (submit_date DESC);

CREATE INDEX IF NOT EXISTS ma_filings_event_type_idx
  ON ma_filings (event_type);
