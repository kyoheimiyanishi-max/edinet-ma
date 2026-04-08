import { NextResponse } from "next/server";
import { getCompanyAnalysis } from "@/lib/company-analysis";

export const maxDuration = 120;

export async function POST(req: Request) {
  const { edinetCode } = await req.json();

  if (!edinetCode) {
    return NextResponse.json({ error: "edinetCode required" }, { status: 400 });
  }

  const result = await getCompanyAnalysis(edinetCode);

  if (!result.ok) {
    const status = result.error.includes("ANTHROPIC_API_KEY")
      ? 500
      : result.error === "Company not found"
        ? 404
        : 500;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json(result.data);
}
