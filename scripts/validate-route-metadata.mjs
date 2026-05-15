#!/usr/bin/env node
/**
 * Per-route metadata validator for ghost.megabyte.space.
 *
 * Walks every .html file under public/ and asserts:
 *   - <title> exists (HARD FAIL on missing)
 *   - <meta name="description"> exists (HARD FAIL on missing)
 *   - Titles are unique across routes (HARD FAIL on duplicate)
 *   - Meta descriptions are unique across routes (HARD FAIL on duplicate)
 *   - WARN (not fail) when title is outside 50-60 chars or desc outside 120-156
 *
 * Wired into `pnpm run prestamp` so every build blocks on missing/duplicate
 * title + meta-desc before `stamp-cache.mjs` rewrites cache busters and
 * `wrangler deploy` ships the bundle.
 *
 * Exit codes: 0 = clean, 1 = at least one HARD failure.
 *
 * Pages excluded from uniqueness checks (intentionally noindex/utility):
 *   - public/offline.html  (PWA offline shell)
 *   - public/404.html      (error page)
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, "..");
const PUBLIC_DIR = join(ROOT, "public");
const NOINDEX_FILES = new Set(["offline.html", "404.html"]);

const TITLE_MIN = 50;
const TITLE_MAX = 60;
const DESC_MIN = 120;
const DESC_MAX = 156;

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) out.push(...walk(full));
    else if (extname(name) === ".html") out.push(full);
  }
  return out;
}

function extractTitle(html) {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m ? m[1].trim().replace(/\s+/g, " ") : null;
}

function extractMetaDescription(html) {
  const re = /<meta\s+[^>]*name\s*=\s*["']description["'][^>]*>/gi;
  const tags = html.match(re) ?? [];
  for (const tag of tags) {
    const c = tag.match(/content\s*=\s*["']([^"']*)["']/i);
    if (c) return c[1].trim().replace(/\s+/g, " ");
  }
  return null;
}

const files = walk(PUBLIC_DIR);
const failures = [];
const warnings = [];
const titles = new Map();
const descs = new Map();

for (const f of files) {
  const rel = relative(ROOT, f);
  const base = rel.split("/").pop() ?? "";
  const html = readFileSync(f, "utf8");
  const title = extractTitle(html);
  const desc = extractMetaDescription(html);

  if (!title) failures.push(`${rel}: missing <title>`);
  if (!desc) failures.push(`${rel}: missing <meta name="description">`);

  if (title && !NOINDEX_FILES.has(base)) {
    const key = title.toLowerCase();
    if (titles.has(key)) failures.push(`${rel}: duplicate title (also in ${titles.get(key)}): "${title}"`);
    else titles.set(key, rel);
  }
  if (desc && !NOINDEX_FILES.has(base)) {
    const key = desc.toLowerCase();
    if (descs.has(key)) failures.push(`${rel}: duplicate meta-description (also in ${descs.get(key)})`);
    else descs.set(key, rel);
  }

  if (title) {
    const n = title.length;
    if (n < TITLE_MIN || n > TITLE_MAX) warnings.push(`${rel}: title ${n} chars (target ${TITLE_MIN}-${TITLE_MAX}): "${title}"`);
  }
  if (desc) {
    const n = desc.length;
    if (n < DESC_MIN || n > DESC_MAX) warnings.push(`${rel}: meta-description ${n} chars (target ${DESC_MIN}-${DESC_MAX})`);
  }
}

console.log(`[validate-route-metadata] scanned ${files.length} html files`);
for (const w of warnings) console.warn(`[warn] ${w}`);
if (failures.length > 0) {
  console.error(`\n[validate-route-metadata] ${failures.length} HARD failure(s):`);
  for (const e of failures) console.error(`  ✗ ${e}`);
  process.exit(1);
}
console.log(`[validate-route-metadata] ok (${warnings.length} warning${warnings.length === 1 ? "" : "s"})`);
