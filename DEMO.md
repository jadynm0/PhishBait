# PhishBait — Demo Runbook

## Before the event

1. **Clone your scenario(s) ahead of time — not live on stage.**
   ```bash
   npm run clone -- "https://<reported-scam-url>" usps-redelivery "USPS Redelivery"
   ```
   Do this from your own laptop with normal network access, at home or in
   your hotel room, a day before — not on venue wifi, not during judging.
   Open `content/clones/usps-redelivery.html` afterward and actually read it.
   Clone 2–3 scenarios so you have a backup if one looks broken.

2. **Rehearse against the clone, not the live site, from here on.** Once
   it's cloned it's just a local Next.js route — no network dependency, no
   risk of the source site going down mid-pitch (this was literally a risk
   your own outline flagged).

3. **Time-box a full dry run.** Steel session boot + navigate + fill + submit
   for 5 nodes typically takes a bit to visually settle — run it twice back
   to back so you know the real timing, not the optimistic timing.

4. **Record a 30–45s backup video** of a full successful run. Venue wifi at
   hackathons fails judges' demos more often than code bugs do. If Steel
   hiccups live, you cut to video and keep talking.

## Screen layout

Two windows/tabs, arranged side by side (or one ultrawide split):

- **Left: `/scammer-db`** — the black-terminal "captured records" view.
  Hit "flush" right before you go on stage so the counter starts at zero on
  camera.
- **Right: `/` (the war room)** — where you'll trigger the swarm.

## Suggested run of show (~2 minutes)

1. **Hook (20s).** Say the line about phishing being purely defensive today.
   Don't touch the keyboard yet — let it land.
2. **Show the target (15s).** Switch briefly to the clone-portal tab so
   judges see what a normal victim would see. "This is a real reported scam
   page — we cloned it locally so we're not touching their live
   infrastructure during a demo."
3. **Unleash the swarm (10s).** Back to the war room. Pick the clone from
   the dropdown, hit Unleash Swarm.
4. **Let it breathe (30–40s).** While the 5 iframes boot/navigate/fill, talk
   over it: why Steel (fingerprint-cloaked fleet vs. one browser getting
   IP-blocked instantly), why the live debug view matters (a human can
   supervise any node).
5. **Cut to the scammer-db view (15s).** Records ticking up in real time.
   This is your best visual beat — let it run for a few seconds in silence.
6. **The unhinged beat (15s).** Read out loud one of the generated "notes"
   fields — this is your Mildred-Gable moment. Judges laugh, memorable.
7. **Close (10s).** One line on what you'd build next (real-time status per
   node, a scoring model for which scam families are most worth targeting).

## Anticipate the ethics question

Someone on the panel will likely ask "couldn't this be pointed at anything?"
Have this ready, calmly:

- The fleet only ever targets `localhost` by default (`lib/targetGuard.ts`);
  live targeting is an explicit opt-in flag, not a default.
- The "live" demo you just watched was a locally-hosted, sanitized clone —
  scripts stripped, assets local, forms rerouted to our own logger. Nothing
  in the demo made a live request to the original scam infrastructure.
- That's a deliberate design choice, not a limitation you're apologizing
  for — lead with it as the thing that makes this responsibly shippable.

## Fallback checklist (things that break demos)

- [ ] Venue wifi tested with your actual laptop, not assumed
- [ ] `.env.local` has valid `STEEL_API_KEY` / `ANTHROPIC_API_KEY` — test
      same morning, keys can expire or hit quota
- [ ] Backup video recorded and playable offline
- [ ] `/scammer-db` flushed right before going on stage
- [ ] At least one clone tested end-to-end within the last hour
