import { NextRequest, NextResponse } from "next/server";
import { enrichCompany } from "@/lib/enrich";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const name = sp.get("name");

  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const result = await enrichCompany({
    name,
    corporateNumber: sp.get("corporate_number") || undefined,
    location: sp.get("location") || undefined,
    companyUrl: sp.get("company_url") || undefined,
  });

  return NextResponse.json(result);
}
