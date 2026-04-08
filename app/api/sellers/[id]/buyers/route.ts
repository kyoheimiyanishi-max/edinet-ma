import { NextResponse } from "next/server";
import { addBuyer, updateBuyer, deleteBuyer } from "@/lib/d6e/repos/sellers";
import { d6eErrorResponse } from "@/lib/d6e/route-utils";

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function POST(req: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const body = await req.json();
    if (!body.companyName?.trim()) {
      return NextResponse.json({ error: "企業名は必須です" }, { status: 400 });
    }
    const seller = await addBuyer(id, {
      companyCode: body.companyCode?.trim() || "",
      companyName: body.companyName.trim(),
      industry: body.industry || undefined,
      source: body.source === "ai" ? "ai" : "manual",
      reasoning: body.reasoning ?? "",
      status: body.status || "候補",
    });
    if (!seller) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(seller, { status: 201 });
  } catch (err) {
    return d6eErrorResponse(err);
  }
}

export async function PUT(req: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const body = await req.json();
    if (!body.buyerId) {
      return NextResponse.json({ error: "buyerIdが必要です" }, { status: 400 });
    }
    const { buyerId, ...updates } = body;
    const seller = await updateBuyer(id, buyerId, updates);
    if (!seller) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(seller);
  } catch (err) {
    return d6eErrorResponse(err);
  }
}

export async function DELETE(req: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const { searchParams } = new URL(req.url);
    const buyerId = searchParams.get("buyerId");
    if (!buyerId) {
      return NextResponse.json(
        { error: "buyerIdクエリが必要です" },
        { status: 400 },
      );
    }
    const seller = await deleteBuyer(id, buyerId);
    if (!seller) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(seller);
  } catch (err) {
    return d6eErrorResponse(err);
  }
}
