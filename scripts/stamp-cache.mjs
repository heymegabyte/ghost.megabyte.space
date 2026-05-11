#!/usr/bin/env node
/**
 * Build-time cache-buster stamper for ghost.megabyte.space.
 *
 * Walks every .html file under public/ and rewrites query strings that look
 * like cache busters (`?v=…`) to the current short git SHA plus epoch seconds.
 *
 * Usage:
 *   node scripts/stamp-cache.mjs            # in-place rewrite
 *   node scripts/stamp-cache.mjs --dry      # print planned edits without writing
 *
 * Hook into pnpm deploy with `pnpm prestamp && wrangler deploy` (or run from CI).
 *
 * Idempotent: re-stamps already-stamped URLs with a fresh sha-timestamp.
 */

import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, "..");
const PUBLIC_DIR = join(ROOT, "public");
const DRY = process.argv.includes("--dry");

function gitShortSha() {
  try {
    return execSync("git rev-parse --short HEAD", { cwd: ROOT }).toString().trim();
  } catch {
    return "nohash";
  }
}

function buildStamp() {
  const sha = gitShortSha();
  const ts = Math.floor(Date.now() / 1000);
  return `${sha}-${ts}`;
}

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

const STAMP = buildStamp();

// Match: src|href|srcset|content="/path/to/asset.ext?v=anything"
// Rewrite the ?v=… token to ?v=<STAMP>. Preserves anchor fragments.
const QUERY_RE = /(\.(?:js|mjs|css|webp|png|jpg|jpeg|svg|woff2?|ico|json|webmanifest|html))\?v=[A-Za-z0-9._-]+/g;

const files = walk(PUBLIC_DIR);
let totalEdits = 0;
for (const f of files) {
  const original = readFileSync(f, "utf8");
  let edits = 0;
  const next = original.replace(QUERY_RE, (m, ext) => {
    edits += 1;
    return `${ext}?v=${STAMP}`;
  });
  if (edits > 0) {
    totalEdits += edits;
    const rel = relative(ROOT, f);
    if (DRY) {
      console.log(`[dry] ${rel}: ${edits} cache-buster${edits === 1 ? "" : "s"} would rotate → ?v=${STAMP}`);
    } else {
      writeFileSync(f, next, "utf8");
      console.log(`[stamp] ${rel}: ${edits} cache-buster${edits === 1 ? "" : "s"} → ?v=${STAMP}`);
    }
  }
}

console.log(
  `\n${DRY ? "[dry] " : ""}${files.length} html files scanned, ${totalEdits} cache-busters ${DRY ? "would be " : ""}rotated to ?v=${STAMP}.`,
);
