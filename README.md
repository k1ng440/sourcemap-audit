# sourcemap-reconstruct

> Download exposed JavaScript source maps and reconstruct the original TypeScript / JavaScript source tree.

**For authorized security research and auditing only.** Only use on sites you own or have explicit written permission to test.

---

## Purpose

This tool helps developers and security researchers identify if a website is accidentally shipping source maps (and thus source code) to production.

---

## Install

```bash
# Clone
git clone https://github.com/yourname/sourcemap-reconstruct.git
cd sourcemap-reconstruct

# Or use directly — requires Node.js >= 18
node --version   # must be v18+
```

---

## Quick Start

### One-shot audit

```bash
./sourcemap_audit.mjs https://example.com -o ./output -w 10
```

This will:
1. Scan the site for JS files
2. Detect source map references
3. Download the `.map` files into `./output`
4. Reconstruct the original TS/JS sources into `./reconstructed`

### Step by step

```bash
# 1. Detect + download
./download_sourcemaps.mjs https://example.com -o ./output -w 10

# 2. Reconstruct files
./reconstruct.mjs ./output ./reconstructed
```

---

## CLI Reference

### `download_sourcemaps.mjs`

```
./download_sourcemaps.mjs <url> [options]

Options:
  -o, --output <dir>    Output directory for .map files (default: ./output)
  -w, --workers <n>     Concurrent download workers (default: 5)
  -t, --timeout <ms>    Request timeout in ms (default: 30000)
```

### `reconstruct.mjs`

```
./reconstruct.mjs [input_dir] [output_dir]

  input_dir   Directory containing *.map files (default: ./output)
  output_dir  Root for reconstructed sources (default: ./reconstructed)
```

### `sourcemap_audit.mjs`

```
./sourcemap_audit.mjs <url> [options]

  Combines downloader + reconstructor into a single run.
```

---

## Path Sanitization

Source map `sources` entries often contain prefixes like `webpack://` or `ng://`. The reconstructor strips these and collapses relative path components (`..`) safely to prevent directory traversal attacks.

---

## Requirements

- **Node.js** >= 18 (uses native `fetch`)

---

## Ethical Usage

- **Only use on your own websites or those you have explicit written permission to test.**
- If you discover exposed source maps on a third-party site, **report it** — do not exploit it.
- This tool is for **security auditing and research only**.

---

## License

MIT © 2026
