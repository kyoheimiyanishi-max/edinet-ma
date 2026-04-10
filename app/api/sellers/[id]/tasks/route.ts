import { NextResponse } from "next/server";
import type { SellerTask } from "@/lib/sellers";
import { addTask, deleteTask, updateTask } from "@/lib/d6e/repos/sellers";

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function POST(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const body = (await req.json()) as Partial<
    Omit<SellerTask, "id" | "sellerId" | "createdAt" | "updatedAt">
  >;
  if (!body.title?.trim()) {
    return NextResponse.json(
      { error: "タスクタイトルは必須です" },
      { status: 400 },
    );
  }
  const seller = await addTask(id, {
    title: body.title.trim(),
    description: body.description,
    dueDate: body.dueDate,
    assignee: body.assignee,
    status: body.status ?? "未着手",
    priority: body.priority ?? "中",
  });
  if (!seller) {
    return NextResponse.json({ error: "Seller not found" }, { status: 404 });
  }
  return NextResponse.json(seller, { status: 201 });
}

export async function PUT(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const body = (await req.json()) as { taskId: string } & Partial<
    Omit<SellerTask, "id" | "sellerId" | "createdAt">
  >;
  if (!body.taskId) {
    return NextResponse.json({ error: "taskId は必須です" }, { status: 400 });
  }
  const seller = await updateTask(id, body.taskId, body);
  if (!seller) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(seller);
}

export async function DELETE(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const body = (await req.json()) as { taskId: string };
  if (!body.taskId) {
    return NextResponse.json({ error: "taskId は必須です" }, { status: 400 });
  }
  const seller = await deleteTask(id, body.taskId);
  if (!seller) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(seller);
}
