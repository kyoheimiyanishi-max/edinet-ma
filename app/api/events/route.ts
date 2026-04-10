import { NextResponse } from "next/server";
import type { CalendarEventInput } from "@/lib/events";
import {
  create,
  findAll,
  findBySeller,
  findUpcoming,
} from "@/lib/d6e/repos/events";
import { getCurrentUser } from "@/lib/auth/session";
import { writeAudit } from "@/lib/audit";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const upcoming = url.searchParams.get("upcoming");
  const sellerId = url.searchParams.get("sellerId");
  if (upcoming) return NextResponse.json(await findUpcoming());
  if (sellerId) return NextResponse.json(await findBySeller(sellerId));
  return NextResponse.json(await findAll());
}

export async function POST(req: Request) {
  const body = (await req.json()) as Partial<CalendarEventInput>;
  if (!body.title?.trim() || !body.date || !body.eventType) {
    return NextResponse.json(
      { error: "title, date, eventType は必須です" },
      { status: 400 },
    );
  }
  const user = await getCurrentUser();
  const created = await create({
    title: body.title.trim(),
    eventType: body.eventType,
    date: body.date,
    startTime: body.startTime,
    endTime: body.endTime,
    location: body.location?.trim(),
    sellerId: body.sellerId,
    buyerCompanyId: body.buyerCompanyId,
    attendees: body.attendees,
    description: body.description,
    status: body.status ?? "予定",
  });
  await writeAudit(user, "create", "event", created.id, created.title);
  return NextResponse.json(created, { status: 201 });
}
