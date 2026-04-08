/**
 * Seed the d6e `seminars` table from data/seminars.json.
 *
 * Idempotent: rows are deduplicated by (external_source='connpass',
 * external_id=event_id). Existing rows are skipped.
 *
 * Run with:
 *   pnpm exec tsx --conditions=react-server --env-file=.env scripts/seed-seminars.ts
 */

import seminarsData from "../data/seminars.json";

import { executeSql } from "../lib/d6e/client";
import { create, type SeminarInput } from "../lib/d6e/repos/seminars";
import { escapeSqlValue, tableRef } from "../lib/d6e/sql";
import type { SeminarEvent } from "../lib/seminars";

const EXTERNAL_SOURCE = "connpass";

async function listExistingExternalIds(): Promise<Set<string>> {
  const result = await executeSql<{ external_id: string }>(
    `SELECT external_id FROM ${tableRef("seminars")} WHERE external_source = ${escapeSqlValue(EXTERNAL_SOURCE)} AND external_id IS NOT NULL`,
  );
  return new Set((result.rows ?? []).map((r) => r.external_id));
}

function parseAddress(address: string): {
  prefecture?: string;
  city?: string;
} {
  if (!address) return {};
  // connpass addresses typically begin with "東京都 … " or "大阪府 … ".
  const prefMatch = address.match(/^([^\s]+?[都道府県])\s*(.*)$/);
  if (prefMatch) {
    const prefecture = prefMatch[1];
    const rest = prefMatch[2];
    const cityMatch = rest.match(/^([^\s]+?[市区町村])/);
    return {
      prefecture,
      ...(cityMatch ? { city: cityMatch[1] } : {}),
    };
  }
  return {};
}

async function main(): Promise<void> {
  const all = seminarsData as SeminarEvent[];
  console.log(`📥  Loading seminars.json (${all.length} entries)`);

  const existingIds = await listExistingExternalIds();
  console.log(
    `📊  d6e already has ${existingIds.size} connpass seminars seeded`,
  );

  let inserted = 0;
  let skipped = 0;
  let failed = 0;

  for (const seminar of all) {
    const externalId = String(seminar.event_id);
    if (existingIds.has(externalId)) {
      skipped++;
      continue;
    }

    const { prefecture, city } = parseAddress(seminar.address);

    const input: SeminarInput = {
      externalId,
      externalSource: EXTERNAL_SOURCE,
      title: seminar.title,
      catch: seminar.catch,
      description: seminar.description,
      registrationUrl: seminar.event_url,
      startedAt: seminar.started_at || undefined,
      endedAt: seminar.ended_at || undefined,
      venue: seminar.place || undefined,
      ...(prefecture ? { prefecture } : {}),
      ...(city ? { city } : {}),
      organizer: seminar.owner_display_name,
      accepted: seminar.accepted,
      capacity: seminar.limit,
      eventType: seminar.event_type,
      category: seminar.category,
      tags: seminar.tags,
    };

    try {
      await create(input);
      inserted++;
      if (inserted % 100 === 0) {
        console.log(`  … ${inserted} inserted (latest: ${seminar.title})`);
      }
    } catch (e) {
      failed++;
      const message = e instanceof Error ? e.message : String(e);
      console.error(`  ❌  ${seminar.title.slice(0, 40)}  →  ${message}`);
      if (failed >= 10) {
        console.error("too many failures, aborting");
        break;
      }
    }
  }

  console.log("");
  console.log("─".repeat(60));
  console.log(
    `inserted: ${inserted}  |  skipped: ${skipped}  |  failed: ${failed}`,
  );

  const finalCount = await executeSql<{ n: number }>(
    `SELECT count(*)::int as n FROM ${tableRef("seminars")}`,
  );
  console.log(`d6e seminars total: ${finalCount.rows?.[0]?.n ?? "?"}`);

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(2);
});
