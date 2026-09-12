#!/usr/bin/env node
/**
 * clone-phish.mjs
 *
 * Fetches the HTML of a reported phishing/scam page (e.g. a PhishTank listing
 * target) and produces a SANITIZED, LOCAL copy under content/clones/<slug>.html
 * plus locally-downloaded assets under public/clones/<slug>/.
 *
 * This is deliberately conservative:
 *   - All <script> tags are removed.
 *   - All inline event handler attributes (onclick, onload, ...) are stripped.
 *   - Any <meta http-equiv="refresh"> redirect is removed.
 *   - Every <form> has its `action` neutralized — the cloned page never posts
 *     anywhere but your own local /api/target-logs endpoint (wired up by
 *     ClonedFormRenderer.tsx).
 *   - Images and stylesheets are downloaded locally so the running demo makes
 *     zero live requests to the original scam infrastructure.
 *
 * Usage:
 *   node scripts/clone-phish.mjs <url> <slug> ["Display Title"]
 *
 * Example:
 *   node scripts/clone-phish.mjs https://example-flagged-site.tld/track usps-redelivery "USPS Redelivery"
 *
 * IMPORTANT: Run this from your own machine with your own network access —
 * it is not run inside any sandboxed build step. After it finishes, OPEN
 * content/clones/<slug>.html and read it before using it in a demo.
 */

import fs from "node:fs/promises";
import path from "node:path";
import * as cheerio from "cheerio";

const [, , rawUrl, slugArg, titleArg] = process.argv;

if (!rawUrl || !slugArg) {
  console.error("Usage: node scripts/clone-phish.mjs <url> <slug> [\"Display Title\"]");
  process.exit(1);
}

const slug = slugArg.toLowerCase().replace(/[^a-z0-9-]/g, "-");
const displayTitle = titleArg || slug;

const ROOT = path.resolve(process.cwd());
const CONTENT_DIR = path.join(ROOT, "content", "clones");
const ASSET_DIR = path.join(ROOT, "public", "clones", slug);
const MANIFEST_PATH = path.join(CONTENT_DIR, "index.json");

async function main() {
  console.log(`Fetching ${rawUrl} ...`);
  const res = await fetch(rawUrl, {
    headers: { "User-Agent": "Mozilla/5.0 (PhishBait research clone tool)" },
    redirect: "follow",
  });

  if (!res.ok) {
    throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
  }

  const html = await res.text();
  const baseUrl = res.url;
  const $ = cheerio.load(html);

  // 1. Strip all scripts.
  $("script").remove();

  // 2. Strip inline event handlers on every element.
  $("*").each((_, el) => {
    const attribs = el.attribs || {};
    for (const attr of Object.keys(attribs)) {
      if (attr.toLowerCase().startsWith("on")) {
        $(el).removeAttr(attr);
      }
    }
  });

  // 3. Strip meta-refresh redirects.
  $('meta[http-equiv="refresh" i]').remove();

  // 4. Neutralize forms — never submit anywhere but our own local handler.
  $("form").each((_, el) => {
    $(el).attr("action", "javascript:void(0)");
    $(el).attr("method", "post");
    $(el).attr("data-phishbait-form", "true");
  });

  // 5. Download images and stylesheets locally, rewrite src/href.
  await fs.mkdir(ASSET_DIR, { recursive: true });
  let assetCounter = 0;

  async function downloadAsset(url) {
    try {
      const resolved = new URL(url, baseUrl).toString();
      const assetRes = await fetch(resolved, {
        headers: { "User-Agent": "Mozilla/5.0 (PhishBait research clone tool)" },
      });
      if (!assetRes.ok) return null;
      const buf = Buffer.from(await assetRes.arrayBuffer());
      const ext = path.extname(new URL(resolved).pathname) || ".bin";
      const filename = `asset-${assetCounter++}${ext}`;
      await fs.writeFile(path.join(ASSET_DIR, filename), buf);
      return `/clones/${slug}/${filename}`;
    } catch (err) {
      console.warn(`  ! Skipped asset ${url}: ${err.message}`);
      return null;
    }
  }

  const imgEls = $("img[src]").toArray();
  for (const el of imgEls) {
    const src = $(el).attr("src");
    if (!src || src.startsWith("data:")) continue;
    const local = await downloadAsset(src);
    if (local) $(el).attr("src", local);
  }

  const linkEls = $('link[rel="stylesheet"][href]').toArray();
  for (const el of linkEls) {
    const href = $(el).attr("href");
    if (!href) continue;
    const local = await downloadAsset(href);
    if (local) $(el).attr("href", local);
  }

  // 6. Report anything left pointing off-domain, so you can eyeball it.
  const remaining = new Set();
  $("[src], [href]").each((_, el) => {
    const val = $(el).attr("src") || $(el).attr("href");
    if (val && /^https?:\/\//i.test(val)) remaining.add(val);
  });

  await fs.mkdir(CONTENT_DIR, { recursive: true });
  const outHtmlPath = path.join(CONTENT_DIR, `${slug}.html`);
  await fs.writeFile(outHtmlPath, $.html(), "utf-8");

  // 7. Update manifest.
  let manifest = [];
  try {
    manifest = JSON.parse(await fs.readFile(MANIFEST_PATH, "utf-8"));
  } catch {
    manifest = [];
  }
  manifest = manifest.filter((m) => m.slug !== slug);
  manifest.push({
    slug,
    title: displayTitle,
    sourceUrl: rawUrl,
    clonedAt: new Date().toISOString(),
  });
  await fs.writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2), "utf-8");

  console.log(`\nDone.`);
  console.log(`  HTML saved to:   content/clones/${slug}.html`);
  console.log(`  Assets saved to: public/clones/${slug}/`);
  console.log(`  Manifest updated: content/clones/index.json`);
  if (remaining.size > 0) {
    console.log(`\n  Still pointing off-domain (review these manually):`);
    for (const url of remaining) console.log(`    - ${url}`);
  }
  console.log(
    `\n  >>> Open content/clones/${slug}.html and read it before using it in a demo. <<<\n`
  );
}

main().catch((err) => {
  console.error("Clone failed:", err);
  process.exit(1);
});
