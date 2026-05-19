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

async function loadConfig(cwd) {
  const configPath = path.join(cwd, "slintcn.json");
  if (!(await exists(configPath))) {
    return null;
  }
  return JSON.parse(await readFile(configPath, "utf8"));
}

function rewriteImports(content) {
  // After copy, components live next to theme/ under the user's outDir.
  return content.replace(
    'import { Tokens } from "../theme/tokens.slint";',
    'import { Tokens } from "../theme/tokens.slint";',
  );
}

async function copyRegistryFile(rel, destRoot) {
  const src = path.join(ROOT, "registry", "default", rel);
  const dest = path.join(destRoot, rel);
  await mkdir(path.dirname(dest), { recursive: true });
  let content = await readFile(src, "utf8");
  content = rewriteImports(content);
  await writeFile(dest, content);
}

async function cmdInit(cwd) {
  const configPath = path.join(cwd, "slintcn.json");
  if (await exists(configPath)) {
    console.log("slintcn.json already exists — skipping init");
    return loadConfig(cwd);
  }
  const template = await readFile(path.join(ROOT, "templates", "slintcn.json"), "utf8");
  await writeFile(configPath, template);
  console.log("Created slintcn.json");
  return JSON.parse(template);
}

async function cmdAdd(cwd, names) {
  let config = await loadConfig(cwd);
  if (!config) {
    config = await cmdInit(cwd);
  }

  const registry = await loadRegistry("default");
  const outDir = path.join(cwd, config.outDir ?? "ui/slintcn");

  const toInstall = new Set(names);
  if (toInstall.has("theme") || toInstall.size === 0) {
    for (const rel of registry.theme.files) {
      await copyRegistryFile(rel, outDir);
      console.log(`  + ${rel}`);
    }
    toInstall.delete("theme");
  }

  for (const name of toInstall) {
    const spec = registry.components[name];
    if (!spec) {
      console.error(`Unknown component: ${name}`);
      console.error(`Available: ${Object.keys(registry.components).join(", ")}`);
      process.exit(1);
    }
    if (spec.requires?.includes("theme")) {
      for (const rel of registry.theme.files) {
        const dest = path.join(outDir, rel);
        if (!(await exists(dest))) {
          await copyRegistryFile(rel, outDir);
          console.log(`  + ${rel} (dependency)`);
        }
      }
    }
    for (const rel of spec.files) {
      await copyRegistryFile(rel, outDir);
      console.log(`  + ${rel}`);
    }
  }

  console.log(`\nInstalled to ${path.relative(cwd, outDir)}/`);
  console.log('Import: import { Button } from "@/ui/slintcn/components/button.slint";');
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

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
