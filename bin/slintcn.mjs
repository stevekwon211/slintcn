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
  return {
    style: rawConfig?.style ?? "default",
    outDir,
    themeDir,
    componentsDir,
  };
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

async function cmdAdd(cwd, names) {
  let rawConfig = await loadRawConfig(cwd);
  if (!rawConfig) {
    await cmdInit(cwd);
    rawConfig = await loadRawConfig(cwd);
  }
  const config = resolveConfig(rawConfig, cwd);
  const registry = await loadRegistry(config.style);

  const requested = names.length === 0 ? ["theme"] : names;
  let order;
  try {
    order = resolveInstallOrder(requested, registry);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }

  for (const name of order) {
    await installItem(name, config, registry, cwd);
  }

  console.log(`\nInstalled. Import e.g. from "${path.relative(cwd, config.componentsDir)}/button.slint".`);
}

function usage() {
  console.log(`slintcn — copy-paste Slint components

Usage:
  slintcn init              Create slintcn.json + theme tokens
  slintcn add <name...>     Copy components (button, card, input, badge)
  slintcn add button card   Multiple at once

Examples:
  slintcn init
  slintcn add button card input
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
      await cmdAdd(cwd, args);
      break;
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
