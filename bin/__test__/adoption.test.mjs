import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, access } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { resolveConfig, routeDest, rewriteImports, styleFileName, unifiedDiff } from "../slintcn.mjs";

const cwd = "/proj";
const CLI = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "slintcn.mjs");

test("styleFileName: snake only touches the basename's dashes", () => {
  assert.equal(styleFileName("components/slot-tile.slint", "snake"), "components/slot_tile.slint");
  assert.equal(styleFileName("slot-tile.slint", "snake"), "slot_tile.slint");
  assert.equal(styleFileName("button.slint", "snake"), "button.slint");
  assert.equal(styleFileName("components/slot-tile.slint", "kebab"), "components/slot-tile.slint");
});

test("routeDest: snake renames the destination basename", () => {
  const c = resolveConfig({ fileNameStyle: "snake" }, cwd);
  assert.equal(routeDest("components/slot-tile.slint", c), "/proj/ui/slintcn/components/slot_tile.slint");
});

test("rewriteImports: externalTokens redirects the theme import", () => {
  const c = resolveConfig({ externalTokens: "generated/tokens.slint" }, cwd);
  const dest = routeDest("components/button.slint", c);
  const out = rewriteImports(`import { Tokens } from "../theme/tokens.slint";`, c, dest);
  // /proj/ui/slintcn/components/button.slint → /proj/generated/tokens.slint
  assert.match(out, /from "\.\.\/\.\.\/\.\.\/generated\/tokens\.slint"/);
});

test("rewriteImports: snake rewrites sibling + component imports", () => {
  const c = resolveConfig({ fileNameStyle: "snake" }, cwd);
  const dest = routeDest("components/alert-dialog.slint", c);
  const out = rewriteImports(`import { Scrim } from "popup-helpers.slint";`, c, dest);
  assert.match(out, /from "popup_helpers\.slint"/);
});

test("rewriteImports: importMap wins over everything", () => {
  const c = resolveConfig({ importMap: { "../theme/tokens.slint": "@host/tokens.slint" } }, cwd);
  const dest = routeDest("components/button.slint", c);
  const out = rewriteImports(`import { Tokens } from "../theme/tokens.slint";`, c, dest);
  assert.match(out, /from "@host\/tokens\.slint"/);
});

test("rewriteImports: default config leaves a sibling import byte-identical", () => {
  const c = resolveConfig({}, cwd);
  const dest = routeDest("components/dialog.slint", c);
  const src = `import { Button } from "button.slint";`;
  assert.equal(rewriteImports(src, c, dest), src);
});

test("unifiedDiff: marks added / removed lines", () => {
  const d = unifiedDiff(["a", "b", "c"], ["a", "x", "c"]);
  assert.ok(d.includes("- b"));
  assert.ok(d.includes("+ x"));
  assert.ok(d.includes("  a"));
});

test("add --dry-run writes nothing", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "slintcn-dry-"));
  const r = spawnSync("node", [CLI, "add", "button", "--dry-run"], { cwd: dir, encoding: "utf8" });
  assert.match(r.stdout, /Dry run/);
  await assert.rejects(access(path.join(dir, "ui/slintcn/components/button.slint")));
  await assert.rejects(access(path.join(dir, "slintcn.json"))); // dry-run must not init either
  await rm(dir, { recursive: true, force: true });
});

test("add writes a lockfile with a sha256 per file", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "slintcn-lock-"));
  spawnSync("node", [CLI, "add", "button"], { cwd: dir, encoding: "utf8" });
  const lock = JSON.parse(await readFile(path.join(dir, "slintcn.lock.json"), "utf8"));
  assert.ok(lock.button, "button entry");
  const hash = Object.values(lock.button.files)[0];
  assert.match(hash, /^[a-f0-9]{64}$/);
  await rm(dir, { recursive: true, force: true });
});
