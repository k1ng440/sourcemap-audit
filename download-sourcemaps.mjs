#!/usr/bin/env node
/**
 * download-sourcemaps.mjs
 * =======================
 * Detect exposed source maps on a target site and download them.
 * Pure Node.js — no Python required.
 *
 * FOR RESEARCH AND AUTHORIZED SECURITY AUDITING ONLY.
 * Only use on sites you own or have explicit written permission to test.
 *
 * Copyright (c) 2026 Asaduzzaman Pavel <contact@iampavel.dev>
 * https://iampavel.dev
 * Released under the MIT License.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const USER_AGENT =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function resolveUrl(url, base) {
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return new URL(url, base).href;
}

async function fetchText(url, timeoutMs = 30000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: controller.signal,
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchBuffer(url, timeoutMs = 30000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: controller.signal,
    });
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function findJsFiles(html, baseUrl) {
  const found = new Set();
  // <script src="...">
  const scriptRe = /<script[^>]+src=["']([^"']+)["']/gi;
  let m;
  while ((m = scriptRe.exec(html)) !== null) {
    const u = resolveUrl(m[1], baseUrl);
    if (u.endsWith(".js")) found.add(u);
  }
  // dynamic imports
  const importRe = /import\s*\(?\s*["']([^"']+)["']/gi;
  while ((m = importRe.exec(html)) !== null) {
    const u = resolveUrl(m[1], baseUrl);
    if (u.includes(".js")) found.add(u);
  }
  return Array.from(found);
}

function checkSourcemap(jsUrl, jsContent) {
  const re = /#\s*sourceMappingURL=([^\s\n\r]+)/;
  const match = re.exec(jsContent);
  if (!match) return null;
  const mapPath = match[1];
  const mapUrl = resolveUrl(mapPath, jsUrl);
  return { jsUrl, mapUrl, mapPath };
}

async function downloadSourcemap(mapInfo, outputDir, timeoutMs) {
  const { mapUrl, jsUrl } = mapInfo;
  const parsed = new URL(mapUrl);
  let filename = path.basename(parsed.pathname);
  if (!filename || filename === "/") {
    const jsName = path.basename(new URL(jsUrl).pathname) || "unknown";
    filename = `${jsName}.map`;
  }
  const outPath = path.join(outputDir, filename);

  console.log(`[*] Downloading ${mapUrl}`);
  const buf = await fetchBuffer(mapUrl, timeoutMs);
  if (!buf) {
    console.log(`  [FAIL] Could not fetch ${mapUrl}`);
    return null;
  }
  const text = buf.toString("utf-8");
  if (!text.includes('"version"') || !text.includes('"mappings"')) {
    console.log(`  [SKIP] Not a valid source map`);
    return null;
  }
  await fs.promises.mkdir(outputDir, { recursive: true });
  await fs.promises.writeFile(outPath, buf);
  console.log(`  [SUCCESS] Saved to ${outPath}`);
  return outPath;
}

async function runWithConcurrency(tasks, maxWorkers) {
  const results = [];
  let i = 0;
  async function worker() {
    while (i < tasks.length) {
      const idx = i++;
      try {
        results[idx] = await tasks[idx]();
      } catch (e) {
        results[idx] = null;
      }
    }
  }
  const workers = Array.from({ length: maxWorkers }, () => worker());
  await Promise.all(workers);
  return results;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args[0].startsWith("-")) {
    console.error(`Usage: ./download_sourcemaps.mjs <url> [options]`);
    console.error(`Options:`);
    console.error(`  -o, --output <dir>   Output directory (default: ./output)`);
    console.error(`  -w, --workers <n>    Concurrent workers (default: 5)`);
    console.error(`  -t, --timeout <ms>   Request timeout ms (default: 30000)`);
    console.error("");
    console.error("FOR AUTHORIZED SECURITY RESEARCH ONLY.");
    process.exit(1);
  }

  let baseUrl = args[0];
  if (!baseUrl.startsWith("http://") && !baseUrl.startsWith("https://")) {
    console.error("[!] URL must start with http:// or https://");
    process.exit(1);
  }
  baseUrl = baseUrl.replace(/\/$/, "");

  let outputDir = "./output";
  let workers = 5;
  let timeoutMs = 30000;

  for (let i = 1; i < args.length; i++) {
    const flag = args[i];
    const next = args[i + 1];
    if ((flag === "-o" || flag === "--output") && next) {
      outputDir = next;
      i++;
    } else if ((flag === "-w" || flag === "--workers") && next) {
      workers = parseInt(next, 10) || 5;
      i++;
    } else if ((flag === "-t" || flag === "--timeout") && next) {
      timeoutMs = parseInt(next, 10) || 30000;
      i++;
    }
  }

  console.log("=".repeat(60));
  console.log("SOURCE MAP SECURITY AUDITOR  |  RESEARCH USE ONLY");
  console.log("=".repeat(60));
  console.log("Only use on sites you own or have explicit permission to test.");
  console.log();

  // Step 1: find JS files
  console.log(`[*] Scanning ${baseUrl} for JavaScript files...`);
  let jsFiles = [];
  const html = await fetchText(baseUrl, timeoutMs);
  if (html) {
    jsFiles = findJsFiles(html, baseUrl);
  }
  // Also check common index paths
  const commonPaths = ["/index.html", "/app", "/main", "/"];
  for (const p of commonPaths) {
    if (jsFiles.length) break; // skip if already found
    const content = await fetchText(baseUrl + p, timeoutMs);
    if (content) {
      jsFiles = findJsFiles(content, baseUrl);
    }
  }

  console.log(`[*] Found ${jsFiles.length} JavaScript file(s)`);
  for (const js of jsFiles) console.log(`    [+] ${js}`);
  console.log();

  if (!jsFiles.length) {
    console.log("[!] No JS files found. Nothing to audit.");
    return;
  }

  // Step 2: check source maps
  console.log(`[*] Checking ${jsFiles.length} files for source map references...`);
  const mapTasks = jsFiles.map((js) => async () => {
    const content = await fetchText(js, timeoutMs);
    if (!content) return null;
    return checkSourcemap(js, content);
  });
  const mapResults = await runWithConcurrency(mapTasks, workers);
  const mapsFound = mapResults.filter(Boolean);

  for (const m of mapsFound) console.log(`  [FOUND] ${m.mapUrl}`);
  console.log();
  console.log(`[*] Found ${mapsFound.length} exposed source map(s)`);
  console.log();

  if (!mapsFound.length) {
    console.log("[+] No exposed source maps detected. Good security posture!");
    return;
  }

  // Step 3: download
  console.log(`[*] Downloading source maps to: ${outputDir}`);
  const outDirAbs = path.resolve(outputDir);
  let success = 0;
  for (const info of mapsFound) {
    const saved = await downloadSourcemap(info, outDirAbs, timeoutMs);
    if (saved) success++;
  }

  console.log();
  console.log("=".repeat(60));
  console.log("AUDIT COMPLETE  |  RESEARCH USE ONLY");
  console.log("=".repeat(60));
  console.log(`JS files scanned:      ${jsFiles.length}`);
  console.log(`Source maps found:     ${mapsFound.length}`);
  console.log(`Source maps downloaded: ${success}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
