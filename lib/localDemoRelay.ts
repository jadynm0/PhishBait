import type { BrowserContext } from "playwright-core";

export function isLocalDemo(url: URL) {
  return ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
}

// Fulfill only this demo's resources through Node, where localhost is the user's
// machine. This requires no public tunnel and never forwards the API keys.
export async function installLocalDemoRelay(context: BrowserContext, target: URL) {
  if (!isLocalDemo(target)) return;
  await context.route("**/*", async route => {
    const request = route.request();
    const url = new URL(request.url());
    const readable = url.pathname === target.pathname || url.pathname.startsWith("/_next/") || url.pathname.startsWith("/clones/") || url.pathname === "/favicon.ico";
    const writable = url.pathname === "/api/target-logs" && request.method() === "POST";
    if (url.origin !== target.origin || !(writable || (readable && ["GET", "HEAD"].includes(request.method())))) {
      await route.abort();
      return;
    }
    try {
      const response = await fetch(url, {
        method: request.method(),
        headers: { "Content-Type": request.headers()["content-type"] || "application/octet-stream" },
        body: request.postData() || undefined,
        redirect: "manual",
        signal: AbortSignal.timeout(30000),
      });
      const headers = Object.fromEntries(response.headers);
      delete headers["content-encoding"];
      delete headers["content-length"];
      delete headers["transfer-encoding"];
      await route.fulfill({ status: response.status, headers, body: Buffer.from(await response.arrayBuffer()) });
    } catch (error) {
      console.error("Local demo relay failed:", error instanceof Error ? error.message : "Request failed");
      await route.abort().catch(() => {});
    }
  });
}
