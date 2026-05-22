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
  html += `<a class="s-item" href="../demo.html">Playground</a></div>`;
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
    <a class="logo" href="../"><span class="dot"></span> slintcn <span class="pill">docs</span></a>
    <span class="grow"></span>
    <a class="tn-link" href="../demo.html">Playground</a>
    <a class="tn-link" href="https://github.com/stevekwon211/slintcn">GitHub</a>
    <a class="tn-link" href="https://www.npmjs.com/package/slintcn">npm</a>
  </div></header>`;
}

function page(item, prev, next, items) {
  const cmds = installCommands(item.name);
  const code = usage[item.name] ?? `import { } from "slintcn/components/${item.name}.slint";`;
  const deps = (item.requires ?? []).filter((d) => d !== "theme");
  const depChips = deps.length
    ? deps.map((d) => `<a class="chip" href="./${d}.html">${esc(d)}</a>`).join("")
    : `<span class="muted">theme only</span>`;

  const prevNext = `<div class="prevnext">
    ${prev ? `<a href="./${prev.name}.html" class="pn">← ${esc(prev.title)}</a>` : `<span></span>`}
    ${next ? `<a href="./${next.name}.html" class="pn">${esc(next.title)} →</a>` : `<span></span>`}
  </div>`;

  const pmPills = ["npm", "pnpm", "yarn", "bun"]
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
    <div class="cmd-row"><code class="cmd">${esc(cmds.npm)}</code><button class="copy" data-copy="cmd">Copy</button></div>
  </div>

  <h2 id="usage">Usage</h2>
  <div class="code-block">
    <button class="copy" data-copy="code">Copy</button>
    <pre><code class="slint">${esc(code)}</code></pre>
  </div>

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
  <a href="#dependencies">Dependencies</a>
</aside>
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
  // docs pages = user-facing items only (ui + blocks); skip theme + lib helpers.
  const items = catalogFromRegistry(registry).filter(
    (i) => i.type === "registry:ui" || i.type === "registry:block",
  );

  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, "docs.css"), DOCS_CSS);
  await writeFile(path.join(outDir, "docs.js"), DOCS_JS);
  await writeFile(path.join(outDir, "index.html"), indexPage(items));

  for (let i = 0; i < items.length; i++) {
    const html = page(items[i], items[i - 1], items[i + 1], items);
    await writeFile(path.join(outDir, `${items[i].name}.html`), html);
  }
  console.log(`Docs → ${path.relative(process.cwd(), outDir)}/ (${items.length} pages + index)`);
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
.muted{color:var(--muted)}.small{font-size:13px}
.toc{height:calc(100vh - 56px);position:sticky;top:56px;padding:36px 16px;font-size:13px}
.toc-label{color:var(--subtle);font-weight:600;text-transform:uppercase;font-size:11px;letter-spacing:.04em;margin-bottom:10px}
.toc a{display:block;color:var(--muted);padding:5px 0}.toc a:hover,.toc a.active{color:var(--fg)}
.idx-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-bottom:24px}
.idx-card{border:1px solid var(--line);border-radius:var(--radius);background:var(--card);padding:16px}
.idx-card:hover{border-color:var(--line-strong)}
.idx-t{font-weight:600;margin-bottom:4px}.idx-d{font-size:13px;color:var(--muted)}
/* slint syntax highlight */
.tok-cmt{color:#6b7280}.tok-str{color:#86efac}.tok-kw{color:#c4b5fd}.tok-type{color:#7dd3fc}.tok-prop{color:#fca5a5}
@media(max-width:1100px){.shell{grid-template-columns:220px minmax(0,1fr)}.toc{display:none}}
@media(max-width:760px){.shell{grid-template-columns:1fr}.sidebar{display:none}.main{padding:24px 20px 60px}.idx-grid{grid-template-columns:1fr}}`;

const DOCS_JS = `// package-manager pills → swap the shown command
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
}`;

main().catch((e) => { console.error(e); process.exit(1); });
