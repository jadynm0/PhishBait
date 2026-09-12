# PhishBait — Fleet Operator

Steel.dev + OpenRouter powered "war room" that spins up a fleet of cloud
browsers to flood scam-form pipelines with synthetic decoy data.

## What's in this repo

- `app/page.tsx` — the war room UI: paste a target, launch N Steel sessions,
  watch them live via embedded `debugUrl` iframes, watch a "records poisoned"
  counter tick up.
- `app/target-portal/page.tsx` — a self-contained, fictional mock scam page
  (package-redelivery style) to demo against safely. This is the **default**
  target.
- `app/api/swarm/launch/route.ts` — generates personas, checks the target
  against the safety guard, launches the Steel + Playwright fleet.
- `app/api/target-logs/route.ts` — records/reads submissions so the UI counter
  has something real to show.
- `lib/persona.ts` — OpenRouter-generated fictional persona records (name,
  email, phone, address, notes). Card numbers are **not** LLM-generated —
  they're drawn from a small fixed list of well-known, publicly documented
  payment-industry test numbers (the ones Stripe/Visa publish for testing).
- `lib/steelRunner.ts` — Steel session creation + Playwright CDP connection +
  the heuristic form-filler.
- `lib/targetGuard.ts` — the safety allowlist (see below).

## Setup

```bash
npm install
cp .env.example .env.local
# fill in STEEL_API_KEY and OPENROUTER_API_KEY
npm run dev
```

Open `http://localhost:3000`. The URL field defaults to your own
`/target-portal` — hit "Unleash Swarm" and you'll see N live Steel sessions
fill and submit the mock form.

## Safety guardrail — read before pointing this at a real URL

This tool combines two things that are individually fine but risky together:
CAPTCHA-solving / proxy-based anti-bot evasion, and mass automated form
submission. Pointed at your own mock target, that's just a browser-automation
demo. Pointed at a live third-party site you don't own or have permission to
test — including real listings pulled from PhishTank — it can shade into
unauthorized-access territory regardless of the good intent behind it, and a
false positive (a legitimate site misidentified as a scam) makes that worse.

`lib/targetGuard.ts` enforces this:

- By default, only `localhost` / `127.0.0.1` (i.e. your own `/target-portal`)
  are allowed.
- To add a domain you own (e.g. a staging clone), list it in
  `ALLOWLIST_DOMAINS` in `.env.local`.
- To knowingly target a live, non-allowlisted URL, set
  `ALLOW_LIVE_TARGETS=true`. The UI will show a persistent warning banner
  whenever a launch used this path. Treat this as a deliberate, informed
  choice — not a demo default.

If you want the "grab a live one from PhishTank" wow-moment for judges, use
the bundled cloning tool instead of pointing the fleet at the real thing:

```bash
npm run clone -- "https://<reported-scam-url>" usps-redelivery "USPS Redelivery"
```

This (`scripts/clone-phish.mjs`) fetches the page server-side, strips every
`<script>` tag and inline event handler, removes meta-refresh redirects,
neutralizes all `<form action="...">` attributes, and downloads images/CSS
locally so nothing in the running demo makes a live request back to the
original site. The sanitized result lands at `content/clones/<slug>.html`
and immediately shows up as a "Clone: ..." option in the war room's target
dropdown, served at `/clone-portal/<slug>` — which is on `localhost`, so it's
automatically covered by the default allowlist with zero config changes.

**Always open `content/clones/<slug>.html` and read it before using it live.**

See `DEMO.md` for a full run-of-show, including the `/scammer-db` split-screen
view and answers to the "couldn't this be pointed at anything?" question a
judge will likely ask.

## Pitch notes (from your outline)

- **Hook:** automated phishing is a purely offensive, largely undefended
  space; PhishBait flips the economics by poisoning scrapers' databases with
  convincing synthetic junk faster than they can filter it out.
- **Why Steel:** a single local browser gets IP-blocked instantly; Steel lets
  you spin up a fingerprint-cloaked fleet in seconds, and the live
  `debugUrl` viewer means a human can watch any node in real time — which is
  also just a great demo visual.
- **Unhinged angle:** let the OpenRouter persona generator write a couple of
  paragraphs of rambling "notes" field content per persona — that's your
  Mildred Gable moment for the judges.

## Known limitations / next steps

- The "records poisoned" counter is driven by `/api/target-logs`, which is
  in-memory and resets on server restart — fine for a hackathon demo, swap
  for a real datastore if you keep building this.
- Per-node status (`booting` → `navigating` → `filling` → `submitted`) is
  logged server-side but not yet streamed to the UI beyond the iframe itself;
  wiring that up via SSE or WebSockets is a good "if we have two more hours"
  extension.
- The CSS selector heuristics in `fillPhishingForm` cover common field
  patterns but won't hit every form; for the demo, tailor `/target-portal`'s
  field names/ids to match what you test with.
