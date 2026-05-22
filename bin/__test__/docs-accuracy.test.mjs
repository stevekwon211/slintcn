// Verifies the generated docs (scripts/docs-usage.mjs) stay accurate against
// the real component sources: dependency lists, usage import symbols, and
// two-way / callback bindings. Runs in `npm test` (and thus the pre-push gate).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { catalogFromRegistry } from "../slintcn.mjs";
import { usage } from "../../scripts/docs-usage.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const registry = JSON.parse(await readFile(path.join(ROOT, "registry/default/registry.json"), "utf8"));
const items = catalogFromRegistry(registry);
const byName = Object.fromEntries(items.map((i) => [i.name, i]));
const pages = items.filter((i) => i.type === "registry:ui" || i.type === "registry:block");

const readSlint = (rel) => readFile(path.join(ROOT, "registry/default", rel), "utf8");
const stripComments = (s) => s.replace(/\/\/[^\n]*/g, "");

async function sourceOf(item) {
  let src = "";
  for (const f of item.files) src += "\n" + stripComments(await readSlint(f));
  return src;
}
const exportsOf = (src) =>
  new Set([...src.matchAll(/export\s+(?:component|enum|struct|global)\s+([A-Za-z0-9_]+)/g)].map((m) => m[1]));
const importDepsOf = (src) => {
  const deps = new Set();
  for (const m of src.matchAll(/from\s+"([^"]+)\.slint"/g)) {
    const p = m[1];
    if (p.startsWith("../theme/")) deps.add("theme");
    else if (p.startsWith("std-widgets")) continue;
    else if (!p.includes("/")) deps.add(p);
    else deps.add(p.replace("../components/", ""));
  }
  return deps;
};
const inoutProps = (src) =>
  new Set([...src.matchAll(/\b(?:in|in-out)\s+property\s*<[^>]+>\s*([A-Za-z0-9_-]+)/g)].map((m) => m[1]));
const callbacks = (src) =>
  new Set([...src.matchAll(/\bcallback\s+([A-Za-z0-9_-]+)/g)].map((m) => m[1]));

test("Dependencies: registry.requires exactly matches the source imports", async () => {
  for (const it of pages) {
    const deps = importDepsOf(await sourceOf(it));
    const req = new Set(it.requires ?? []);
    assert.deepEqual([...deps].sort(), [...req].sort(), `${it.name}: requires vs imports`);
  }
});

test("Usage: every imported symbol is actually exported by that item", async () => {
  for (const it of pages) {
    const code = usage[it.name];
    assert.ok(code, `${it.name}: missing usage snippet`);
    for (const m of code.matchAll(/import\s*\{([^}]*)\}\s*from\s*"slintcn\/(?:components|blocks)\/([A-Za-z0-9_-]+)\.slint"/g)) {
      const syms = m[1].split(",").map((s) => s.trim().split(/\s+as\s+/)[0].trim()).filter(Boolean);
      const target = byName[m[2]];
      assert.ok(target, `${it.name}: usage imports unknown item ${m[2]}`);
      const ex = exportsOf(await sourceOf(target));
      for (const s of syms) assert.ok(ex.has(s), `${it.name}: imports {${s}} not exported by ${m[2]}.slint`);
    }
  }
});

test("a11y.json: keys are real items, contracts well-formed", async () => {
  const a11y = JSON.parse(await readFile(path.join(ROOT, "registry/default/a11y.json"), "utf8"));
  for (const [k, v] of Object.entries(a11y)) {
    if (k.startsWith("_")) continue;
    assert.ok(byName[k], `a11y key "${k}" is a real registry item`);
    assert.equal(typeof v.focusable, "boolean", `${k}.focusable`);
    assert.ok(Array.isArray(v.keyboard), `${k}.keyboard`);
    assert.equal(typeof v.focusTrap, "boolean", `${k}.focusTrap`);
    assert.equal(typeof v.escapeDismiss, "boolean", `${k}.escapeDismiss`);
  }
});

test("Usage: two-way (<=>) + callback (=>) bindings are real", async () => {
  for (const it of pages) {
    const code = stripComments(usage[it.name]);
    const src = await sourceOf(it);
    const inout = inoutProps(src);
    const cbs = callbacks(src);
    for (const m of code.matchAll(/([A-Za-z][A-Za-z0-9_-]*)\s*<=>/g)) {
      assert.ok(inout.has(m[1]), `${it.name}: "${m[1]} <=>" has no in-out property`);
    }
    for (const m of code.matchAll(/(?:^|\n|;|\})\s*([A-Za-z][A-Za-z0-9_-]*)\s*(?:\([^)]*\))?\s*=>/g)) {
      if (["if", "for"].includes(m[1])) continue;
      assert.ok(cbs.has(m[1]), `${it.name}: "${m[1]} =>" has no callback`);
    }
  }
});
