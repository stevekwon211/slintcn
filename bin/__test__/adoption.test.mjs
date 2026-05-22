import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, access } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { resolveConfig, routeDest, rewriteImports, styleFileName, unifiedDiff, stripLocalEnums, resolveFileContent } from "../slintcn.mjs";

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

test("stripLocalEnums: strips enums, imports + re-exports them", () => {
  const src = `// header\nexport enum ButtonVariant { default, outline }\nexport enum ButtonSize { sm, lg }\nexport component Button {}\n`;
  const out = stripLocalEnums(src, "../gen/button.slint");
  assert.ok(!/export enum/.test(out), "no local enum left");
  assert.match(out, /import \{ ButtonVariant, ButtonSize \} from "\.\.\/gen\/button\.slint"/);
  assert.match(out, /export \{ ButtonVariant, ButtonSize \}/);
  assert.match(out, /export component Button/);
});

test("stripLocalEnums: no-op when the file declares no enums", () => {
  const src = `export component Input {}\n`;
  assert.equal(stripLocalEnums(src, "x"), src);
});

test("add --external-enums strips the component's local enums", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "slintcn-enums-"));
  spawnSync("node", [CLI, "add", "button", "--external-enums", "gen/enums"], { cwd: dir, encoding: "utf8" });
  const out = await readFile(path.join(dir, "ui/slintcn/components/button.slint"), "utf8");
  assert.ok(!/export enum/.test(out), "no local enum");
  assert.match(out, /from "[.\/]*gen\/enums\/button\.slint"/);
  await rm(dir, { recursive: true, force: true });
});

test("routeDest: per-file routes override the destination", () => {
  const c = resolveConfig({ componentsDir: "ui/primitives", routes: { "components/dialog-panel.slint": "ui/surfaces/dialog_panel.slint" } }, cwd);
  assert.equal(routeDest("components/dialog-panel.slint", c), "/proj/ui/surfaces/dialog_panel.slint");
  assert.equal(routeDest("components/button.slint", c), "/proj/ui/primitives/button.slint");
});

test("rewriteImports: a routed component's sibling import reaches the dep's real dir", () => {
  const c = resolveConfig({ componentsDir: "ui/primitives", routes: { "components/dialog-panel.slint": "ui/surfaces/overlays/dialog_panel.slint" } }, cwd);
  const dest = routeDest("components/dialog-panel.slint", c);
  const out = rewriteImports(`import { Button } from "button.slint";`, c, dest, "components/dialog-panel.slint");
  assert.match(out, /from "\.\.\/\.\.\/primitives\/button\.slint"/);
});

test("resolveFileContent: applies rewrite AND external-enum strip (add/diff/export parity)", () => {
  const c = resolveConfig({ externalEnums: "gen", componentsDir: "ui/primitives" }, cwd);
  const dest = routeDest("components/button.slint", c);
  const raw = `export enum ButtonVariant { default }\nimport { Tokens } from "../theme/tokens.slint";\n`;
  const out = resolveFileContent(raw, "components/button.slint", c, dest);
  assert.ok(!/export enum/.test(out), "local enum stripped");
  assert.match(out, /from "[^"]*gen\/button\.slint"/, "imports generated enum");
});

test("add with adoption flags persists them to slintcn.json", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "slintcn-persist-"));
  spawnSync("node", [CLI, "add", "button", "--external-tokens", "gen/tokens.slint", "--filename-style", "snake"], { cwd: dir, encoding: "utf8" });
  const cfg = JSON.parse(await readFile(path.join(dir, "slintcn.json"), "utf8"));
  assert.equal(cfg.externalTokens, "gen/tokens.slint");
  assert.equal(cfg.fileNameStyle, "snake");
  await rm(dir, { recursive: true, force: true });
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
