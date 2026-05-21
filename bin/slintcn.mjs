#!/usr/bin/env node
/**
 * slintcn CLI — init + add (copy-paste registry, shadcn-style).
 */
import { copyFile, mkdir, readFile, writeFile, access } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

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
  };
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
  if (rel.startsWith("theme/")) {
    return path.join(config.themeDir, rel.slice("theme/".length));
  }
  if (rel.startsWith("components/")) {
    return path.join(config.componentsDir, rel.slice("components/".length));
  }
  if (rel.startsWith("blocks/")) {
    return path.join(config.blocksDir, rel.slice("blocks/".length));
  }
  return path.join(config.outDir, rel);
}

/**
 * Rewrite registry-relative imports (`from "../theme/X.slint"` and
 * `from "../components/Y.slint"`) to be relative to the destination file's
 * own location, so the user's themeDir / componentsDir layout choices are
 * honored. Other imports pass through untouched.
 */
export function rewriteImports(content, { destAbs, themeDir, componentsDir }) {
  const resolveTarget = (importPath) => {
    if (importPath.startsWith("../theme/")) {
      return path.join(themeDir, importPath.slice("../theme/".length));
    }
    if (importPath.startsWith("../components/")) {
      return path.join(componentsDir, importPath.slice("../components/".length));
    }
    return null;
  };

  return content.replace(/from\s+"([^"]+)"/g, (match, importPath) => {
    const targetAbs = resolveTarget(importPath);
    if (!targetAbs) return match;
    let rel = path.relative(path.dirname(destAbs), targetAbs);
    if (!rel.startsWith(".") && !rel.startsWith("/")) rel = "./" + rel;
    // Slint imports use forward slashes regardless of host OS.
    rel = rel.split(path.sep).join("/");
    return `from "${rel}"`;
  });
}

async function copyRegistryFile(rel, config) {
  const src = path.join(ROOT, "registry", config.style, rel);
  const dest = routeDest(rel, config);
  await mkdir(path.dirname(dest), { recursive: true });
  let content = await readFile(src, "utf8");
  content = rewriteImports(content, {
    destAbs: dest,
    themeDir: config.themeDir,
    componentsDir: config.componentsDir,
  });
  await writeFile(dest, content);
  return dest;
}

async function cmdInit(cwd) {
  const configPath = path.join(cwd, "slintcn.json");
  if (await exists(configPath)) {
    console.log("slintcn.json already exists — skipping init");
    return resolveConfig(await loadRawConfig(cwd), cwd);
  }
  const template = await readFile(path.join(ROOT, "templates", "slintcn.json"), "utf8");
  await writeFile(configPath, template);
  console.log("Created slintcn.json");

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

  return resolveConfig(JSON.parse(template), cwd);
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

async function installItem(name, config, registry, cwd) {
  if (name === "theme") {
    for (const rel of registry.theme.files) {
      const dest = routeDest(rel, config);
      if (!(await exists(dest))) {
        await copyRegistryFile(rel, config);
        console.log(`  + ${path.relative(cwd, dest)}`);
      }
    }
    return;
  }
  const spec = registry.components[name];
  for (const rel of spec.files) {
    const dest = await copyRegistryFile(rel, config);
    console.log(`  + ${path.relative(cwd, dest)}`);
  }
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
    const content = rewriteImports(file.content, {
      destAbs: dest,
      themeDir: config.themeDir,
      componentsDir: config.componentsDir,
    });
    await writeFile(dest, content);
    log(`  + ${path.relative(cwd, dest)}`);
  }
}

async function cmdAdd(cwd, tokens) {
  let rawConfig = await loadRawConfig(cwd);
  if (!rawConfig) {
    await cmdInit(cwd);
    rawConfig = await loadRawConfig(cwd);
  }
  const config = resolveConfig(rawConfig, cwd);

  let classified;
  try {
    classified = (tokens.length === 0 ? ["theme"] : tokens).map((t) => classifyRequest(t, config));
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }

  // Local items: one topological batch (preserves dedup + order).
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
    for (const name of order) await installItem(name, config, registry, cwd);
  }

  // Remote items: shared visited set across all requested URLs.
  const visited = new Set();
  for (const { url } of classified.filter((c) => c.kind === "url")) {
    try {
      await installRemoteItem(url, config, cwd, { visited, log: (m) => console.log(m) });
    } catch (err) {
      console.error(err.message);
      process.exit(1);
    }
  }

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

function usage() {
  console.log(`slintcn — copy-paste Slint components

Usage:
  slintcn init                Create slintcn.json + theme tokens
  slintcn add <name...>       Copy components (button, card, input, badge)
  slintcn add <https-url>     Install from a remote registry item
  slintcn add @ns/name        Install from a configured registry namespace
  slintcn list [--json]       List available components by category
  slintcn view <name> [--files]  Show an item's metadata, deps, and files
  slintcn build [-o <dir>]    Emit a static registry (registry.json + r/*.json)

Examples:
  slintcn init
  slintcn add button card input
  slintcn list
  slintcn view dialog
`);
}

async function main() {
  const [, , command, ...args] = process.argv;
  const cwd = process.cwd();

  switch (command) {
    case "init":
      await cmdInit(cwd);
      await cmdAdd(cwd, ["theme"]);
      break;
    case "add":
      if (args.length === 0) {
        console.error("Specify at least one component: button, card, input, badge");
        process.exit(1);
      }
      await cmdAdd(cwd, args.filter((a) => !a.startsWith("-")));
      break;
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

// Only run main() when invoked directly (not when imported by tests).
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
