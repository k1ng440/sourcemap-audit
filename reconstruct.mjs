#!/usr/bin/env node
/**
 * Source Map Reconstructor
 * ========================
 * Reads all .map files under <input_dir> and reconstructs the original
 * TypeScript/JavaScript sources into a clean folder structure.
 *
 * Paths are sanitized to prevent traversal attacks and webpack:// / ng://
 * virtual prefixes are stripped.
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

function stripProtocol(p) {
  for (const proto of ["webpack:///", "webpack://", "ng://"]) {
    if (p.startsWith(proto)) {
      p = p.slice(proto.length);
    }
  }
  return p;
}

function sanitize(p) {
  p = stripProtocol(p);
  p = p.replace(/\\/g, "/");
  const parts = p.split("/");
  const safe = [];
  for (const part of parts) {
    if (part === "" || part === ".") continue;
    if (part === "..") {
      if (safe.length) safe.pop();
      continue;
    }
    safe.push(part);
  }
  return safe.length ? safe.join("/") : "unknown";
}

async function* walk(dir) {
  const entries = await fs.promises.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(full);
    } else if (entry.isFile() && entry.name.endsWith(".map")) {
      yield full;
    }
  }
}

async function processMap(mapPath, outputRoot) {
  console.log(`[*] Processing ${mapPath}`);
  let data;
  try {
    const text = await fs.promises.readFile(mapPath, "utf-8");
    data = JSON.parse(text);
  } catch (e) {
    console.log(`  [!] Parse error: ${e.message}`);
    return;
  }

  const sources = data.sources || [];
  const contents = data.sourcesContent || [];

  if (!sources.length) {
    console.log("  [-] No sources array");
    return;
  }
  if (!contents.length) {
    console.log("  [-] No sourcesContent (external-only map)");
    return;
  }

  let extracted = 0;
  for (let i = 0; i < sources.length; i++) {
    if (i >= contents.length) {
      console.log(`  [-] Missing content for: ${sources[i]}`);
      continue;
    }

    const rel = sanitize(sources[i]) || `unknown_${i}.js`;
    const out = path.join(outputRoot, rel);
    try {
      await fs.promises.mkdir(path.dirname(out), { recursive: true });
      await fs.promises.writeFile(out, contents[i], "utf-8");
      extracted++;
    } catch (e) {
      console.log(`  [!] Failed to write ${out}: ${e.message}`);
    }
  }
  console.log(`  [+] Extracted ${extracted}/${sources.length} files`);
}

async function main() {
  const args = process.argv.slice(2);
  const inputDir = path.resolve(args[0] || "./output");
  const outputDir = path.resolve(args[1] || "./reconstructed");

  if (!fs.existsSync(inputDir)) {
    console.error(`[!] Input directory does not exist: ${inputDir}`);
    process.exit(1);
  }

  const maps = [];
  for await (const m of walk(inputDir)) {
    maps.push(m);
  }
  maps.sort();

  if (!maps.length) {
    console.error(`[!] No .map files found under ${inputDir}`);
    process.exit(1);
  }

  console.log(`[*] Found ${maps.length} map file(s)\n`);
  for (const m of maps) {
    await processMap(m, outputDir);
  }
  console.log(`\n[*] Done. Reconstructed sources in: ${outputDir}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
