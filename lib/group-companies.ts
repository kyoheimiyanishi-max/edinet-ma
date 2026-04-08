import { unstable_cache } from "next/cache";
import { createHash } from "crypto";
import { generateText, Output } from "ai";
import { getModel } from "@/lib/ai-model";
import { z } from "zod";
import type { WikidataInfo } from "./enrich";

// ---- Types ----

export type GroupRelation = "parent" | "subsidiary" | "affiliate";

export interface GroupCompany {
  name: string;
  relation: GroupRelation;
  ownershipPct?: number;
  description?: string;
  sources: string[];
}

// ---- Zod schema for AI extraction ----

const ExtractSchema = z.object({
  companies: z
    .array(
      z.object({
        name: z.string().describe("企業名（株式会社等を含む正式名称）"),
        relation: z
          .enum(["parent", "subsidiary", "affiliate"])
          .describe(
            "parent=親会社, subsidiary=子会社, affiliate=関連会社・グループ会社",
          ),
        ownershipPct: z
          .number()
          .optional()
          .describe("出資比率（0-100%）、記載がなければ省略"),
        description: z
          .string()
          .optional()
          .describe("補足（事業内容など、記載があれば）"),
      }),
    )
    .default([]),
});

// ---- Source 1: Wikidata ----

export function fromWikidata(wd: WikidataInfo): GroupCompany[] {
  const out: GroupCompany[] = [];
  if (wd.parentCompany) {
    out.push({
      name: wd.parentCompany,
      relation: "parent",
      sources: ["Wikidata"],
    });
  }
  if (wd.parentOrg && wd.parentOrg !== wd.parentCompany) {
    out.push({
      name: wd.parentOrg,
      relation: "parent",
      sources: ["Wikidata"],
    });
  }
  for (const name of wd.subsidiaries || []) {
    out.push({ name, relation: "subsidiary", sources: ["Wikidata"] });
  }
  for (const name of wd.ownedCompanies || []) {
    out.push({ name, relation: "affiliate", sources: ["Wikidata"] });
  }
  return out;
}

// ---- Source 2: Wikipedia full-page text ----

async function fetchWikipediaFullText(companyName: string): Promise<string> {
  try {
    const q = encodeURIComponent(companyName);
    const searchUrl = `https://ja.wikipedia.org/w/api.php?action=query&list=search&srsearch=${q}&srlimit=1&format=json&utf8=1&origin=*`;
    const searchRes = await fetch(searchUrl, { next: { revalidate: 86400 } });
    if (!searchRes.ok) return "";
    const searchData = await searchRes.json();
    const results = searchData?.query?.search || [];
    if (results.length === 0) return "";

    const title = results[0].title as string;
    const titleEnc = encodeURIComponent(title);
    // Full page plaintext (no exintro)
    const extractUrl = `https://ja.wikipedia.org/w/api.php?action=query&prop=extracts&explaintext=1&titles=${titleEnc}&format=json&utf8=1&origin=*`;
    const extractRes = await fetch(extractUrl, {
      next: { revalidate: 86400 },
    });
    if (!extractRes.ok) return "";
    const data = await extractRes.json();
    const pages = data?.query?.pages || {};
    const first = Object.values(pages)[0] as { extract?: string } | undefined;
    return first?.extract || "";
  } catch {
    return "";
  }
}

// ---- Source 3: EDINET filing text block ----
// Attempt edinetdb.jp subsidiary endpoint (if available),
// falling back to no-op on failure.

async function fetchEdinetSubsidiaryText(edinetCode: string): Promise<string> {
  try {
    const key = process.env.EDINET_API_KEY;
    if (!key) return "";
    const res = await fetch(
      `https://edinetdb.jp/v1/companies/${edinetCode}/subsidiaries`,
      {
        headers: { "X-API-Key": key },
        next: { revalidate: 86400 },
      },
    );
    if (!res.ok) return "";
    const data = await res.json();
    // Try a few common shapes
    if (typeof data === "string") return data;
    if (data?.text) return String(data.text);
    if (Array.isArray(data?.data)) {
      return data.data
        .map(
          (d: Record<string, unknown>) =>
            `${d.name ?? ""} ${d.relation ?? ""} ${d.ownership_ratio ?? ""}`,
        )
        .join("\n");
    }
    return "";
  } catch {
    return "";
  }
}

// ---- AI extraction ----

/** Inner extractor (uncached) */
async function extractCompaniesUncached(
  sourceLabel: string,
  targetCompanyName: string,
  focused: string,
): Promise<GroupCompany[]> {
  try {
    const result = await generateText({
      model: getModel("sonnet"),
      output: Output.object({ schema: ExtractSchema }),
      system: `あなたは企業情報の構造化抽出専門家です。与えられたテキストから、対象企業「${targetCompanyName}」の親会社・子会社・関連会社（グループ会社）を抽出してください。

厳守事項:
- 対象企業自身は絶対に含めない
- 明示的に親子関係・グループ会社・関連会社・子会社・持分法適用会社・連結子会社と示されているもののみ抽出
- 業務提携や顧客企業など、資本関係のない企業は抽出しない
- 出資比率の記載があれば ownershipPct に設定（0-100）
- 存在しない企業を創作しない`,
      prompt: `対象企業: ${targetCompanyName}

出典: ${sourceLabel}

テキスト:
${focused}`,
    });

    return result.output.companies
      .filter((c) => c.name && c.name.trim() !== targetCompanyName)
      .map((c) => ({
        name: c.name.trim(),
        relation: c.relation,
        ownershipPct: c.ownershipPct,
        description: c.description,
        sources: [sourceLabel],
      }));
  } catch {
    return [];
  }
}

