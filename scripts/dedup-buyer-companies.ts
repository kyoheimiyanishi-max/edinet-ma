/**
 * 買手企業の全角/半角重複をクリーンアップするスクリプト。
 *
 * EDINET codelist シードの全角名 (例: ＡｐｐｉｅｒＧｒｏｕｐ株式会社) と
 * Excel インポートの半角名 (例: Appier Group株式会社) が重複している
 * ケースを検出し、Excel 由来のレコードを残して codelist 由来を削除する。
 *
 * 削除する前に、codelist 側にしかない有用なデータ (corporate_number,
 * edinet_code, sec_code 等) は Excel 側のレコードにマージする。
 *
 * Run with:
 *   pnpm exec tsx --conditions=react-server --env-file=.env.local \
 *     scripts/dedup-buyer-companies.ts
 *
 * DRY RUN (デフォルト): 変更は行わず重複一覧を表示するだけ。
 * 実行するには --apply フラグを付ける:
 *   pnpm exec tsx --conditions=react-server --env-file=.env.local \
 *     scripts/dedup-buyer-companies.ts --apply
 */

import {
  search as searchCompanies,
  update as updateCompany,
  remove as removeCompany,
  type Company,
  type CompanyInput,
} from "../lib/d6e/repos/companies";

const DRY_RUN = !process.argv.includes("--apply");

/** NFKC 正規化 + スペース除去で比較用キーを生成 */
function normalizeKey(name: string): string {
  return name
    .normalize("NFKC")
    .replace(/[\s　]/g, "")
    .toLowerCase();
}

/** 全角文字を含むか判定 (ASCII 範囲の全角: Ａ-Ｚ, ａ-ｚ, ０-９ 等) */
function hasFullWidthAscii(s: string): boolean {
  // eslint-disable-next-line no-control-regex
  return /[\uFF01-\uFF5E]/.test(s);
}

/**
 * keep 側に不足している識別子/メタデータを drop 側から補完するパッチを生成。
 * undefined のフィールドは update で無視されるので安全。
 */
function buildMergePatch(
  keep: Company,
  drop: Company,
): Partial<CompanyInput> | null {
  const patch: Partial<CompanyInput> = {};
  if (!keep.corporateNumber && drop.corporateNumber)
    patch.corporateNumber = drop.corporateNumber;
  if (!keep.edinetCode && drop.edinetCode) patch.edinetCode = drop.edinetCode;
  if (!keep.secCode && drop.secCode) patch.secCode = drop.secCode;
  if (!keep.industry && drop.industry) patch.industry = drop.industry;
  if (!keep.industryDetail && drop.industryDetail)
    patch.industryDetail = drop.industryDetail;
  if (!keep.listingStatus && drop.listingStatus)
    patch.listingStatus = drop.listingStatus;
  if (!keep.nameKana && drop.nameKana) patch.nameKana = drop.nameKana;
  if (!keep.nameEn && drop.nameEn) patch.nameEn = drop.nameEn;
  return Object.keys(patch).length > 0 ? patch : null;
}

async function main(): Promise<void> {
  if (DRY_RUN) {
    console.log("🔍 DRY RUN — 変更は行いません (--apply で実行)");
    console.log("");
  }

  // 全買手企業を取得
  const buyers = await searchCompanies({ isBuyer: true, limit: 5000 });
  console.log(`📥 買手企業: ${buyers.length} 件`);

  // NFKC 正規化名でグルーピング
  const groups = new Map<string, Company[]>();
  for (const c of buyers) {
    const key = normalizeKey(c.name);
    const arr = groups.get(key) ?? [];
    arr.push(c);
    groups.set(key, arr);
  }

  // 重複グループを抽出
  const duplicateGroups = [...groups.entries()].filter(
    ([, arr]) => arr.length > 1,
  );
  console.log(`🔄 重複グループ: ${duplicateGroups.length} 件`);
  console.log("");

  let merged = 0;
  let deleted = 0;
  let failed = 0;

  for (const [key, members] of duplicateGroups) {
    // 全角名 = codelist 由来、半角名 = Excel 由来と判定
    // 全角 ASCII を含まないものを「Excel 由来 (keep)」とする
    const excelOnes = members.filter((m) => !hasFullWidthAscii(m.name));
    const codelistOnes = members.filter((m) => hasFullWidthAscii(m.name));

    if (excelOnes.length === 0) {
      // 全部全角 → 最新の updatedAt を keep
      console.log(
        `  ⚠️  "${members[0].name}" — 全角のみ、スキップ (key=${key})`,
      );
      continue;
    }

    // Excel 由来を keep (複数あれば最新を使う)
    const keep = excelOnes.sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    )[0];
    // codelist 由来 + keep 以外の Excel 由来を削除対象に
    const toDrop = members.filter((m) => m.id !== keep.id);

    console.log(`  ✅ KEEP: "${keep.name}" (id=${keep.id.slice(0, 8)}…)`);
    for (const d of toDrop) {
      console.log(`  ❌ DROP: "${d.name}" (id=${d.id.slice(0, 8)}…)`);

      // keep にない情報を drop から補完
      const patch = buildMergePatch(keep, d);
      if (patch) {
        const fields = Object.keys(patch).join(", ");
        console.log(`     → マージ: ${fields}`);
        if (!DRY_RUN) {
          try {
            await updateCompany(keep.id, patch);
            merged++;
          } catch (e) {
            console.error(
              `     ⚠️ マージ失敗: ${e instanceof Error ? e.message : e}`,
            );
            failed++;
          }
        }
      }

      if (!DRY_RUN) {
        try {
          await removeCompany(d.id);
          deleted++;
        } catch (e) {
          console.error(
            `     ⚠️ 削除失敗: ${e instanceof Error ? e.message : e}`,
          );
          failed++;
        }
      }
    }
    console.log("");
  }

  console.log("─".repeat(60));
  if (DRY_RUN) {
    console.log(
      `DRY RUN 完了 — 削除対象: ${duplicateGroups.reduce((n, [, arr]) => n + arr.length - 1, 0)} 件`,
    );
    console.log("実行するには --apply を付けてください");
  } else {
    console.log(
      `完了 — マージ: ${merged} 件 | 削除: ${deleted} 件 | 失敗: ${failed} 件`,
    );
  }

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(2);
});
