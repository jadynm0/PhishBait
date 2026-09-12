import { NextRequest, NextResponse } from "next/server";
import { swarmNodes } from "@/lib/swarmStore";
export const dynamic = "force-dynamic";
export function GET(req: NextRequest) {
  const ids = (req.nextUrl.searchParams.get("ids") || "").split(",").slice(0, 10);
  return NextResponse.json({ sessions: ids.map(id => swarmNodes.get(id)).filter(Boolean) }, { headers: { "Cache-Control": "no-store" } });
}