/** Cache key based on (sourceLabel, targetCompanyName, text-hash) */
const cachedExtractCompanies = unstable_cache(
  async (
    _key: string,
    sourceLabel: string,
    targetCompanyName: string,
    focused: string,
  ): Promise<GroupCompany[]> => {
    return extractCompaniesUncached(sourceLabel, targetCompanyName, focused);
  },
  ["group-companies-extract-v1"],
  { revalidate: 86400 * 7, tags: ["group-companies"] },
);

async function extractCompaniesFromText(
  sourceLabel: string,
  targetCompanyName: string,
  text: string,
): Promise<GroupCompany[]> {
  if (!text || text.length < 50) return [];

  // Focus on relevant sections to save tokens
  const focused = focusRelevantSections(text).slice(0, 15000);
  if (focused.length < 50) return [];

  // SHA1 hash of the focused text + label + company → stable cache key
  const hash = createHash("sha1")
    .update(`${sourceLabel}|${targetCompanyName}|${focused}`)
    .digest("hex");

  return cachedExtractCompanies(hash, sourceLabel, targetCompanyName, focused);
}

/**
 * Keep sections likely to contain group/subsidiary info.
 * Wikipedia articles often have sections labeled 関係会社/子会社/グループ.
 */
function focusRelevantSections(text: string): string {
  const keywords = [
    "関係会社",
    "子会社",
    "グループ",
    "関連会社",
    "連結",
    "傘下",
    "持分法",
    "親会社",
    "持株",
    "ホールディングス",
  ];
  const lines = text.split("\n");
  const relevant: string[] = [];
  let capture = false;
  let captureCount = 0;

  for (const line of lines) {
    const hasKeyword = keywords.some((k) => line.includes(k));
    if (hasKeyword) {
      capture = true;
      captureCount = 0;
    }
    if (capture) {
      relevant.push(line);
      captureCount++;
      // Capture up to 30 lines after a matching keyword
      if (captureCount > 30 && !hasKeyword) {
        capture = false;
      }
    }
  }

  // If we found specific sections, return them; otherwise return the full text
  return relevant.length > 100 ? relevant.join("\n") : text;
}

// ---- Dedup / merge ----

function normalizeName(name: string): string {
  return name
    .replace(
      /株式会社|（株）|\(株\)|有限会社|合同会社|Inc\.|Corporation|Corp\.|Ltd\.|Co\.,?|Limited|,\s*/gi,
      "",
    )
    .replace(/\s+/g, "")
    .toLowerCase()
    .trim();
}

function mergeGroupCompanies(companies: GroupCompany[]): GroupCompany[] {
  const byKey = new Map<string, GroupCompany>();
  const priority: Record<GroupRelation, number> = {
    parent: 3,
    subsidiary: 2,
    affiliate: 1,
  };

  for (const c of companies) {
    const key = normalizeName(c.name);
    if (!key) continue;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, { ...c, sources: [...c.sources] });
      continue;
    }
    // Merge
    existing.sources = Array.from(new Set([...existing.sources, ...c.sources]));
    if (priority[c.relation] > priority[existing.relation]) {
      existing.relation = c.relation;
    }
    if (existing.ownershipPct == null && c.ownershipPct != null) {
      existing.ownershipPct = c.ownershipPct;
    }
    if (!existing.description && c.description) {
      existing.description = c.description;
    }
  }
  return Array.from(byKey.values());
}

// ---- Public aggregator ----

export interface AggregateParams {
  companyName: string;
  edinetCode?: string;
  wikidata?: WikidataInfo | null;
  description?: string;
}

export async function aggregateGroupCompanies(
  params: AggregateParams,
): Promise<GroupCompany[]> {
  const { companyName, edinetCode, wikidata, description } = params;

  const wdCompanies = wikidata ? fromWikidata(wikidata) : [];

  // Kick off remote fetches in parallel
  const [wikipediaText, edinetText] = await Promise.all([
    fetchWikipediaFullText(companyName),
    edinetCode ? fetchEdinetSubsidiaryText(edinetCode) : Promise.resolve(""),
  ]);

  // Run AI extractions in parallel
  const extractions = await Promise.all([
    wikipediaText
      ? extractCompaniesFromText(
          "Wikipedia (AI抽出)",
          companyName,
          wikipediaText,
        )
      : Promise.resolve([]),
    edinetText
      ? extractCompaniesFromText("EDINET有報 (AI抽出)", companyName, edinetText)
      : Promise.resolve([]),
    description && description.length > 80
      ? extractCompaniesFromText(
          "概要テキスト (AI抽出)",
          companyName,
          description,
        )
      : Promise.resolve([]),
  ]);

  const all = [
    ...wdCompanies,
    ...extractions[0],
    ...extractions[1],
    ...extractions[2],
  ];

  return mergeGroupCompanies(all).sort((a, b) => {
    const prio: Record<GroupRelation, number> = {
      parent: 0,
      subsidiary: 1,
      affiliate: 2,
    };
    if (prio[a.relation] !== prio[b.relation]) {
      return prio[a.relation] - prio[b.relation];
    }
    return a.name.localeCompare(b.name, "ja");
  });
}

// ---- UI helpers ----

export function relationLabel(relation: GroupRelation): string {
  return {
    parent: "親会社",
    subsidiary: "子会社",
    affiliate: "関連会社",
  }[relation];
}

export function relationChipStyle(relation: GroupRelation): string {
  return {
    parent: "bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100",
    subsidiary: "bg-blue-50 border-blue-200 text-blue-800 hover:bg-blue-100",
    affiliate: "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100",
  }[relation];
}

export function relationBadgeLetter(relation: GroupRelation): string {
  return { parent: "親", subsidiary: "子", affiliate: "関連" }[relation];
}
