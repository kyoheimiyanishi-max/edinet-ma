import { NextResponse } from "next/server";
import {
  getCompany,
  getCompanyFinancials,
  getCompanyOfficers,
  EdinetApiError,
} from "@/lib/edinetdb";
import { parseCompanyId } from "@/lib/unified-company";
import { csvResponse, toCsv, type CsvCell } from "@/lib/csv";

export const runtime = "nodejs";

interface Ctx {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/companies/[id]/export
 *
 * EDINET 提出企業の 全期分財務履歴 + 役員リスト を 1 ファイルに CSV 出力する。
 * id は EDINETコード (E+5桁) または 法人番号 (13桁) を受け付ける。
 */
export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const parsed = parseCompanyId(id);
  if (!parsed)
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  const edinetCode =
    parsed.kind === "edinet" ? parsed.edinetCode : parsed.edinetCode;
  if (!edinetCode) {
    return NextResponse.json(
      { error: "EDINET 未登録の企業は財務 CSV 出力の対象外です" },
      { status: 404 },
    );
  }

  try {
    const [company, financials, officers] = await Promise.all([
      getCompany(edinetCode),
      getCompanyFinancials(edinetCode),
      getCompanyOfficers(edinetCode).catch(() => []),
    ]);

    const sections: CsvCell[][] = [];
    // ヘッダ (企業メタ)
    sections.push([
      "企業名",
      "EDINETコード",
      "証券コード",
      "業種",
      "信用格付",
      "信用スコア",
      "出力日時",
    ]);
    sections.push([
      company.name,
      company.edinet_code,
      company.sec_code?.replace(/0$/, "") ?? "",
      company.industry ?? "",
      company.credit_rating ?? "",
      company.credit_score ?? "",
      new Date().toISOString(),
    ]);
    sections.push([]);

    // 財務履歴 (1期 = 1行)
    sections.push(["== 財務履歴 =="]);
    sections.push([
      "FY",
      "売上",
      "営業利益",
      "純利益",
      "総資産",
      "純資産",
      "現預金",
      "自己資本比率",
      "EPS",
      "BPS",
      "ROE",
      "ROA",
      "時価総額",
      "平均年収",
    ]);
    const sortedFin = [...financials].sort(
      (a, b) => a.fiscal_year - b.fiscal_year,
    );
    if (sortedFin.length === 0) {
      sections.push(["(財務データなし)"]);
    } else {
      for (const f of sortedFin) {
        sections.push([
          f.fiscal_year,
          f.revenue ?? "",
          f.operating_income ?? "",
          f.net_income ?? "",
          f.total_assets ?? "",
          f.equity ?? "",
          f.cash ?? "",
          f.equity_ratio_official ?? "",
          f.eps ?? "",
          f.bps ?? "",
          f.roe ?? "",
          f.roa ?? "",
          f.market_cap ?? "",
          f.avg_annual_salary ?? "",
        ]);
      }
    }
    sections.push([]);

    // 役員一覧
    if (officers.length > 0) {
      sections.push(["== 役員一覧 =="]);
      sections.push([
        "氏名",
        "役職",
        "生年月日",
        "保有株数",
        "社外",
        "代表",
        "経歴",
      ]);
      for (const o of officers) {
        sections.push([
          o.name,
          o.position,
          o.birth_date ?? "",
          o.shares_held ?? "",
          o.is_outside ? "○" : "",
          o.is_representative ? "○" : "",
          o.career ?? "",
        ]);
      }
    }

    const filename = `${company.name}_財務_${company.edinet_code}.csv`;
    return csvResponse(toCsv(sections), filename);
  } catch (e) {
    if (e instanceof EdinetApiError) {
      return NextResponse.json(
        { error: e.message },
        { status: e.status ?? 500 },
      );
    }
    console.error("[companies/export]", e);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
