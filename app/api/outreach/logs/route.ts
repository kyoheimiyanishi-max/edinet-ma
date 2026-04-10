import { NextResponse } from "next/server";
import type { OutreachLogInput } from "@/lib/outreach";
import {
  createLog,
  findAllLogs,
  findLogsByBuyer,
  findLogsBySeller,
} from "@/lib/d6e/repos/outreach";
import { getCurrentUser } from "@/lib/auth/session";
import { writeAudit } from "@/lib/audit";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const buyerId = url.searchParams.get("buyerCompanyId");
  const sellerId = url.searchParams.get("sellerId");
  if (buyerId) return NextResponse.json(await findLogsByBuyer(buyerId));
  if (sellerId) return NextResponse.json(await findLogsBySeller(sellerId));
  return NextResponse.json(await findAllLogs());
}

export async function POST(req: Request) {
  const body = (await req.json()) as Partial<OutreachLogInput>;
  if (!body.channel) {
    return NextResponse.json({ error: "channel は必須です" }, { status: 400 });
  }
  const user = await getCurrentUser();
  const created = await createLog({
    buyerCompanyId: body.buyerCompanyId,
    sellerId: body.sellerId,
    templateId: body.templateId,
    channel: body.channel,
    subject: body.subject,
    body: body.body,
    sentBy: body.sentBy,
    status: body.status ?? "sent",
    replyText: body.replyText,
    notes: body.notes,
  });
  await writeAudit(
    user,
    "create",
    "outreach_log",
    created.id,
    created.buyerCompanyName ?? "outreach",
  );
  return NextResponse.json(created, { status: 201 });
}
