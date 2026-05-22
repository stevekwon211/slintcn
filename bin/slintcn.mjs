#!/usr/bin/env node
/**
 * slintcn CLI — init + add (copy-paste registry, shadcn-style).
 */
import { copyFile, mkdir, readFile, writeFile, access } from "node:fs/promises";
import { constants, realpathSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const sha256 = (s) => createHash("sha256").update(s).digest("hex");
const toPosix = (p) => p.split(path.sep).join("/");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

async function exists(p) {
  try {
    await access(p, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function loadRegistry(style) {
  const registryPath = path.join(ROOT, "registry", style, "registry.json");
  const raw = await readFile(registryPath, "utf8");
  return JSON.parse(raw);
}

/**
 * Flatten a registry into a uniform catalog of items (theme + components),
 * each `{ name, type, title, description, category, files, requires }`.
 * Pure — no I/O, no console — so it's unit-testable.
 */
export function catalogFromRegistry(registry) {
  const items = [];
  if (registry.theme) items.push({ name: "theme", requires: [], ...registry.theme });
  for (const [name, spec] of Object.entries(registry.components ?? {})) {
    items.push({ name, requires: [], ...spec });
  }
  return items;
}

/** Look up a single item (theme or a component) by name. */
export function itemByName(registry, name) {
  if (name === "theme") return registry.theme ? { name: "theme", ...registry.theme } : null;
  const spec = registry.components?.[name];
  return spec ? { name, ...spec } : null;
}

/**
 * Build a resolved registry-item: metadata + each file's source inlined as
 * `content`. `readSource(rel)` reads a registry-relative .slint path — injected
 * so this is testable without touching disk.
 */
export async function buildRegistryItem(name, registry, readSource) {
  const item = itemByName(registry, name);
  if (!item) throw new Error(`Unknown item: ${name}`);
  const files = [];
  for (const rel of item.files) {
    files.push({ path: rel, content: await readSource(rel), type: "text/slint" });
  }
  return {
    name,
    type: item.type ?? "registry:ui",
    title: item.title ?? name,
    description: item.description ?? "",
    category: item.category ?? "misc",
    registryDependencies: item.requires ?? [],
    files,
  };
}

async function loadRawConfig(cwd) {
  const configPath = path.join(cwd, "slintcn.json");
  if (!(await exists(configPath))) return null;
  return JSON.parse(await readFile(configPath, "utf8"));
}

/**
 * Fill defaults for any keys the user hasn't set. The resolved config carries
 * absolute paths so downstream code doesn't have to think about cwd.
 */
export function resolveConfig(rawConfig, cwd) {
  const outDir = path.resolve(cwd, rawConfig?.outDir ?? "ui/slintcn");
  const themeDir = rawConfig?.themeDir
    ? path.resolve(cwd, rawConfig.themeDir)
    : path.join(outDir, "theme");
  const componentsDir = rawConfig?.componentsDir
    ? path.resolve(cwd, rawConfig.componentsDir)
    : path.join(outDir, "components");
  const blocksDir = rawConfig?.blocksDir
    ? path.resolve(cwd, rawConfig.blocksDir)
    : path.join(outDir, "blocks");
  return {
    style: rawConfig?.style ?? "default",
    baseColor: rawConfig?.baseColor ?? "neutral",
    registries: rawConfig?.registries ?? {},
    outDir,
    themeDir,
    componentsDir,
    blocksDir,
    // Adoption mode (all opt-in; absent = standalone behavior unchanged):
    externalTokens: rawConfig?.externalTokens ? path.resolve(cwd, rawConfig.externalTokens) : null,
    importMap: rawConfig?.importMap ?? {},
    fileNameStyle: rawConfig?.fileNameStyle ?? "kebab",
    overwrite: rawConfig?.overwrite ?? true,
  };
}

/** Apply the configured filename style to a path's .slint basename (snake ⇒ '-'→'_'). */
export function styleFileName(p, style) {
  if (style !== "snake") return p;
  const slash = p.lastIndexOf("/");
  const dir = slash >= 0 ? p.slice(0, slash + 1) : "";
  return dir + p.slice(dir.length).replace(/-/g, "_");
}

/**
 * Classify an `add` token into a local name, a remote URL, or a namespaced
 * `@ns/name` ref (resolved against config.registries). Pure — testable
 * without network. Throws on a malformed/unknown namespace.
 */
export function classifyRequest(token, config = {}) {
  if (/^https?:\/\//.test(token)) return { kind: "url", url: token };
  if (token.startsWith("@")) {
    const m = token.match(/^@([^/]+)\/(.+)$/);
    if (!m) throw new Error(`Invalid namespaced ref: ${token} (expected @ns/name)`);
    const [, ns, name] = m;
    const base = config.registries?.[ns];
    if (!base) {
      throw new Error(`Unknown registry namespace "@${ns}". Add it to slintcn.json "registries".`);
    }
    return { kind: "url", url: `${base.replace(/\/$/, "")}/r/${name}.json` };
  }
  return { kind: "local", name: token };
}

/** Fetch a built registry-item JSON. `fetchFn` injectable for tests. */
export async function fetchRegistryItem(url, fetchFn = fetch) {
  const res = await fetchFn(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return res.json();
}

/**
 * Map a registry-relative file (e.g. "components/button.slint") to its
 * absolute destination based on the user's themeDir / componentsDir.
 */
export function routeDest(rel, config) {
  const style = (n) => styleFileName(n, config.fileNameStyle ?? "kebab");
  if (rel.startsWith("theme/")) {
    return path.join(config.themeDir, style(rel.slice("theme/".length)));
  }
  if (rel.startsWith("components/")) {
    return path.join(config.componentsDir, style(rel.slice("components/".length)));
  }
  if (rel.startsWith("blocks/")) {
    return path.join(config.blocksDir, style(rel.slice("blocks/".length)));
  }
  return path.join(config.outDir, rel);
}

/**
 * Rewrite registry-relative imports (`from "../theme/X.slint"` and
 * `from "../components/Y.slint"`) to be relative to the destination file's
 * own location, so the user's themeDir / componentsDir layout choices are
 * honored. Other imports pass through untouched.
 */
export function rewriteImports(content, config, destAbs) {
  const { themeDir, componentsDir, blocksDir, externalTokens } = config;
  const importMap = config.importMap ?? {};
  const style = (n) => styleFileName(n, config.fileNameStyle ?? "kebab");
  const toRel = (absTarget) => {
    let rel = path.relative(path.dirname(destAbs), absTarget);
    if (!rel.startsWith(".") && !rel.startsWith("/")) rel = "./" + rel;
    return rel.split(path.sep).join("/"); // Slint uses '/' on every OS
  };

  return content.replace(/from\s+"([^"]+)"/g, (match, imp) => {
    // 1. explicit import-map override (highest precedence)
    if (Object.prototype.hasOwnProperty.call(importMap, imp)) return `from "${importMap[imp]}"`;
    // 2. theme — redirect to external Tokens when configured
    if (imp.startsWith("../theme/")) {
      const file = imp.slice("../theme/".length);
      if (externalTokens && file.startsWith("tokens.")) return `from "${toRel(externalTokens)}"`;
      return `from "${toRel(path.join(themeDir, style(file)))}"`;
    }
    // 3. blocks
    if (imp.startsWith("../blocks/")) {
      return `from "${toRel(path.join(blocksDir, style(imp.slice("../blocks/".length))))}"`;
    }
    // 4. components (block → component refs)
    if (imp.startsWith("../components/")) {
      return `from "${toRel(path.join(componentsDir, style(imp.slice("../components/".length))))}"`;
    }
    // 5. bare sibling component import (same dir) — honor filename style
    if (!imp.includes("/") && imp.endsWith(".slint") && !imp.startsWith("std-widgets")) {
      return `from "${style(imp)}"`;
    }
    return match; // std-widgets / unrecognized → untouched
  });
}

// `srcRel` lets the source differ from the destination path (used for
// base-color palette variants: read palette-zinc.slint, write palette.slint).
// Resolve a registry file → its rewritten content + destination + planned
// action. Writes unless `dryRun`; skips an existing file unless `overwrite`.
// `srcRel` lets the source differ from the dest (base-color palette variants).
async function copyRegistryFile(rel, config, opts = {}) {
  const { srcRel = rel, dryRun = false, overwrite = config.overwrite ?? true } = opts;
  const src = path.join(ROOT, "registry", config.style, srcRel);
  const dest = routeDest(rel, config);
  const content = rewriteImports(await readFile(src, "utf8"), config, dest);
  const existed = await exists(dest);
  if (existed && !overwrite) return { dest, content, status: "skip" };
  const status = existed ? "overwrite" : "new";
  if (!dryRun) {
    await mkdir(path.dirname(dest), { recursive: true });
    await writeFile(dest, content);
  }
  return { dest, content, status };
}

async function cmdInit(cwd, opts = {}) {
  const configPath = path.join(cwd, "slintcn.json");
  if (await exists(configPath)) {
    console.log("slintcn.json already exists — skipping init");
    return resolveConfig(await loadRawConfig(cwd), cwd);
  }
  const raw = JSON.parse(await readFile(path.join(ROOT, "templates", "slintcn.json"), "utf8"));
  if (opts.baseColor) raw.baseColor = opts.baseColor;
  await writeFile(configPath, JSON.stringify(raw, null, 2) + "\n");
  console.log(`Created slintcn.json${opts.baseColor ? ` (baseColor: ${opts.baseColor})` : ""}`);

  // If this looks like a Rust crate, print a copy-pasteable build.rs
  // snippet so the user can wire slint_build to invoke slintcn add on
  // every cargo build. We deliberately don't write to their crate.
  if (await exists(path.join(cwd, "Cargo.toml"))) {
    const slintcnPath = path.relative(cwd, path.join(ROOT, "bin", "slintcn.mjs"));
    console.log(`
Detected a Rust crate. Paste this into build.rs to keep the registry in sync
with every cargo build:

  use std::fs;
  use std::process::Command;
  fn main() {
      let _ = fs::remove_dir_all("ui/slintcn");
      let status = Command::new("node")
          .arg("${slintcnPath}")
          .args(["add", "button", "input", "dialog"])  // your components
          .status()
          .expect("need Node 20+ on PATH for the slintcn CLI");
      assert!(status.success(), "slintcn add failed");
      println!("cargo:rerun-if-changed=${path.dirname(slintcnPath)}/../registry/default");
      println!("cargo:rerun-if-changed=slintcn.json");
      slint_build::compile("ui/app_window.slint").unwrap();
  }
`);
  }

  return resolveConfig(raw, cwd);
}

/**
 * Topologically resolve a set of requested install names — including the
 * special "theme" pseudo-name — into a flat install order, deduplicated,
 * with each name's dependencies preceding it. Throws on unknown names.
 */
export function resolveInstallOrder(requestedNames, registry) {
  const ordered = [];
  const visited = new Set();
  const visit = (name) => {
    if (visited.has(name)) return;
    visited.add(name);
    if (name === "theme") {
      ordered.push("theme");
      return;
    }
    const spec = registry.components?.[name];
    if (!spec) {
      const available = ["theme", ...Object.keys(registry.components ?? {})];
      throw new Error(`Unknown component: ${name}. Available: ${available.join(", ")}`);
    }
    for (const req of spec.requires ?? []) visit(req);
    ordered.push(name);
  };
  for (const n of requestedNames) visit(n);
  return ordered;
}

const STATUS_MARK = { new: "+", overwrite: "~", skip: "=" };

async function installItem(name, config, registry, cwd, opts = {}) {
  const { dryRun = false, overwrite = config.overwrite ?? true } = opts;
  const records = [];
  const record = (r) => { records.push(r); console.log(`  ${STATUS_MARK[r.status]} ${path.relative(cwd, r.dest)}`); };

  if (name === "theme") {
    // Adoption: with external tokens, don't install the theme at all — the
    // import rewriter points components at the host's Tokens.
    if (config.externalTokens) {
      console.log(`  = theme — external (${path.relative(cwd, config.externalTokens)}), skipped`);
      return records;
    }
    for (const rel of registry.theme.files) {
      // base-color: read the chosen palette variant, still write palette.slint.
      let srcRel = rel;
      if (rel === "theme/palette.slint" && config.baseColor && config.baseColor !== "neutral") {
        const variant = `theme/palette-${config.baseColor}.slint`;
        if (await exists(path.join(ROOT, "registry", config.style, variant))) srcRel = variant;
      }
      // theme is a shared dep → install once; never clobber an existing theme.
      record(await copyRegistryFile(rel, config, { srcRel, dryRun, overwrite: false }));
    }
    return records;
  }

  const spec = registry.components[name];
  for (const rel of spec.files) {
    record(await copyRegistryFile(rel, config, { dryRun, overwrite }));
  }
  return records;
}

/**
 * Install a remote registry item (the `slintcn build` shape: metadata +
 * inlined file `content`). Resolves `registryDependencies` recursively against
 * the item URL's own directory, dedupes via a shared visited set, then writes
 * each file through the same import-rewriting as local installs.
 */
export async function installRemoteItem(url, config, cwd, opts = {}) {
  const { fetchFn = fetch, visited = new Set(), log = () => {} } = opts;
  if (visited.has(url)) return;
  visited.add(url);

  const item = await fetchRegistryItem(url, fetchFn);
  const base = url.slice(0, url.lastIndexOf("/") + 1);
  for (const dep of item.registryDependencies ?? []) {
    await installRemoteItem(`${base}${dep}.json`, config, cwd, { fetchFn, visited, log });
  }
  for (const file of item.files ?? []) {
    const dest = routeDest(file.path, config);
    await mkdir(path.dirname(dest), { recursive: true });
    await writeFile(dest, rewriteImports(file.content, config, dest));
    log(`  + ${path.relative(cwd, dest)}`);
  }
}

async function buildAddConfig(cwd, opts) {
  let rawConfig = await loadRawConfig(cwd);
  if (!rawConfig) {
    if (opts.dryRun) rawConfig = {};            // don't create slintcn.json on a dry run
    else { await cmdInit(cwd); rawConfig = await loadRawConfig(cwd); }
  }
  rawConfig = { ...rawConfig };
  if (opts.componentsDir) rawConfig.componentsDir = opts.componentsDir;
  if (opts.externalTokens) rawConfig.externalTokens = opts.externalTokens;
  if (opts.fileNameStyle) rawConfig.fileNameStyle = opts.fileNameStyle;
  if (opts.overwrite === false) rawConfig.overwrite = false;
  if (opts.importMapFile) {
    const m = JSON.parse(await readFile(path.resolve(cwd, opts.importMapFile), "utf8"));
    rawConfig.importMap = { ...(rawConfig.importMap || {}), ...m };
  }
  return resolveConfig(rawConfig, cwd);
}

async function writeLock(cwd, entries) {
  if (!Object.keys(entries).length) return;
  const p = path.join(cwd, "slintcn.lock.json");
  const lock = (await exists(p)) ? JSON.parse(await readFile(p, "utf8")) : {};
  await writeFile(p, JSON.stringify({ ...lock, ...entries }, null, 2) + "\n");
}

async function cmdAdd(cwd, tokens, opts = {}) {
  const dryRun = !!opts.dryRun;
  const config = await buildAddConfig(cwd, opts);

  let classified;
  try {
    classified = (tokens.length === 0 ? ["theme"] : tokens).map((t) => classifyRequest(t, config));
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }

  const lock = {};
  const localNames = classified.filter((c) => c.kind === "local").map((c) => c.name);
  if (localNames.length > 0) {
    const registry = await loadRegistry(config.style);
    let order;
    try {
      order = resolveInstallOrder(localNames, registry);
    } catch (err) {
      console.error(err.message);
      process.exit(1);
    }
    for (const name of order) {
      const recs = await installItem(name, config, registry, cwd, { dryRun, overwrite: config.overwrite });
      const written = recs.filter((r) => r.status !== "skip");
      if (written.length) {
        lock[name] = {
          version: registry.version ?? null,
          files: Object.fromEntries(written.map((r) => [toPosix(path.relative(cwd, r.dest)), sha256(r.content)])),
        };
      }
    }
  }

  const visited = new Set();
  for (const { url } of classified.filter((c) => c.kind === "url")) {
    try {
      await installRemoteItem(url, config, cwd, { visited, log: (m) => console.log(m) });
    } catch (err) {
      console.error(err.message);
      process.exit(1);
    }
  }

  if (dryRun) {
    console.log(`\nDry run — nothing written. (+ new · ~ overwrite · = skip)`);
    return;
  }
  await writeLock(cwd, lock);
  console.log(`\nInstalled. Import e.g. from "${path.relative(cwd, config.componentsDir)}/button.slint".`);
}

async function cmdList(cwd, opts = {}) {
  const config = resolveConfig(await loadRawConfig(cwd), cwd);
  const registry = await loadRegistry(config.style);
  const items = catalogFromRegistry(registry).filter((i) => i.name !== "theme");

  if (opts.json) {
    console.log(JSON.stringify(items, null, 2));
    return;
  }

  const byCategory = new Map();
  for (const item of items) {
    const cat = item.category ?? "misc";
    if (!byCategory.has(cat)) byCategory.set(cat, []);
    byCategory.get(cat).push(item);
  }
  console.log(`slintcn/${registry.name} — ${items.length} components\n`);
  for (const cat of [...byCategory.keys()].sort()) {
    console.log(`  ${cat}`);
    for (const item of byCategory.get(cat)) {
      console.log(`    ${item.name.padEnd(16)} ${item.description ?? ""}`);
    }
    console.log("");
  }
  console.log(`Install: slintcn add <name…>   ·   Details: slintcn view <name>`);
}

async function cmdView(cwd, name, opts = {}) {
  const config = resolveConfig(await loadRawConfig(cwd), cwd);
  const registry = await loadRegistry(config.style);
  const item = itemByName(registry, name);
  if (!item) {
    const available = ["theme", ...Object.keys(registry.components ?? {})];
    console.error(`Unknown item: ${name}. Available: ${available.join(", ")}`);
    process.exit(1);
  }

  let order;
  try {
    order = resolveInstallOrder([name], registry);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }

  console.log(`${item.title ?? name}  (${item.type ?? "registry:ui"})`);
  if (item.description) console.log(item.description);
  console.log(`\ncategory:  ${item.category ?? "—"}`);
  console.log(`installs:  ${order.join(", ")}`);
  console.log(`files:`);
  for (const f of item.files ?? []) console.log(`  ${f}`);

  if (opts.files) {
    for (const rel of item.files ?? []) {
      const src = path.join(ROOT, "registry", config.style, rel);
      console.log(`\n----- ${rel} -----`);
      console.log(await readFile(src, "utf8"));
    }
  }
}

async function cmdBuild(cwd, opts = {}) {
  const config = resolveConfig(await loadRawConfig(cwd), cwd);
  const registry = await loadRegistry(config.style);
  const outDir = path.resolve(cwd, opts.outDir ?? "dist/registry");
  const styleRoot = path.join(ROOT, "registry", config.style);
  const readSource = (rel) => readFile(path.join(styleRoot, rel), "utf8");

  await mkdir(path.join(outDir, "r"), { recursive: true });

  const items = catalogFromRegistry(registry);
  for (const { name } of items) {
    const built = await buildRegistryItem(name, registry, readSource);
    await writeFile(
      path.join(outDir, "r", `${name}.json`),
      JSON.stringify(built, null, 2),
    );
  }

  // Top-level index — metadata only (no inlined content).
  const index = {
    name: registry.name,
    homepage: registry.homepage,
    version: registry.version,
    items: items.map(({ name, type, title, description, category, requires }) => ({
      name,
      type,
      title,
      description,
      category,
      registryDependencies: requires ?? [],
    })),
  };
  await writeFile(path.join(outDir, "registry.json"), JSON.stringify(index, null, 2));

  console.log(`Built ${items.length} items → ${path.relative(cwd, outDir)}/`);
  console.log(`  registry.json  (index)`);
  console.log(`  r/<name>.json  (${items.length} resolved items)`);
}

// Minimal LCS line diff → array of "  ctx" / "- removed" / "+ added" lines.
export function unifiedDiff(a, b) {
  const n = a.length, m = b.length;
  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--)
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const out = [];
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) { out.push("  " + a[i]); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { out.push("- " + a[i++]); }
    else { out.push("+ " + b[j++]); }
  }
  while (i < n) out.push("- " + a[i++]);
  while (j < m) out.push("+ " + b[j++]);
  return out;
}

async function cmdDiff(cwd, name) {
  const config = resolveConfig(await loadRawConfig(cwd), cwd);
  const registry = await loadRegistry(config.style);
  const item = itemByName(registry, name);
  if (!item) {
    console.error(`Unknown item: ${name}.`);
    process.exit(1);
  }
  const lockPath = path.join(cwd, "slintcn.lock.json");
  const lock = (await exists(lockPath)) ? JSON.parse(await readFile(lockPath, "utf8")) : {};
  let changed = false;
  for (const rel of item.files) {
    const src = path.join(ROOT, "registry", config.style, rel);
    const dest = routeDest(rel, config);
    const would = rewriteImports(await readFile(src, "utf8"), config, dest);
    const relDest = toPosix(path.relative(cwd, dest));
    if (!(await exists(dest))) { console.log(`  ${relDest}: not installed`); continue; }
    const onDisk = await readFile(dest, "utf8");
    if (onDisk === would) { console.log(`  ${relDest}: no changes`); continue; }
    changed = true;
    const locked = lock[name]?.files?.[relDest];
    const note = locked ? (sha256(onDisk) !== locked ? " [locally modified since install]" : " [upstream changed]") : "";
    console.log(`\n--- ${relDest} (installed)${note}\n+++ ${relDest} (registry, rewritten for your config)`);
    console.log(unifiedDiff(onDisk.split("\n"), would.split("\n")).filter((l) => l[0] === "+" || l[0] === "-").join("\n"));
  }
  if (!changed) console.log(`\n${name}: in sync with the registry.`);
}

async function cmdExport(cwd, name, opts = {}) {
  const config = resolveConfig(await loadRawConfig(cwd), cwd);
  const registry = await loadRegistry(config.style);
  const item = itemByName(registry, name);
  if (!item) {
    console.error(`Unknown item: ${name}.`);
    process.exit(1);
  }
  const files = [];
  for (const rel of item.files) {
    const src = path.join(ROOT, "registry", config.style, rel);
    const dest = routeDest(rel, config);
    files.push({
      path: toPosix(path.relative(cwd, dest)),
      content: rewriteImports(await readFile(src, "utf8"), config, dest),
      type: "text/slint",
    });
  }
  const out = {
    name,
    type: item.type ?? "registry:ui",
    title: item.title ?? name,
    description: item.description ?? "",
    category: item.category ?? "misc",
    registryDependencies: item.requires ?? [],
    files,
  };
  const json = JSON.stringify(out, null, 2);
  if (opts.stdout) { process.stdout.write(json + "\n"); return; }
  const outDir = path.resolve(cwd, "dist/export");
  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, `${name}.json`), json);
  console.log(`Exported ${name} → ${path.relative(cwd, outDir)}/${name}.json`);
}

