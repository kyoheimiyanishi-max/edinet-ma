import { NextResponse } from "next/server";
import { getAllSellers, createSeller, type SellerInput } from "@/lib/sellers";

export async function GET() {
  return NextResponse.json(getAllSellers());
}

export async function POST(req: Request) {
  const body = (await req.json()) as Partial<SellerInput>;
  if (!body.companyName?.trim()) {
    return NextResponse.json({ error: "企業名は必須です" }, { status: 400 });
  }
  const seller = createSeller({
    companyName: body.companyName.trim(),
    companyCode: body.companyCode?.trim() || undefined,
    industry: body.industry?.trim() || undefined,
    prefecture: body.prefecture?.trim() || undefined,
    description: body.description ?? "",
    profile: body.profile ?? "",
    desiredTerms: body.desiredTerms ?? "",
    stage: body.stage ?? "初回面談",
  });
  return NextResponse.json(seller, { status: 201 });
}
