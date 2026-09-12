import { NextRequest, NextResponse } from "next/server";
import { submissionStore } from "@/lib/store";

export async function GET() {
  return NextResponse.json({
    count: submissionStore.count(),
    entries: submissionStore.all().slice(-50).reverse(),
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const entry = submissionStore.add({
    fullName: body.fullName || "Unknown",
    email: body.email || "unknown@example.com",
    fieldsFilled: body.fieldsFilled ?? 0,
  });
  return NextResponse.json(entry);
}

export async function DELETE() {
  submissionStore.reset();
  return NextResponse.json({ ok: true });
}
