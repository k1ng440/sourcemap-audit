#!/usr/bin/env node
/**
 * sourcemap-audit.mjs
 * ===================
 * One-shot tool: detect, download, and reconstruct source maps.
 *
 * FOR RESEARCH AND AUTHORIZED SECURITY AUDITING ONLY.
 * Only use on sites you own or have explicit written permission to test.
 *
 * Copyright (c) 2026 Asaduzzaman Pavel <contact@iampavel.dev>
 * https://iampavel.dev
 * Released under the MIT License.
 */

import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [cmd, ...args], {
      cwd: __dirname,
      stdio: "inherit",
    });
    child.on("close", (code) => {
      if (code !== 0) reject(new Error(`Exit code ${code}`));
      else resolve();
    });
  });
}

  async function main() {
    const args = process.argv.slice(2);
    if (!args.length || args[0].startsWith("-")) {
      console.error("Usage: ./sourcemap_audit.mjs <url> [options]");
      console.error("");
      console.error("Options (passed through to downloader):");
      console.error("  -o, --output <dir>   Output directory (default: ./output)");
      console.error("  -w, --workers <n>    Concurrent workers (default: 5)");
      console.error("  -t, --timeout <ms>   Request timeout ms (default: 30000)");
      console.error("");
      console.error("FOR AUTHORIZED SECURITY RESEARCH ONLY.");
      process.exit(1);
    }

    // Parse flags
    let outputDir = "./output";
    const passthrough = [];
    for (let i = 0; i < args.length; i++) {
      const a = args[i];
      passthrough.push(a);
      if ((a === "-o" || a === "--output") && args[i + 1]) {
        outputDir = args[i + 1];
      }
    }

    const outputAbs = path.resolve(outputDir);
    const reconstructedDir = path.join(path.dirname(outputAbs), "reconstructed");

    console.log("=".repeat(70));
    console.log("SOURCE MAP AUDIT PIPELINE  |  RESEARCH USE ONLY");
    console.log("=".repeat(70));
    console.log("Only use on sites you own or have explicit permission to test.");
    console.log();

    // Phase 1: download
    console.log("[PHASE 1] Detecting and downloading source maps...\n");
    await run(path.join(__dirname, "download-sourcemaps.mjs"), passthrough);

    // Phase 2: reconstruct
    console.log("\n[PHASE 2] Reconstructing original sources...\n");
    await run(path.join(__dirname, "reconstruct.mjs"), [outputDir, reconstructedDir]);

    console.log();
    console.log("=".repeat(70));
    console.log("PIPELINE COMPLETE  |  RESEARCH USE ONLY");
    console.log("=".repeat(70));
    console.log(`Maps saved to:        ${outputAbs}`);
    console.log(`Sources reconstructed: ${reconstructedDir}`);
  }

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
