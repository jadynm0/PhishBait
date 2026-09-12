import { NextRequest, NextResponse } from "next/server";
import { generateVictimPersonas } from "@/lib/persona";
import { launchSwarmSession } from "@/lib/steelRunner";
import { checkTarget } from "@/lib/targetGuard";
import { LaunchRequestBody, LaunchResponseBody, SwarmNode } from "@/lib/types";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as LaunchRequestBody;
  const targetUrl = body.targetUrl;
  const fleetCount = Math.min(Math.max(body.fleetCount ?? 5, 1), 10);

  if (!targetUrl) {
    return NextResponse.json({ error: "targetUrl is required" }, { status: 400 });
  }

  const check = checkTarget(targetUrl);
  if (!check.allowed) {
    return NextResponse.json({ error: check.reason }, { status: 403 });
  }

  if (!process.env.STEEL_API_KEY || !process.env.OPENROUTER_API_KEY) {
    return NextResponse.json(
      { error: "Server is missing STEEL_API_KEY or OPENROUTER_API_KEY." },
      { status: 500 }
    );
  }

  try {
    const personas = await generateVictimPersonas(targetUrl, fleetCount);

    const sessions: SwarmNode[] = await Promise.all(
      personas.map(async (persona) => {
        const { sessionId, debugUrl } = await launchSwarmSession(
          targetUrl,
          persona,
          () => {
            // Per-node status updates are logged server-side for now.
            // Swap for a WebSocket/SSE push if you want live status in the UI
            // beyond the debugUrl iframe itself.
          }
        );
        return {
          sessionId,
          debugUrl,
          personaName: persona.fullName,
          status: "booting",
        };
      })
    );

    const response: LaunchResponseBody = {
      sessions,
      targetUrl,
      warning: check.reason,
    };
    return NextResponse.json(response);
  } catch (err: any) {
    console.error("Swarm launch failed:", err);
    return NextResponse.json(
      { error: err?.message || "Swarm launch failed" },
      { status: 500 }
    );
  }
}
