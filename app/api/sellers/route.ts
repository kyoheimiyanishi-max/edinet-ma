import { NextResponse } from "next/server";
import type { SellerInput } from "@/lib/sellers";
import { findAll, create } from "@/lib/d6e/repos/sellers";

export async function GET() {
  return NextResponse.json(await findAll());
}

export async function POST(req: Request) {
  const body = (await req.json()) as Partial<SellerInput>;
  if (!body.companyName?.trim()) {
    return NextResponse.json({ error: "企業名は必須です" }, { status: 400 });
  }
  const seller = await create({
    companyName: body.companyName.trim(),
    companyCode: body.companyCode?.trim() || undefined,
    industry: body.industry?.trim() || undefined,
    prefecture: body.prefecture?.trim() || undefined,
    description: body.description ?? "",
    profile: body.profile ?? "",
    desiredTerms: body.desiredTerms ?? "",
    stage: body.stage ?? "初回面談",
    priority: body.priority?.trim() || undefined,
    rank: body.rank,
    assignedTo: body.assignedTo?.trim() || undefined,
    mediatorType: body.mediatorType,
    introSource: body.introSource?.trim() || undefined,
    feeEstimate: body.feeEstimate?.trim() || undefined,
    ndaSigned: body.ndaSigned ?? false,
    adSigned: body.adSigned ?? false,
    folderUrl: body.folderUrl?.trim() || undefined,
  });
  return NextResponse.json(seller, { status: 201 });
}
