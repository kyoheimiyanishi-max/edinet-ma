/**
 * 各データセット (ma-advisors / banks / tax-advisors / financial-planners /
 * people / communities) に入っている gBizINFO 法人プロフィールへの外部リンク
 *   https://info.gbiz.go.jp/hojin/ichiran?hojinBangou=XXXXXXXXXXXXX
 * は gBizINFO 側のルーティングが POST ベースに変更されたため GET で開くと
 * 「法人番号は13桁数値で入力してください」エラー画面になる。
 *
 * このヘルパーはそのパターンを検出して内部 `/company/{法人番号}` ルートに
 * 書き換える。`/company/[id]` は 13 桁法人番号を受け付け、EDINET 未登録なら
 * `/startups/[corporate_number]` に自動リダイレクトする。
 */

const GBIZ_ICHIRAN_RE =
  /^https?:\/\/info\.gbiz\.go\.jp\/hojin\/ichiran\?hojinBangou=(\d{13})\b/;

export interface NormalizedCompanyUrl {
  href: string;
  isInternal: boolean;
}

export function normalizeCompanyLookupUrl(url: string): NormalizedCompanyUrl {
  const match = GBIZ_ICHIRAN_RE.exec(url);
  if (match) {
    return { href: `/company/${match[1]}`, isInternal: true };
  }
  return { href: url, isInternal: false };
}
