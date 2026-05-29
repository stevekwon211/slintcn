#!/usr/bin/env node
// Generate the slintcn docs site (web/docs/) from the registry metadata +
// usage snippets — a shadcn.com-style page per component/block with a live
// WASM preview, install tabs, and usage code. Re-run to regenerate.
//
//   node scripts/build-docs.mjs [-o web/docs]

import { mkdir, writeFile, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { catalogFromRegistry } from "../bin/slintcn.mjs";
import { usage } from "./docs-usage.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// Sidebar category order (Components group). Blocks get their own group.
const CATEGORY_ORDER = [
  "actions", "form", "layout", "display", "feedback",
  "overlay", "navigation", "data", "media", "typography", "hud",
];
const CATEGORY_LABEL = {
  actions: "Actions", form: "Forms & inputs", layout: "Layout",
  display: "Display", feedback: "Feedback", overlay: "Overlays",
  navigation: "Navigation", data: "Data", media: "Media",
  typography: "Typography", hud: "Games / HUD",
};

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const escAttr = (s) => esc(s).replace(/"/g, "&quot;");

function installCommands(name) {
  return {
    cargo: `cargo slintcn add ${name}`,
    npm: `npx slintcn@latest add ${name}`,
    pnpm: `pnpm dlx slintcn@latest add ${name}`,
    yarn: `yarn dlx slintcn@latest add ${name}`,
    bun: `bunx slintcn@latest add ${name}`,
  };
}

function sidebar(items, activeName) {
  const ui = items.filter((i) => i.type === "registry:ui");
  const blocks = items.filter((i) => i.type === "registry:block");

  const byCat = new Map();
  for (const it of ui) {
    const c = it.category ?? "misc";
    if (!byCat.has(c)) byCat.set(c, []);
    byCat.get(c).push(it);
  }
  const cats = [...byCat.keys()].sort(
    (a, b) => (CATEGORY_ORDER.indexOf(a) + 1 || 99) - (CATEGORY_ORDER.indexOf(b) + 1 || 99),
  );

  const link = (it) =>
    `<a class="s-item${it.name === activeName ? " active" : ""}" href="./${it.name}.html">${esc(it.title)}</a>`;

  let html = `<nav class="sidebar"><div class="s-inner">`;
  html += `<div class="s-group"><div class="s-label">Get started</div>`;
  html += `<a class="s-item" href="./index.html">Introduction</a>`;
  html += `<a class="s-item" href="../">Landing</a>`;
  html += `<a class="s-item" href="../demo.html">Playground</a>`;
  html += `<a class="s-item" href="./directory.html">Directory</a></div>`;
  html += `<div class="s-group"><div class="s-label">Components</div>`;
  for (const c of cats) {
    html += `<div class="s-sub">${esc(CATEGORY_LABEL[c] ?? c)}</div>`;
    for (const it of byCat.get(c)) html += link(it);
  }
  html += `</div>`;
  if (blocks.length) {
    html += `<div class="s-group"><div class="s-label">Blocks</div>`;
    for (const it of blocks) html += link(it);
    html += `</div>`;
  }
  html += `</div></nav>`;
  return html;
}

function topnav() {
  return `<header class="topnav"><div class="tn-inner">
    <button class="menu-btn" aria-label="Toggle navigation" aria-expanded="false">☰</button>
    <a class="logo" href="../"><span class="dot"></span> slintcn <span class="pill">docs</span></a>
    <span class="grow"></span>
    <a class="tn-link" href="../create.html">Create</a>
    <a class="tn-link" href="../demo.html">Playground</a>
    <a class="tn-link star-link" href="https://github.com/zero-sq/slintcn" target="_blank" rel="noreferrer">GitHub <span data-stars></span></a>
    <a class="tn-link" href="https://crates.io/crates/slintcn">crates.io</a>
    <a class="tn-link" href="https://www.npmjs.com/package/slintcn">npm</a>
  </div></header>
  <div id="scrim"></div>`;
}

function page(item, prev, next, items, api = { enums: {}, a11y: null, props: [] }) {
  const cmds = installCommands(item.name);
  const enumNames = Object.keys(api.enums ?? {});
  const hasApi = enumNames.length > 0 || api.a11y;
  const a11yRows = api.a11y
    ? [
        `<div class="api-row"><code class="api-enum">focusable</code><span class="api-vals">${api.a11y.focusable ? "yes" : "no"}</span></div>`,
        (api.a11y.keyboard ?? []).length ? `<div class="api-row"><code class="api-enum">keyboard</code><span class="api-vals">${api.a11y.keyboard.map((k) => `<span class="chip">${esc(k)}</span>`).join("")}</span></div>` : "",
        api.a11y.focusTrap ? `<div class="api-row"><code class="api-enum">focus trap</code><span class="api-vals">yes</span></div>` : "",
        api.a11y.escapeDismiss ? `<div class="api-row"><code class="api-enum">Escape</code><span class="api-vals">dismisses</span></div>` : "",
      ].join("")
    : "";
  const apiSection = hasApi
    ? `\n  <h2 id="api">API</h2>\n` +
      enumNames.map((en) => `  <div class="api-row"><code class="api-enum">${esc(en)}</code><span class="api-vals">${api.enums[en].map((v) => `<span class="chip">${esc(v)}</span>`).join("")}</span></div>`).join("\n") +
      (api.a11y ? `\n  <div class="api-sub">Accessibility</div>\n${a11yRows}` : "")
    : "";
  const code = usage[item.name] ?? `import { } from "slintcn/components/${item.name}.slint";`;
  const deps = (item.requires ?? []).filter((d) => d !== "theme");
  const depChips = deps.length
    ? deps.map((d) => `<a class="chip" href="./${d}.html">${esc(d)}</a>`).join("")
    : `<span class="muted">theme only</span>`;

  const prevNext = `<div class="prevnext">
    ${prev ? `<a href="./${prev.name}.html" class="pn">← ${esc(prev.title)}</a>` : `<span></span>`}
    ${next ? `<a href="./${next.name}.html" class="pn">${esc(next.title)} →</a>` : `<span></span>`}
  </div>`;

  const pmPills = ["cargo", "npm", "pnpm", "yarn", "bun"]
    .map((pm, i) => `<button class="pm${i === 0 ? " active" : ""}" data-pm="${pm}">${pm}</button>`)
    .join("");
  const cmdData = Object.entries(cmds)
    .map(([pm, c]) => `data-cmd-${pm}="${escAttr(c)}"`)
    .join(" ");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(item.title)} — slintcn</title>
<meta name="description" content="${escAttr(item.description)}">
<link rel="icon" type="image/svg+xml" href="data:image/svg+xml;utf8,&lt;svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22%23fafafa%22&gt;&lt;circle cx=%2212%22 cy=%2212%22 r=%229%22 fill=%22%23171717%22 stroke=%22%23fafafa%22 stroke-width=%221.5%22/&gt;&lt;/svg&gt;">
<link rel="stylesheet" href="./docs.css">
</head>
<body>
${topnav()}
<div class="shell">
${sidebar(items, item.name)}
<main class="main">
  ${prevNext}
  <div class="hdr">
    <h1>${esc(item.title)}</h1>
    <p class="desc">${esc(item.description)}</p>
    <div class="badges"><span class="tag">${esc(item.type.replace("registry:", ""))}</span> <span class="tag">${esc(item.category)}</span></div>
  </div>

  <h2 id="preview">Preview</h2>
  <div class="preview-card">
    <iframe src="../embed.html?preview=${encodeURIComponent(item.name)}" loading="lazy" title="${escAttr(item.title)} preview"></iframe>
  </div>

  <h2 id="installation">Installation</h2>
  <div class="install" ${cmdData}>
    <div class="pm-row">${pmPills}</div>
    <div class="cmd-row"><code class="cmd">${esc(cmds.cargo)}</code><button class="copy" data-copy="cmd">Copy</button></div>
  </div>

  <h2 id="usage">Usage</h2>
  <div class="code-block">
    <button class="copy" data-copy="code">Copy</button>
    <pre><code class="slint">${esc(code)}</code></pre>
  </div>

${(api.props ?? []).length ? `  <h2 id="properties">Properties</h2>
  <div class="props">
${api.props.map((p) => `    <div class="prop-row">
      <code class="prop-name">${esc(p.name)}</code>
      <span class="prop-kind kind-${p.kind.replace("-", "")}">${esc(p.kind)}</span>
      <code class="prop-type">${esc(p.type)}</code>
      ${p.doc ? `<p class="prop-doc">${esc(p.doc)}</p>` : `<p class="prop-doc muted small">—</p>`}
    </div>`).join("\n")}
  </div>` : ""}

${apiSection}

  <h2 id="dependencies">Dependencies</h2>
  <p class="deps">${depChips}</p>
  <p class="muted small">Installed automatically as transitive dependencies of <code>slintcn add ${esc(item.name)}</code>.</p>

  ${prevNext}
</main>
<aside class="toc">
  <div class="toc-label">On this page</div>
  <a href="#preview">Preview</a>
  <a href="#installation">Installation</a>
  <a href="#usage">Usage</a>
  ${(api.props ?? []).length ? `<a href="#properties">Properties</a>` : ""}
  ${hasApi ? `<a href="#api">API</a>` : ""}
  <a href="#dependencies">Dependencies</a>
</aside>
</div>
<script src="./docs.js"></script>
</body>
</html>`;
}

function directoryPage(items, directory) {
  // Card per registry — namespace + meta + install command + counts + tags.
  const card = (r) => `
    <a class="idx-card" href="${escAttr(r.homepage)}" target="_blank" rel="noreferrer">
      <div class="idx-t">${esc(r.title)}</div>
      <div class="idx-d">${esc(r.description)}</div>
      <div class="dir-meta">
        <span class="chip">@${esc(r.namespace)}</span>
        ${r.components != null ? `<span class="chip">${esc(r.components)} components</span>` : ""}
        ${r.blocks != null     ? `<span class="chip">${esc(r.blocks)} blocks</span>` : ""}
        ${r.license            ? `<span class="chip">${esc(r.license)}</span>` : ""}
        ${(r.tags ?? []).map((t) => `<span class="chip muted">${esc(t)}</span>`).join("")}
      </div>
      <div class="dir-cmd"><code>slintcn add @${esc(r.namespace)}/&lt;name&gt;</code></div>
    </a>`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Directory — slintcn docs</title>
<link rel="stylesheet" href="./docs.css">
</head>
<body>
${topnav()}
<div class="shell">
${sidebar(items, "")}
<main class="main">
  <div class="hdr">
    <h1>Directory</h1>
    <p class="desc">Registries you can install slintcn components from. Add yours with a PR to
      <a href="https://github.com/zero-sq/slintcn/blob/main/registry/directory.json"><code>registry/directory.json</code></a>.</p>
  </div>

  <h2>Registries</h2>
  <div class="idx-grid">${directory.registries.map(card).join("")}</div>

  <h2>How it works</h2>
  <p class="muted">slintcn isn't tied to a single registry. Any host serving a <code>registry.json</code>
    + per-item <code>r/&lt;name&gt;.json</code> files (the shape <code>slintcn build</code> emits) is a
    valid registry. Wire it into your project's <code>slintcn.json</code>:</p>
  <div class="code-block"><pre><code>{
  "style": "default",
  "registries": {
    "default": "https://zero-sq.github.io/slintcn/r",
    "acme":    "https://acme.dev/slintcn"
  }
}</code></pre></div>
  <p class="muted">Then install with the namespace prefix:</p>
  <div class="code-block"><pre><code>slintcn add @acme/button-pro
slintcn add https://example.com/registry/r/special.json   # direct URL also works</code></pre></div>

  <h2>List yours</h2>
  <p class="muted">Open a PR that adds an entry to
    <a href="https://github.com/zero-sq/slintcn/blob/main/registry/directory.json"><code>registry/directory.json</code></a>:</p>
  <div class="code-block"><pre><code>{
  "namespace": "yours",
  "title":     "Your registry",
  "description": "What it offers in one line.",
  "url":       "https://yours.example/r",
  "homepage":  "https://yours.example",
  "repo":      "https://github.com/you/yours",
  "maintainer": "you",
  "license":   "MIT",
  "components": 12,
  "blocks":     2,
  "tags":      ["light", "minimal"]
}</code></pre></div>
</main>
</div>
<script src="./docs.js"></script>
</body>
</html>`;
}

function indexPage(items) {
  const ui = items.filter((i) => i.type === "registry:ui");
  const blocks = items.filter((i) => i.type === "registry:block");
  const card = (it) =>
    `<a class="idx-card" href="./${it.name}.html"><div class="idx-t">${esc(it.title)}</div><div class="idx-d">${esc(it.description)}</div></a>`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Components — slintcn docs</title>
<link rel="stylesheet" href="./docs.css">
</head>
<body>
${topnav()}
<div class="shell">
${sidebar(items, "")}
<main class="main">
  <div class="hdr"><h1>Components</h1><p class="desc">${ui.length} components + ${blocks.length} blocks — copy-paste Slint, install with <code>slintcn add</code>.</p></div>
  <h2>Components</h2>
  <div class="idx-grid">${ui.map(card).join("")}</div>
  <h2>Blocks</h2>
  <div class="idx-grid">${blocks.map(card).join("")}</div>
</main>
</div>
<script src="./docs.js"></script>
</body>
</html>`;
}

async function main() {
  const args = process.argv.slice(2);
  const oi = args.findIndex((a) => a === "-o" || a === "--out");
  const outDir = path.resolve(process.cwd(), oi >= 0 ? args[oi + 1] : "web/docs");

  const registry = JSON.parse(
    await readFile(path.join(ROOT, "registry", "default", "registry.json"), "utf8"),
  );
  const a11y = JSON.parse(
    await readFile(path.join(ROOT, "registry", "default", "a11y.json"), "utf8"),
  );
  const directory = JSON.parse(
    await readFile(path.join(ROOT, "registry", "directory.json"), "utf8"),
  );
  // docs pages = user-facing items only (ui + blocks); skip theme + lib helpers.
  const items = catalogFromRegistry(registry).filter(
    (i) => i.type === "registry:ui" || i.type === "registry:block",
  );

  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, "docs.css"), DOCS_CSS);
  await writeFile(path.join(outDir, "docs.js"), DOCS_JS);
  await writeFile(path.join(outDir, "index.html"), indexPage(items));
  await writeFile(path.join(outDir, "directory.html"), directoryPage(items, directory));

  for (let i = 0; i < items.length; i++) {
    const api = {
      enums: await enumsOf(items[i]),
      a11y: a11y[items[i].name] ?? null,
      props: await propsOf(items[i]),
    };
    const html = page(items[i], items[i - 1], items[i + 1], items, api);
    await writeFile(path.join(outDir, `${items[i].name}.html`), html);
  }
  console.log(`Docs → ${path.relative(process.cwd(), outDir)}/ (${items.length} pages + index)`);
}

// Extract `in` / `in-out` / `out` properties + `callback`s from an item's
// `.slint` files, each annotated with the description from a `//`-comment block
// **immediately above** the declaration (no blank line between). Single source
// of truth — the docs Properties section never drifts from the component.
const PROP_RX = /^\s*(in|in-out|out)\s+property\s+<([^>]+)>\s+([A-Za-z][\w-]*)/;
const CB_RX   = /^\s*callback\s+([A-Za-z][\w-]*)\s*(?:\(([^)]*)\))?(?:\s*->\s*([^;{]+?))?\s*[;{]/;
function parseProps(src) {
  const lines = src.split("\n");
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    let m, entry;
    if ((m = lines[i].match(PROP_RX))) {
      entry = { kind: m[1], name: m[3], type: m[2].trim() };
    } else if ((m = lines[i].match(CB_RX))) {
      const args = (m[2] ?? "").trim();
      const ret = m[3] ? m[3].trim() : "";
      entry = { kind: "callback", name: m[1],
                type: `(${args})${ret ? " -> " + ret : ""}` };
    } else continue;
    const docLines = [];
    for (let j = i - 1; j >= 0; j--) {
      const t = lines[j].match(/^\s*\/\/\s?(.*)$/);
      if (!t) break;
      docLines.unshift(t[1]);
    }
    entry.doc = docLines.join(" ").replace(/\s+/g, " ").trim();
    out.push(entry);
  }
  return out;
}

async function propsOf(item) {
  const all = [];
  for (const rel of item.files ?? []) {
    let src;
    try { src = await readFile(path.join(ROOT, "registry", "default", rel), "utf8"); } catch { continue; }
    for (const p of parseProps(src)) all.push(p);
  }
  return all;
}

// Derive { EnumName: [members] } from an item's source — variants/sizes shown
// in the docs API section, always in sync with the actual component.
async function enumsOf(item) {
  const enums = {};
  for (const rel of item.files ?? []) {
    let src;
    try { src = await readFile(path.join(ROOT, "registry", "default", rel), "utf8"); } catch { continue; }
    for (const m of src.matchAll(/export\s+enum\s+([A-Za-z0-9_]+)\s*\{([^}]*)\}/g)) {
      enums[m[1]] = m[2].split(",").map((s) => s.trim()).filter(Boolean);
    }
  }
  return enums;
}

const DOCS_CSS = `:root{color-scheme:dark;--bg:#0a0a0a;--fg:#fafafa;--muted:#a1a1a1;--subtle:#737373;--card:#171717;--line:rgba(255,255,255,.10);--line-strong:rgba(255,255,255,.18);--surface:rgba(255,255,255,.04);--accent:#fafafa;--radius:12px;--mono:ui-monospace,SFMono-Regular,Menlo,monospace}
*{box-sizing:border-box}html,body{margin:0;padding:0;background:var(--bg);color:var(--fg);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,system-ui,sans-serif;-webkit-font-smoothing:antialiased;line-height:1.5}
a{color:inherit;text-decoration:none}code{font-family:var(--mono)}
.topnav{position:sticky;top:0;z-index:20;background:rgba(10,10,10,.72);backdrop-filter:blur(8px);border-bottom:1px solid var(--line)}
.tn-inner{display:flex;align-items:center;gap:18px;height:56px;padding:0 22px}
.logo{display:flex;align-items:center;gap:8px;font-weight:600;letter-spacing:-.01em}
.logo .dot{width:18px;height:18px;border-radius:50%;background:#171717;border:1.5px solid #fafafa}
.pill{font-size:11px;font-weight:600;color:var(--muted);border:1px solid var(--line);border-radius:999px;padding:2px 8px}
.grow{flex:1}.tn-link{color:var(--muted);font-size:14px;font-weight:500}.tn-link:hover{color:var(--fg)}
.star-link span{color:var(--subtle);font-weight:500}
.shell{display:grid;grid-template-columns:248px minmax(0,1fr) 200px;max-width:1320px;margin:0 auto;gap:0}
.sidebar{border-right:1px solid var(--line);height:calc(100vh - 56px);position:sticky;top:56px;overflow-y:auto}
.s-inner{padding:22px 14px 60px}
.s-group{margin-bottom:20px}
.s-label{font-size:12px;font-weight:600;color:var(--fg);padding:0 10px 8px;letter-spacing:.01em}
.s-sub{font-size:11px;font-weight:600;color:var(--subtle);text-transform:uppercase;letter-spacing:.04em;padding:12px 10px 4px}
.s-item{display:block;font-size:14px;color:var(--muted);padding:6px 10px;border-radius:8px}
.s-item:hover{color:var(--fg);background:var(--surface)}
.s-item.active{color:var(--fg);background:var(--surface);font-weight:600}
.main{min-width:0;padding:32px 40px 80px;max-width:780px}
.prevnext{display:flex;justify-content:space-between;gap:12px;margin-bottom:8px}
.pn{font-size:13px;color:var(--muted);border:1px solid var(--line);border-radius:8px;padding:6px 12px}
.pn:hover{color:var(--fg);border-color:var(--line-strong)}
.hdr{padding:8px 0 4px}
h1{font-size:34px;letter-spacing:-.02em;margin:8px 0 8px}
.desc{color:var(--muted);font-size:17px;margin:0 0 12px}
.badges .tag{display:inline-block;font-size:11px;color:var(--muted);border:1px solid var(--line);border-radius:999px;padding:2px 9px;margin-right:6px}
h2{font-size:21px;letter-spacing:-.01em;margin:40px 0 14px;scroll-margin-top:72px}
.preview-card{border:1px solid var(--line);border-radius:var(--radius);background:var(--card);overflow:hidden;height:420px}
.preview-card iframe{width:100%;height:100%;border:0;display:block;background:var(--bg)}
.install{border:1px solid var(--line);border-radius:var(--radius);overflow:hidden;background:var(--card)}
.pm-row{display:flex;gap:2px;padding:8px 8px 0;border-bottom:1px solid var(--line)}
.pm{background:transparent;border:0;color:var(--muted);font-size:13px;font-weight:500;padding:8px 12px;cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-1px}
.pm:hover{color:var(--fg)}.pm.active{color:var(--fg);border-bottom-color:var(--fg)}
.cmd-row{display:flex;align-items:center;gap:10px;padding:14px 16px}
.cmd{font-family:var(--mono);font-size:13px;color:var(--fg);flex:1;overflow-x:auto;white-space:nowrap}
.cmd::before{content:"$ ";color:var(--subtle)}
.code-block{position:relative;border:1px solid var(--line);border-radius:var(--radius);background:#0d0d0d;overflow:hidden}
.code-block pre{margin:0;padding:18px 16px;overflow-x:auto}
.code-block code{font-family:var(--mono);font-size:13px;line-height:1.7;color:#e5e5e5}
.copy{position:absolute;top:10px;right:10px;background:var(--surface);border:1px solid var(--line);color:var(--muted);font-size:12px;border-radius:7px;padding:4px 9px;cursor:pointer}
.copy:hover{color:var(--fg);border-color:var(--line-strong)}
.install .copy{position:static}
.deps{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.chip{font-size:13px;color:var(--muted);border:1px solid var(--line);border-radius:8px;padding:4px 10px}
.chip:hover{color:var(--fg);border-color:var(--line-strong)}
.props{display:flex;flex-direction:column;gap:0}
.prop-row{display:grid;grid-template-columns:auto auto auto 1fr;gap:10px;align-items:baseline;padding:10px 0;border-bottom:1px solid var(--line)}
.prop-name{color:var(--fg);font-size:13px;font-weight:600;font-family:var(--mono)}
.prop-kind{font-size:10px;font-weight:600;color:var(--muted);border:1px solid var(--line);border-radius:6px;padding:1px 6px;text-transform:lowercase;letter-spacing:.02em;align-self:center}
.kind-callback{color:#c4b5fd;border-color:rgba(196,181,253,.3)}
.kind-inout{color:#86efac;border-color:rgba(134,239,172,.3)}
.kind-out{color:#7dd3fc;border-color:rgba(125,211,252,.3)}
.prop-type{color:var(--muted);font-size:12px;font-family:var(--mono)}
.prop-doc{color:var(--muted);font-size:13px;margin:0;grid-column:1 / -1;padding-left:0}
@media(min-width:761px){.prop-doc{grid-column:4}}
.api-row{display:flex;gap:14px;align-items:baseline;padding:8px 0;border-bottom:1px solid var(--line)}
.api-enum{color:var(--fg);font-size:13px;min-width:120px}
.api-vals{display:flex;gap:6px;flex-wrap:wrap;color:var(--muted);font-size:13px}
.api-sub{color:var(--subtle);font-weight:600;text-transform:uppercase;font-size:11px;letter-spacing:.04em;margin:18px 0 6px}
.muted{color:var(--muted)}.small{font-size:13px}
.toc{height:calc(100vh - 56px);position:sticky;top:56px;padding:36px 16px;font-size:13px}
.toc-label{color:var(--subtle);font-weight:600;text-transform:uppercase;font-size:11px;letter-spacing:.04em;margin-bottom:10px}
.toc a{display:block;color:var(--muted);padding:5px 0}.toc a:hover,.toc a.active{color:var(--fg)}
.idx-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-bottom:24px}
.idx-card{border:1px solid var(--line);border-radius:var(--radius);background:var(--card);padding:16px}
.idx-card:hover{border-color:var(--line-strong)}
.idx-t{font-weight:600;margin-bottom:4px}.idx-d{font-size:13px;color:var(--muted)}
.dir-meta{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}
.dir-meta .chip{font-size:11px;padding:2px 8px}
.dir-meta .chip.muted{opacity:.65}
.dir-cmd{margin-top:10px;font-family:var(--mono);font-size:12px;color:var(--fg);background:var(--surface);border:1px solid var(--line);border-radius:8px;padding:6px 10px;overflow-x:auto;white-space:nowrap}
/* slint syntax highlight */
.tok-cmt{color:#6b7280}.tok-str{color:#86efac}.tok-kw{color:#c4b5fd}.tok-type{color:#7dd3fc}.tok-prop{color:#fca5a5}
/* mobile nav drawer */
.menu-btn{display:none;background:transparent;border:0;color:var(--fg);font-size:20px;line-height:1;cursor:pointer;padding:6px 8px;margin-left:-6px;border-radius:8px}
.menu-btn:hover{background:var(--surface)}
#scrim{position:fixed;inset:56px 0 0;background:rgba(0,0,0,.55);opacity:0;pointer-events:none;transition:opacity .2s ease;z-index:25}
#scrim.open{opacity:1;pointer-events:auto}
@media(max-width:1100px){.shell{grid-template-columns:220px minmax(0,1fr)}.toc{display:none}}
@media(max-width:900px){
  .menu-btn{display:block}
  .shell{grid-template-columns:minmax(0,1fr)}
  .sidebar{position:fixed;left:0;top:56px;bottom:0;width:284px;height:auto;background:var(--bg);transform:translateX(-100%);transition:transform .22s ease;z-index:30}
  .sidebar.open{transform:translateX(0)}
  body.menu-open{overflow:hidden}
}
@media(max-width:760px){
  .main{padding:24px 20px 64px}
  h1{font-size:clamp(26px,7vw,34px)}
  .desc{font-size:15px}
  h2{font-size:19px;margin-top:32px}
  .preview-card{height:320px}
  .idx-grid{grid-template-columns:1fr}
  .api-row{flex-direction:column;gap:6px}
  .api-enum{min-width:0}
  .s-item{padding:9px 10px}
  .tn-link{font-size:13px}
  .tn-inner{gap:12px;padding:0 16px}
}`;

const DOCS_JS = `// package-manager pills → swap the shown command
fetch("https://api.github.com/repos/zero-sq/slintcn")
  .then((res)=>res.ok?res.json():null)
  .then((repo)=>{
    if(!repo||typeof repo.stargazers_count!=="number")return;
    document.querySelectorAll("[data-stars]").forEach((el)=>{el.textContent=repo.stargazers_count.toLocaleString();});
  })
  .catch(()=>{});

document.querySelectorAll(".install").forEach((box)=>{
  const cmd=box.querySelector(".cmd");
  box.querySelectorAll(".pm").forEach((btn)=>{
    btn.addEventListener("click",()=>{
      box.querySelectorAll(".pm").forEach((b)=>b.classList.remove("active"));
      btn.classList.add("active");
      const v=box.getAttribute("data-cmd-"+btn.dataset.pm);
      if(v)cmd.textContent=v;
    });
  });
});
// copy buttons
document.querySelectorAll(".copy").forEach((btn)=>{
  btn.addEventListener("click",()=>{
    const what=btn.dataset.copy;
    const t=what==="cmd"?btn.closest(".install").querySelector(".cmd").textContent
                        :btn.closest(".code-block").querySelector("code").textContent;
    navigator.clipboard&&navigator.clipboard.writeText(t);
    const o=btn.textContent;btn.textContent="Copied";setTimeout(()=>btn.textContent=o,1200);
  });
});
// minimal Slint syntax highlight
const KW=new Set("import from export property in out in-out callback if for component inherits global struct enum animate states".split(" "));
document.querySelectorAll("code.slint").forEach((el)=>{
  const src=el.textContent;let html="";let i=0;
  const esc=(s)=>s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  while(i<src.length){
    if(src.startsWith("//",i)){let j=src.indexOf("\\n",i);if(j<0)j=src.length;html+='<span class="tok-cmt">'+esc(src.slice(i,j))+"</span>";i=j;continue;}
    if(src[i]==='"'){let j=i+1;while(j<src.length&&src[j]!=='"')j++;j++;html+='<span class="tok-str">'+esc(src.slice(i,j))+"</span>";i=j;continue;}
    let m=/^[A-Za-z_][A-Za-z0-9_-]*/.exec(src.slice(i));
    if(m){const w=m[0];let cls=null;
      if(KW.has(w))cls="tok-kw";
      else if(/^[A-Z]/.test(w))cls="tok-type";
      else if(src[i+w.length]===":"&&src[i+w.length+1]!==":")cls="tok-prop";
      html+=cls?'<span class="'+cls+'">'+esc(w)+"</span>":esc(w);i+=w.length;continue;}
    html+=esc(src[i]);i++;
  }
  el.innerHTML=html;
});
// active TOC on scroll
const heads=[...document.querySelectorAll("h2[id]")];const tl=[...document.querySelectorAll(".toc a")];
if(heads.length&&tl.length){
  const onScroll=()=>{let a=heads[0].id;for(const h of heads){if(h.getBoundingClientRect().top<120)a=h.id;}
    tl.forEach((x)=>x.classList.toggle("active",x.getAttribute("href")==="#"+a));};
  document.addEventListener("scroll",onScroll,{passive:true});onScroll();
}
// mobile nav drawer
(function(){
  const sb=document.querySelector(".sidebar"),sc=document.getElementById("scrim"),mb=document.querySelector(".menu-btn");
  if(!sb||!mb)return;
  const set=(open)=>{sb.classList.toggle("open",open);sc&&sc.classList.toggle("open",open);
    document.body.classList.toggle("menu-open",open);mb.setAttribute("aria-expanded",open);};
  mb.addEventListener("click",()=>set(!sb.classList.contains("open")));
  sc&&sc.addEventListener("click",()=>set(false));
  sb.querySelectorAll(".s-item").forEach((a)=>a.addEventListener("click",()=>set(false)));
  document.addEventListener("keydown",(e)=>{if(e.key==="Escape")set(false);});
})();
// Pre-focus the live-preview iframe on hover so the FIRST click reaches the
// component — Firefox otherwise spends the first click focusing the iframe.
document.querySelectorAll(".preview-card iframe").forEach((f)=>{
  f.addEventListener("pointerenter",()=>{try{f.focus({preventScroll:true});}catch(e){}});
});`;

main().catch((e) => { console.error(e); process.exit(1); });