function usage() {
  console.log(`slintcn — copy-paste Slint components

Usage:
  slintcn init                Create slintcn.json + theme tokens
  slintcn add <name...>       Copy components (button, card, input, badge)
  slintcn add <https-url>     Install from a remote registry item
  slintcn add @ns/name        Install from a configured registry namespace
  slintcn list [--json]       List available components by category
  slintcn view <name> [--files]  Show an item's metadata, deps, and files
  slintcn diff <name>         Diff installed files vs the registry (rewritten)
  slintcn export <name> [--stdout]  Emit one resolved item JSON (for codegen)
  slintcn build [-o <dir>]    Emit a static registry (registry.json + r/*.json)

Adoption flags (install into an existing design system):
  --external-tokens <path>    Don't install theme; import Tokens from <path>
  --components-dir <dir>      Where component files land
  --filename-style snake      kebab (default) | snake  (slot-tile → slot_tile)
  --import-map <file.json>    Arbitrary "<import>": "<target>" overrides
  --dry-run                   Print the plan (+ new · ~ overwrite · = skip), write nothing
  --no-overwrite              Skip files that already exist

Examples:
  slintcn add button card input
  slintcn add button --external-tokens ./generated/tokens.slint --filename-style snake --dry-run
  slintcn diff button
  slintcn export button --stdout
`);
}

