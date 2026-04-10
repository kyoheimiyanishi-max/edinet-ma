import { NextResponse } from "next/server";
import type { TimeEntryInput } from "@/lib/time-entries";
import {
  create,
  findAll,
  findByDateRange,
  findBySeller,
  findByUser,
} from "@/lib/d6e/repos/time-entries";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const user = url.searchParams.get("user");
  const sellerId = url.searchParams.get("sellerId");
  if (from && to) return NextResponse.json(await findByDateRange(from, to));
  if (user) return NextResponse.json(await findByUser(user));
  if (sellerId) return NextResponse.json(await findBySeller(sellerId));
  return NextResponse.json(await findAll());
}

export async function POST(req: Request) {
  const body = (await req.json()) as Partial<TimeEntryInput>;
  if (!body.userName || !body.date || body.hours == null || !body.category) {
    return NextResponse.json(
      { error: "userName, date, hours, category は必須です" },
      { status: 400 },
    );
  }
  const created = await create({
    userName: body.userName.trim(),
    date: body.date,
    hours: Number(body.hours),
    category: body.category,
    employeeId: body.employeeId,
    sellerId: body.sellerId,
    description: body.description,
  });
  return NextResponse.json(created, { status: 201 });
}
