import Steel from "steel-sdk";
import { chromium, type Browser, type Page } from "playwright-core";
import { installLocalDemoRelay, isLocalDemo } from "./localDemoRelay";
import { saveSwarmNode } from "./swarmStore";
import { VictimPersona, SwarmStatus, SwarmNode } from "./types";

const steel = new Steel({
  steelAPIKey: process.env.STEEL_API_KEY,
});

export async function launchSwarmSession(
  targetUrl: string,
  persona: VictimPersona,
  onStatusUpdate: (status: SwarmStatus) => void
): Promise<{ sessionId: string; debugUrl: string }> {
  // 1. Create a cloud browser session in Steel.
  const localDemo = isLocalDemo(new URL(targetUrl));
  const session = await steel.sessions.create({
    useProxy: !localDemo,
    solveCaptcha: !localDemo,
  });

  const node: SwarmNode = { sessionId: session.id, debugUrl: session.debugUrl, personaName: persona.fullName, status: "booting", ended: false };
  const update = (status: SwarmStatus, error?: string) => {
    node.status = status;
    node.error = error;
    saveSwarmNode({ ...node });
    onStatusUpdate(status);
  };
  update("booting");

  void (async () => {
    let browser: Browser | undefined;
    try {
      const connection = new URL(session.websocketUrl);
      connection.searchParams.set("apiKey", process.env.STEEL_API_KEY || "");
      browser = await chromium.connectOverCDP(connection.toString());
      const context = browser.contexts()[0] ?? await browser.newContext();
      await installLocalDemoRelay(context, new URL(targetUrl));
      const page = context.pages()[0] ?? await context.newPage();
      update("navigating");
      const response = await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 45000 });
      if (!response || !response.ok()) throw new Error(`Target page returned HTTP ${response?.status() ?? "no response"}. Check the target URL.`);
      if (/^\/(clone-portal\/|target-portal)/.test(new URL(targetUrl).pathname)) {
        await page.locator('[data-phishbait-ready="true"]').waitFor({ timeout: 30000 });
      }
      update("filling");
      await fillPhishingForm(page, persona);
      update("submitted");
      // Give the live viewer time to display the confirmation, then release billing.
      await page.waitForTimeout(15000);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Browser automation failed.";
      // Playwright errors may include the authenticated CDP URL.
      const safeMessage = message.replace(/apiKey=[^&\s"']+/gi, "apiKey=[redacted]").split(process.env.STEEL_API_KEY || "__missing_key__").join("[redacted]");
      update("failed", safeMessage);
    } finally {
      await browser?.close().catch(() => {});
      try {
        await steel.sessions.release(session.id);
      } catch {
        node.error = [node.error, "Could not confirm session release; check the Steel dashboard."].filter(Boolean).join(" ");
      }
      node.ended = true;
      saveSwarmNode({ ...node });
    }
  })();

  return { sessionId: session.id, debugUrl: session.debugUrl };
}

async function fillPhishingForm(page: Page, persona: VictimPersona) {
  const inputMappings = [
    { selector: 'input[name*="name" i], input[placeholder*="name" i], input[id*="name" i]', val: persona.fullName },
    { selector: 'input[type="email"], input[name*="email" i], input[placeholder*="email" i]', val: persona.email },
    { selector: 'input[type="tel"], input[name*="phone" i], input[placeholder*="phone" i]', val: persona.phone },
    { selector: 'input[name*="card" i], input[placeholder*="card" i], input[id*="cc" i]', val: persona.creditCard.number },
    { selector: 'input[name*="exp" i], input[placeholder*="MM/YY" i]', val: persona.creditCard.exp },
    { selector: 'input[name*="cvv" i], input[name*="cvc" i], input[placeholder*="cvv" i]', val: persona.creditCard.cvv },
    { selector: 'input[name*="address" i], input[placeholder*="address" i]', val: persona.address },
    { selector: 'textarea, input[name*="comment" i], input[name*="note" i]', val: persona.notes },
  ];

  for (const map of inputMappings) {
    const el = await page.$(map.selector);
    if (el) {
      await el.fill(map.val);
      await page.waitForTimeout(300 + Math.random() * 200);
    }
  }

  const submitBtn = await page.$(
    'button[type="submit"], input[type="submit"], button:has-text("Submit"), button:has-text("Verify"), button:has-text("Confirm"), button:has-text("Next")'
  );

  if (!submitBtn) throw new Error("No submit button was found on the target page.");
  const logUrl = new URL("/api/target-logs", page.url()).href;
  const [response] = await Promise.all([
    page.waitForResponse(res => res.url() === logUrl && res.request().method() === "POST", { timeout: 20000 }),
    submitBtn.click(),
  ]);
  if (!response.ok()) throw new Error(`Submission failed with HTTP ${response.status()}.`);
}
