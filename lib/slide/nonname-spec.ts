import type { Seller } from "@/lib/sellers";

/**
 * Seller (d6e) → ノンネーム資料 spec JSON に変換する。
 *
 * 出力は `slide/slide_generator.py` のスペック仕様に準拠:
 *   - cover      : 表紙
 *   - content #1 : 案件サマリ (KPI 4 枠 + 希望条件 callout)
 *   - content #2 : 基本情報テーブル
 *   - content #3 : 事業概要・強み・売却理由
 *
 * ## 匿名化ルール
 * - 会社名は本編に一切出さず "A 社（{業種}・{県}）" で置換
 * - 県より細かい所在地 / 住所 / URL / 担当者 / 紹介元 は常に非表示
 * - 本文中に `seller.companyName` が含まれていたら "当社" に置換
 *   (全角/半角スペース, "株式会社" の有無揺れも吸収)
 */

export interface NonnameSpec {
  title_short: string;
  slides: unknown[];
}

/** 社名の本文マスク用ルート表現を取り出す (株式会社等を外す) */
function baseNameForMask(name: string): string[] {
  const trimmed = name.trim();
  const variants = new Set<string>();
  if (trimmed) variants.add(trimmed);
  // 会社種別を剥がしたコア名も対象にする
  const stripped = trimmed
    .replace(/株式会社|有限会社|合同会社|合資会社|合名会社/g, "")
    .replace(/[\s　]/g, "")
    .trim();
  if (stripped && stripped !== trimmed) variants.add(stripped);
  return [...variants].filter((v) => v.length >= 2); // 1 文字置換は誤爆するので除外
}

function maskCompanyName(text: string, companyName: string): string {
  if (!text) return "";
  let out = text;
  for (const variant of baseNameForMask(companyName)) {
    // 正規表現特殊文字エスケープ
    const esc = variant.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    out = out.replace(new RegExp(esc, "g"), "当社");
  }
  return out;
}

function aliasName(seller: Seller): string {
  const parts: string[] = [];
  if (seller.industry) parts.push(seller.industry);
  if (seller.prefecture) parts.push(seller.prefecture);
  const suffix = parts.length > 0 ? `（${parts.join("・")}）` : "";
  return `A 社${suffix}`;
}

function formatFoundedYear(year?: number): string {
  if (!year || !Number.isFinite(year)) return "—";
  return `${year}年`;
}

function orDash(v: string | undefined | null): string {
  return v && v.trim() !== "" ? v : "—";
}

/**
 * KPI 4 枠: 売上 / 営業利益 / 従業員 / 譲渡希望価格
 * いずれも freeform レンジ文字列 (未入力は "—")
 */
function kpiRow(seller: Seller) {
  return {
    type: "kpi_row" as const,
    items: [
      { value: orDash(seller.revenueRange), unit: "", label: "売上高レンジ" },
      {
        value: orDash(seller.operatingProfitRange),
        unit: "",
        label: "営業利益レンジ",
      },
      { value: orDash(seller.employeeRange), unit: "", label: "従業員数" },
      { value: orDash(seller.targetPrice), unit: "", label: "譲渡希望価格" },
    ],
  };
}

function summarySlide(seller: Seller) {
  const blocks: unknown[] = [kpiRow(seller)];
  if (seller.desiredTerms) {
    blocks.push({
      type: "callout",
      content: `希望条件: ${maskCompanyName(seller.desiredTerms, seller.companyName)}`,
    });
  }
  return {
    type: "content" as const,
    title: "案件サマリー",
    subtitle: aliasName(seller),
    blocks,
  };
}

function basicInfoSlide(seller: Seller) {
  return {
    type: "content" as const,
    title: "基本情報",
    subtitle: aliasName(seller),
    blocks: [
      {
        type: "table",
        headers: ["項目", "内容"],
        rows: [
          ["業種", orDash(seller.industry)],
          ["所在地", orDash(seller.prefecture)],
          ["設立", formatFoundedYear(seller.foundedYear)],
          ["譲渡スキーム", orDash(seller.mediatorType)],
          ["希望時期", orDash(seller.saleSchedule ?? seller.closeDate)],
          ["譲渡希望価格", orDash(seller.targetPrice)],
        ],
      },
    ],
  };
}

function businessSlide(seller: Seller) {
  const description = maskCompanyName(
    seller.description || seller.profile || "",
    seller.companyName,
  );
  const strengths = maskCompanyName(seller.strengths ?? "", seller.companyName);
  const saleReason = maskCompanyName(
    seller.saleReason ?? "",
    seller.companyName,
  );

  const blocks: unknown[] = [];
  if (description) {
    blocks.push({
      type: "text",
      content: `【事業概要】${description}`,
      height: 1.2,
    });
  }
  if (strengths) {
    // 改行区切りで入力されていれば bullets に、そうでなければ text で表示
    const lines = strengths
      .split(/[\n・]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    if (lines.length >= 2) {
      blocks.push({ type: "bullets", heading: "強み・特色", items: lines });
    } else {
      blocks.push({
        type: "text",
        content: `【強み】${strengths}`,
        height: 0.8,
      });
    }
  }
  if (saleReason) {
    blocks.push({
      type: "callout",
      content: `売却理由: ${saleReason}`,
      height: 0.6,
    });
  }
  if (blocks.length === 0) {
    blocks.push({
      type: "text",
      content: "事業概要・強み・売却理由は追ってご提示いたします。",
      height: 0.6,
    });
  }
  return {
    type: "content" as const,
    title: "事業概要と譲渡背景",
    subtitle: aliasName(seller),
    blocks,
  };
}

function coverSlide(seller: Seller, today: string) {
  return {
    type: "cover" as const,
    eyebrow: "Non-Name Sheet",
    title: "ノンネーム資料",
    subtitle: aliasName(seller),
    date: `作成日：${today}`,
  };
}

function todayJp(): string {
  const d = new Date();
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

export function buildNonnameSpec(
  seller: Seller,
  options?: { date?: string },
): NonnameSpec {
  const date = options?.date ?? todayJp();
  return {
    title_short: `ノンネーム｜${aliasName(seller)}`,
    slides: [
      coverSlide(seller, date),
      summarySlide(seller),
      basicInfoSlide(seller),
      businessSlide(seller),
    ],
  };
}
