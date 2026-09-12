import Steel from "steel-sdk";
import { chromium } from "playwright-core";
import { VictimPersona, SwarmStatus } from "./types";

const steel = new Steel({
  steelAPIKey: process.env.STEEL_API_KEY,
});

export async function launchSwarmSession(
  targetUrl: string,
  persona: VictimPersona,
  onStatusUpdate: (status: SwarmStatus) => void
): Promise<{ sessionId: string; debugUrl: string }> {
  // 1. Create a cloud browser session in Steel.
  const session = await steel.sessions.create({
    useProxy: true,
    solveCaptcha: true,
  });

  const debugUrl = session.debugUrl;
  onStatusUpdate("booting");

  // 2. Connect Playwright over CDP and drive the page. Runs async so the
  // caller can return the debugUrl immediately for the UI to embed.
  (async () => {
    try {
      const browser = await chromium.connectOverCDP(session.websocketUrl);
      const context = browser.contexts()[0] ?? (await browser.newContext());
      const page = await context.newPage();

      onStatusUpdate("navigating");
      await page.goto(targetUrl, { waitUntil: "networkidle", timeout: 30000 });

      onStatusUpdate("filling");
      await fillPhishingForm(page, persona);

      onStatusUpdate("submitted");
      await page.waitForTimeout(4000);
      await browser.close();
      await steel.sessions.release(session.id);
    } catch (err) {
      console.error(`Swarm node ${session.id} error:`, err);
      onStatusUpdate("failed");
      try {
        await steel.sessions.release(session.id);
      } catch {
        // already released or unreachable
      }
    }
  })();

  return { sessionId: session.id, debugUrl };
}

async function fillPhishingForm(page: any, persona: VictimPersona) {
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

  if (submitBtn) {
    await submitBtn.click();
  }
}
