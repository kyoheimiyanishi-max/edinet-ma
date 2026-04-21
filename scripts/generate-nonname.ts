/**
 * 指定した seller の ノンネーム資料 (.pptx) を自動生成するローカル CLI。
 *
 * 使い方:
 *   # 標準 (slide/output/nonname-<id>.pptx に出力)
 *   pnpm exec tsx --conditions=react-server --env-file=.env.local \
 *     scripts/generate-nonname.ts <seller-id>
 *
 *   # 出力先を指定
 *   pnpm exec tsx --conditions=react-server --env-file=.env.local \
 *     scripts/generate-nonname.ts <seller-id> --out /tmp/teaser.pptx
 *
 *   # spec JSON だけダンプ (Python を起動しない)
 *   pnpm exec tsx --conditions=react-server --env-file=.env.local \
 *     scripts/generate-nonname.ts <seller-id> --spec-only
 *
 * 前提:
 *   - d6e 認証情報が .env.local に設定されていること
 *   - slide/.venv が `uv sync` 済みであること (`cd slide && uv sync`)
 *
 * Vercel 本番では動作しない (Python ランタイム前提)。API ルート化は別 PR。
 */

import path from "node:path";

import { findById } from "../lib/d6e/repos/sellers";
import { buildNonnameSpec } from "../lib/slide/nonname-spec";
import { runSlideGenerator } from "../lib/slide/runner";

interface CliOptions {
  sellerId: string;
  outPath?: string;
  specOnly: boolean;
}

function parseArgs(argv: string[]): CliOptions {
  const args = argv.slice(2);
  let sellerId: string | undefined;
  let outPath: string | undefined;
  let specOnly = false;

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--out") {
      outPath = args[++i];
    } else if (a?.startsWith("--out=")) {
      outPath = a.slice("--out=".length);
    } else if (a === "--spec-only") {
      specOnly = true;
    } else if (a && !a.startsWith("--")) {
      sellerId = a;
    }
  }

  if (!sellerId) {
    console.error(
      "Usage: generate-nonname.ts <seller-id> [--out <path>] [--spec-only]",
    );
    process.exit(1);
  }
  return { sellerId, outPath, specOnly };
}

async function main() {
  const { sellerId, outPath, specOnly } = parseArgs(process.argv);

  const seller = await findById(sellerId);
  if (!seller) {
    console.error(`[ERROR] seller not found: ${sellerId}`);
    process.exit(2);
  }

  const spec = buildNonnameSpec(seller);

  if (specOnly) {
    process.stdout.write(JSON.stringify(spec, null, 2) + "\n");
    return;
  }

  const resolvedOut =
    outPath ??
    path.resolve(process.cwd(), "slide/output", `nonname-${sellerId}.pptx`);

  await runSlideGenerator(spec, { outPath: resolvedOut });
  console.log(`[OK] 生成完了: ${resolvedOut}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
