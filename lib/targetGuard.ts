/**
 * PhishBait deliberately restricts what the browser fleet is allowed to touch.
 *
 * Rationale: this tool combines anti-bot evasion (residential proxies, CAPTCHA
 * solving) with mass automated form submission. That combination is powerful
 * against a scam site you're demoing against on your own infrastructure, and
 * legally/ethically risky against arbitrary live third-party sites you don't
 * own or have permission to test. Default to the safe path; make the risky
 * path opt-in and explicit rather than a silent default.
 */

function getAllowlistedDomains(): string[] {
  const raw = process.env.ALLOWLIST_DOMAINS || "localhost,127.0.0.1";
  return raw
    .split(",")
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);
}

export interface TargetCheckResult {
  allowed: boolean;
  reason?: string;
}

export function checkTarget(targetUrl: string): TargetCheckResult {
  let parsed: URL;
  try {
    parsed = new URL(targetUrl);
  } catch {
    return { allowed: false, reason: "Not a valid URL." };
  }

  const host = parsed.hostname.toLowerCase();
  const allowlist = getAllowlistedDomains();
  const allowLive = process.env.ALLOW_LIVE_TARGETS === "true";

  const isAllowlisted = allowlist.some(
    (d) => host === d || host.endsWith(`.${d}`)
  );

  if (isAllowlisted) {
    return { allowed: true };
  }

  if (allowLive) {
    return {
      allowed: true,
      reason:
        "ALLOW_LIVE_TARGETS is enabled — targeting a live, non-allowlisted URL. " +
        "You are responsible for confirming you have the legal right to do this.",
    };
  }

  return {
    allowed: false,
    reason:
      `"${host}" is not on the allowlist and ALLOW_LIVE_TARGETS is not set to "true". ` +
      `For demos, point the fleet at your own /target-portal mock page, or add the ` +
      `domain to ALLOWLIST_DOMAINS in .env.local if you own/control it.`,
  };
}