async function main() {
  const [, , command, ...args] = process.argv;
  const cwd = process.cwd();

  switch (command) {
    case "init": {
      const bi = args.findIndex((a) => a === "--base-color" || a === "-b");
      const baseColor = bi >= 0 ? args[bi + 1] : undefined;
      await cmdInit(cwd, { baseColor });
      await cmdAdd(cwd, ["theme"]);
      break;
    }
    case "add": {
      const VALUE_FLAGS = new Set(["--external-tokens", "--components-dir", "--filename-style", "--import-map"]);
      const flag = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
      const names = [];
      for (let k = 0; k < args.length; k++) {
        const a = args[k];
        if (a.startsWith("-")) { if (VALUE_FLAGS.has(a)) k++; continue; } // skip flag (+ its value)
        names.push(a);
      }
      if (names.length === 0) {
        console.error("Specify at least one component: button, card, input, badge");
        process.exit(1);
      }
      await cmdAdd(cwd, names, {
        dryRun: args.includes("--dry-run"),
        overwrite: args.includes("--no-overwrite") ? false : undefined,
        externalTokens: flag("--external-tokens"),
        componentsDir: flag("--components-dir"),
        fileNameStyle: flag("--filename-style"),
        importMapFile: flag("--import-map"),
      });
      break;
    }
    case "list":
      await cmdList(cwd, { json: args.includes("--json") });
      break;
    case "view": {
      const name = args.find((a) => !a.startsWith("-"));
      if (!name) {
        console.error("Specify an item: slintcn view button");
        process.exit(1);
      }
      await cmdView(cwd, name, { files: args.includes("--files") });
      break;
    }
    case "diff": {
      const name = args.find((a) => !a.startsWith("-"));
      if (!name) { console.error("Specify an item: slintcn diff button"); process.exit(1); }
      await cmdDiff(cwd, name);
      break;
    }
    case "export": {
      const name = args.find((a) => !a.startsWith("-"));
      if (!name) { console.error("Specify an item: slintcn export button"); process.exit(1); }
      await cmdExport(cwd, name, { stdout: args.includes("--stdout") });
      break;
    }
    case "build": {
      const oi = args.findIndex((a) => a === "-o" || a === "--out");
      const outDir = oi >= 0 ? args[oi + 1] : undefined;
      await cmdBuild(cwd, { outDir });
      break;
    }
    case undefined:
    case "help":
    case "--help":
      usage();
      break;
    default:
      console.error(`Unknown command: ${command}`);
      usage();
      process.exit(1);
  }
}

// Run main() when this file is the entry point — not when imported by tests.
// Compare real paths so symlinked bins (npm/npx put the bin in node_modules/
// .bin as a symlink) still match; a raw `file://` + argv[1] string compare
// fails for those and silently no-ops the CLI.
function invokedDirectly() {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    return realpathSync(entry) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}

if (invokedDirectly()) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
