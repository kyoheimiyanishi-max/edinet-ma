import { NextResponse } from "next/server";
import { ALLIANCE_CONTACT_STATUSES } from "@/lib/alliance-contact-status";
import { update as updateTaxAdvisor } from "@/lib/d6e/repos/tax-advisors";
import { update as updateBank } from "@/lib/d6e/repos/banks";
import { update as updateMaAdvisor } from "@/lib/d6e/repos/ma-advisors";
import { update as updateFp } from "@/lib/d6e/repos/financial-planners";
import { getCurrentUser } from "@/lib/auth/session";
import { writeAudit } from "@/lib/audit";

const ENTITY_UPDATERS: Record<
  string,
  (id: string, patch: { contactStatus: string }) => Promise<unknown>
> = {
  tax_advisor: updateTaxAdvisor,
  bank: updateBank,
  ma_advisor: updateMaAdvisor,
  financial_planner: updateFp,
};

const ENTITY_LABELS: Record<string, string> = {
  tax_advisor: "tax_advisors",
  bank: "banks",
  ma_advisor: "ma_advisors",
  financial_planner: "financial_planners",
};

export async function PATCH(req: Request) {
  const user = await getCurrentUser();
  const body = (await req.json()) as {
    entityType?: string;
    entityId?: string;
    contactStatus?: string;
  };

  const { entityType, entityId, contactStatus } = body;

  if (!entityType || !entityId || !contactStatus) {
    return NextResponse.json(
      { error: "entityType, entityId, contactStatus are required" },
      { status: 400 },
    );
  }

  if (
    !(ALLIANCE_CONTACT_STATUSES as readonly string[]).includes(contactStatus)
  ) {
    return NextResponse.json(
      { error: `Invalid contactStatus: ${contactStatus}` },
      { status: 400 },
    );
  }

  const updater = ENTITY_UPDATERS[entityType];
  if (!updater) {
    return NextResponse.json(
      { error: `Unknown entityType: ${entityType}` },
      { status: 400 },
    );
  }

  const updated = await updater(entityId, { contactStatus });
  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await writeAudit(
    user,
    "update",
    ENTITY_LABELS[entityType] ?? entityType,
    entityId,
    undefined,
    { contactStatus: { old: undefined, new: contactStatus } },
  );

  return NextResponse.json(updated);
}
