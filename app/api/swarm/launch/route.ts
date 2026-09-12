import { NextRequest, NextResponse } from "next/server";
import { generateVictimPersonas } from "@/lib/persona";
import { launchSwarmSession } from "@/lib/steelRunner";
import { steelCreationError } from "@/lib/steelError";
import { isLocalDemo } from "@/lib/localDemoRelay";
import { swarmNodes } from "@/lib/swarmStore";
import { checkTarget } from "@/lib/targetGuard";
import { LaunchRequestBody, LaunchResponseBody, SwarmNode } from "@/lib/types";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as LaunchRequestBody;
  const targetUrl = body.targetUrl;
  const fleetCount = body.fleetCount ?? 5;
  if (!Number.isInteger(fleetCount) || fleetCount < 1 || fleetCount > 10) {
    return NextResponse.json({ error: "Fleet size must be an integer from 1 to 10." }, { status: 400 });
  }

  if (!targetUrl) {
    return NextResponse.json({ error: "targetUrl is required" }, { status: 400 });
  }

  const check = checkTarget(targetUrl);
  if (!check.allowed) {
    return NextResponse.json({ error: check.reason }, { status: 403 });
  }

  const parsedTarget = new URL(targetUrl);
  if (!['http:', 'https:'].includes(parsedTarget.protocol)) {
    return NextResponse.json({ error: "Target must use HTTP or HTTPS." }, { status: 400 });
  }
  if (isLocalDemo(parsedTarget) && !/^\/(target-portal\/?|clone-portal\/[a-z0-9-]+\/?)$/.test(parsedTarget.pathname)) {
    return NextResponse.json({ error: "For localhost, select the mock target or a bundled clone." }, { status: 400 });
  }

  if (!process.env.STEEL_API_KEY || !process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "Server is missing STEEL_API_KEY or ANTHROPIC_API_KEY." },
      { status: 500 }
    );
  }

  try {
    const personas = await generateVictimPersonas(targetUrl, fleetCount);

    const results = await Promise.allSettled(
      personas.map(async (persona) => {
        const { sessionId, debugUrl } = await launchSwarmSession(
          targetUrl,
          persona,
          () => {}
        );
        return swarmNodes.get(sessionId) ?? {
          sessionId, debugUrl, personaName: persona.fullName, status: "booting" as const,
        };
      })
    );

    const sessions: SwarmNode[] = results.map((result, i) => result.status === "fulfilled" ? result.value : {
      sessionId: `failed-${crypto.randomUUID()}`, debugUrl: "", personaName: personas[i].fullName,
      status: "failed", ended: true, error: steelCreationError(result.reason),
    });
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
