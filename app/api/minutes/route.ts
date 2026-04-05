import { NextResponse } from "next/server";
import {
  getAllMinutes,
  createMinute,
  type MeetingMinuteInput,
} from "@/lib/minutes";

export async function GET() {
  return NextResponse.json(getAllMinutes());
}

export async function POST(req: Request) {
  const body = (await req.json()) as MeetingMinuteInput;

  if (!body.title?.trim()) {
    return NextResponse.json({ error: "タイトルは必須です" }, { status: 400 });
  }

  const minute = createMinute({
    title: body.title.trim(),
    date: body.date ?? new Date().toISOString().split("T")[0],
    participants: body.participants ?? [],
    projectId: body.projectId ?? "",
    projectName: body.projectName ?? "",
    content: body.content ?? "",
    decisions: body.decisions ?? [],
    actionItems: body.actionItems ?? [],
  });

  return NextResponse.json(minute, { status: 201 });
}
