# slintcn

[![Pages](https://github.com/stevekwon211/slintcn/actions/workflows/pages.yml/badge.svg)](https://github.com/stevekwon211/slintcn/actions/workflows/pages.yml)
[![npm](https://img.shields.io/npm/v/slintcn?color=white)](https://www.npmjs.com/package/slintcn)
[![License: MIT](https://img.shields.io/badge/License-MIT-white.svg)](LICENSE)

**shadcn/ui-style copy-paste components for Slint native apps.**

[Live docs](https://stevekwon211.github.io/slintcn/docs/) · [Live demo](https://stevekwon211.github.io/slintcn) · [npm](https://www.npmjs.com/package/slintcn)

56 UI components, 8 installable blocks, a theme system, and a static registry you can host yourself.

<p align="center">
  <img src="docs/img/snapshots/preview-data-table.png" alt="slintcn Data Table" width="31%">
  <img src="docs/img/snapshots/preview-command.png" alt="slintcn Command palette" width="31%">
  <img src="docs/img/snapshots/preview-calendar.png" alt="slintcn Calendar" width="31%">
</p>

## Install

```bash
cd your-slint-app
npx slintcn@latest init
npx slintcn@latest add button card input dialog
```

Files land in `ui/slintcn/` — **you own them**. Change colors in
`ui/slintcn/theme/tokens.slint`, tweak `button.slint` for your product, or host
your own registry.

## Why it exists

shadcn proved that developers want to *own* UI code, not fight a theme API.
Slint 1.16 is moving to Fluent as the default — fine for consistency, weak for
modern dark/glass product UI. **slintcn** is the missing layer: tokens + primitives
you copy into your repo and customize.

## Quick start

```bash
# Run the visual showcase
cd examples/showcase && cargo run

# Install components into your Slint project
cd your-slint-app
npx slintcn@latest init
npx slintcn@latest add button card input dialog

# …or from a local checkout:
node /path/to/slintcn/bin/slintcn.mjs init
node /path/to/slintcn/bin/slintcn.mjs add button card input dialog
```

## Philosophy

| Phase | Focus | Status |
|-------|--------|--------|
| **v0.1** | SaaS-adjacent dark glass — Button, Card, Input, Badge | ✅ |
| **v0.1.1** | Foundation hardening — enum variants, focus ring, dogfooded showcase | ✅ |
| **v0.2** | Shell + overlays — Label, Separator, Dialog, AlertDialog, Sheet, Tooltip, Toast | ✅ |
| **v0.3** | Selection primitives + docs-style showcase — Tabs, Checkbox, Switch + Sign-in / Settings / Dashboard examples | ✅ |
| **v0.4** | Select / RadioGroup / Icon + stacked Toast + runtime light/dark `Theme.mode` swap | ✅ |
| **v0.5** | Arrow-key nav, horizontal RadioGroup, modal focus trap, build.rs scaffold hint | ✅ |
| **v0.6** | PopupWindow-based Tooltip (escapes parent bounds) + font embedding guide | ✅ |
| **v0.7** | Growable Rust-backed Toast queue + headless snapshot CI (SoftwareRenderer) | ✅ |
| **v0.8** | PopupWindow Select (focus-based) + Toast fade-out + per-section snapshots + GitHub Actions | ✅ |
| **v0.9** | **shadcn fidelity pass** — token recalibration (h-9, px-4, radius 10, spacing-xl/2xl), segmented Tabs, Dialog X-close + p-6 + click-absorb, all 18 primitives to measured shadcn specs | ✅ |
| **v0.10** | **Breadth batch A** — Accordion, Avatar, Textarea, Progress, Alert, Skeleton, Toggle, ToggleGroup (26 components) | ✅ |
| **v0.11** | **Breadth batch B** — Breadcrumb, Pagination, Table, Slider (30 components) | ✅ |
| **v0.12** | **Web-parity P0** — Text typography + game/HUD trio (Keycap, HudPill, SlotTile) + variant axes (Card padding/radius, Badge ghost/link, Tabs line) (34 components) | ✅ |
| **v0.13** | **Web-parity P1/P2** — ScrollArea (Flickable + custom scrollbar), Popover, ContextMenu (right-click) (37 components) | ✅ |
| **v0.14** | **Distribution backbone** — registry metadata (type/title/category), CLI `list`/`view`/`build`, remote-URL + namespaced install, npm/HTTP-ready | ✅ |
| **v0.15** | **Blocks** — sign-in, login, pricing, dashboard, settings as installable `registry:block` templates | ✅ |
| **v0.16** | **Theming** — base-color variants (neutral/zinc/slate/stone) via `slintcn init --base-color` + Colors reference | ✅ |
| **v0.17** | **Docs IA** — showcase as a docs site: install command + usage code per component section | ✅ |
| **v0.18** | **Docs site (ui.shadcn.com clone)** — generated per-component pages with live WASM preview + install tabs + usage code + sidebar IA at `/docs` | ✅ |
| **v0.19** | **Adoption mode** — install into an existing design system: external tokens, import map, filename style, dry-run/diff/no-overwrite, lockfile, `export` | ✅ |
| **v0.20** | **Adoption W2** — headless overlay panels (DialogPanel/AlertDialogPanel/SheetPanel) + external enums (`--external-enums`) | ✅ |
| **v0.21** | **Adoption W3** — docs API section (variants/sizes auto-derived) + per-item a11y/behavior contract (`a11y.json`, surfaced in docs + `export`) | ✅ |
| **v0.22** | **Adoption W4** (from Zero adoption testing) — unified add/diff/export pipeline (diff+export now apply external-enums), adoption flags persist to slintcn.json, per-file `routes` (route overlay panels out of `componentsDir`) | ✅ |
| **v0.22.1** | **Responsive + polish** — mobile nav drawer for the docs, demo fills the window (no letterbox, no resize flicker), Popover/ContextMenu layout fix, Firefox first-click focus | ✅ |
| **v0.23** | **Blocks expansion** — Team (members + roles), Profile (account form), Stats (metrics + traffic bars) → 8 blocks total | ✅ |
| **v0.24** | **Menu family** — DropdownMenu (click), HoverCard (hover), Menubar (per-trigger popups), NavigationMenu (active-state nav) → 43 components | ✅ |
| **v0.24.1** | **Property docs** — every `in` / `in-out` / `out` / callback has a one-line description; docs site surfaces them in a per-component Properties section | ✅ |
| **v0.24.2** | **Menu keyboard nav** — Esc / ↑↓ / Enter inside DropdownMenu + Menubar popups; ←→ / Enter for NavigationMenu; a11y contracts for all four | ✅ |
| **v0.25** | **Command & Combobox** — Combobox (searchable Select); Command (⌘K palette modal) → 45 components | ✅ |
| **v0.25.1** | **Combobox + Command keyboard nav** — ↑/↓ move highlight, Enter selects, Esc closes (ancestor FocusScope catches keys bubbling from the search Input) | ✅ |
| **v0.26** | **Data Table** — sortable headers + paginated rows + row clicks; consumer owns data slicing → 46 components | ✅ |
| **v0.27** | **Calendar + Date Picker** — month grid (`Calendar`) + Popover-wrapped trigger (`DatePicker`); consumer owns date math → 48 components | ✅ |
| **v0.28** | **App-shell** — `Sidebar` (collapsible nav with icons + active highlight), `Empty` (zero-state surface), `AspectRatio` (layout helper) → 51 components | ✅ |
| **v0.29** | **Catalog round-out** — `Collapsible` (single show/hide section), `ButtonGroup` (joined Buttons) → 53 components | ✅ |
| **v0.30** | **Game HUD expansion** — `Hotbar` (SlotTile strip), `Reticle` (crosshair overlay), `CompassStrip` (scrolling heading) → 56 components | ✅ |
| **v0.31** | **MCP server** — `slintcn-mcp` bin exposes the registry to MCP-capable AI agents (Claude Desktop, Cursor, Windsurf). Tools: `list_components`, `list_blocks`, `view_component`, `install_command` | ✅ |
| **v0.32** | **Directory page** — `/docs/directory` lists community + official registries; entries land via PR to `registry/directory.json` (ecosystem discovery surface) | ✅ |
| **v0.33** | **Discovery + completion** — per-component snapshot pipeline (64 PNGs via `--previews`), `/create` preset page (pick components → copy install command), gallery + README hero refresh | ✅ |

SaaS-first is a **wedge**, not a ceiling. Once tokens + motion + hover semantics
exist, a second registry (`registry/game/`) is just more `.slint` files.

## Prerequisites

- **Rust** with Slint 1.16 (for the showcase or your Slint app)
- **Node 20+** (the CLI runtime)

```slint
import { Button, ButtonVariant, ButtonSize } from "slintcn/components/button.slint";
import { Dialog } from "slintcn/components/dialog.slint";

Button {
    variant: ButtonVariant.glow;
    size: ButtonSize.lg;
    text: "Ship it";
    clicked => { my-dialog.open = true; }
}

// Modal must be the LAST child of Window:
my-dialog := Dialog {
    width: parent.width;
    height: parent.height;
    title: "Confirm";
    description: "Ship to production?";
}
```

Variants and sizes are **typed enums** — a typo fails to compile rather than
silently falling through to the default styling.

## CLI & distribution

slintcn isn't a library you depend on — it's a **distribution system for
copy-paste Slint code** (the shadcn model). The CLI:

```bash
slintcn init                       # create slintcn.json + install theme tokens
slintcn add button card input      # copy components + their deps (import-rewritten)
slintcn list                       # browse the catalog, grouped by category
slintcn view dialog [--files]      # an item's metadata, install order, and source
slintcn build -o dist/registry     # emit a static registry (registry.json + r/*.json)
```

**Config — `slintcn.json`** (created by `init`): `style` (which registry),
`baseColor` (`neutral` · `zinc` · `slate` · `stone` — pick at init with
`slintcn init --base-color zinc`), `outDir`/`themeDir`/`componentsDir`/`blocksDir`
(where files land — fully relocatable, imports are rewritten to match), and
`registries` (namespace → URL).

**Remote / custom registries.** `slintcn build` emits a static registry —
a `registry.json` index plus `r/<name>.json` files with each component's
source inlined. Host that anywhere and install from it:

```bash
slintcn add https://stevekwon211.github.io/slintcn/r/button.json   # direct URL
slintcn add @acme/button                                           # via registries config
```

`registryDependencies` (e.g. a component needing `theme`) resolve recursively
against the same registry. The official registry is served at
`https://stevekwon211.github.io/slintcn/r/`.

> **Maintainers:** publish to npm with `npm login && npm publish` (the package
> ships `bin`, `registry`, `templates`, `schema`; `prepublishOnly` runs tests).

## Community registries

slintcn isn't tied to one registry. Any host that serves a `registry.json` +
per-item `r/<name>.json` (the shape `slintcn build` emits) is a valid registry,
and `slintcn add @namespace/name` installs from it once you wire the namespace
into `slintcn.json`'s `registries` map.

Browse + list yours at **[stevekwon211.github.io/slintcn/docs/directory](https://stevekwon211.github.io/slintcn/docs/directory.html)** —
open a PR to [`registry/directory.json`](registry/directory.json) to be listed.

## MCP server (AI agents)

slintcn ships a Model Context Protocol server so MCP-capable agents (Claude
Desktop, Cursor, Windsurf, etc.) can browse the registry and emit the right
install command without scraping docs. Zero runtime deps — pure stdio JSON-RPC.

Wire it into your client's MCP config:

```json
{
  "mcpServers": {
    "slintcn": { "command": "npx", "args": ["-y", "-p", "slintcn", "slintcn-mcp"] }
  }
}
```

(`slintcn-mcp` is a bin entry inside the `slintcn` package, not a separate
package — `-p slintcn` tells npx which package to pull, then runs that bin.)

Exposed tools:

| Tool | What it does |
|---|---|
| `list_components` | Every UI component with title / category / one-liner |
| `list_blocks` | Every installable block (full-screen compositions) |
| `view_component` | Full metadata + usage snippet for one item |
| `install_command` | Exact `npx slintcn@latest add …` for N items |

The server reads the bundled `registry/default/registry.json` + the same usage
snippets the docs site renders, so what it tells the agent and what `slintcn
add` actually installs always match.

## Adopting into an existing design system

The default `slintcn add` creates a standalone `ui/slintcn` island with its own
`Tokens`. If you already have a design system — generated tokens, your own
overlay root, `snake_case` filenames — slintcn can install **into** it instead
of beside it. Every flag below is opt-in (set on the CLI or in `slintcn.json`);
absent, behavior is unchanged.

```bash
# Point components at YOUR Tokens (theme not installed); land them in your dir;
# rename to snake_case; preview the plan before touching disk.
slintcn add button card \
  --external-tokens ./generated/native/tokens.slint \
  --components-dir apps/desktop/ui/primitives \
  --filename-style snake \
  --dry-run
```

| Flag / `slintcn.json` key | Effect |
|---|---|
| `--external-tokens <path>` / `externalTokens` | Don't install the theme; rewrite every `import { Tokens } from "../theme/tokens.slint"` to `<path>`. Your file must export a `Tokens` global with the roles components read. |
| `--external-enums <dir>` / `externalEnums` | Strip each component's local `export enum`s and import (+ re-export) them from `<dir>/<name>.slint` — for consumers whose enums are generated elsewhere. |
| `--components-dir <dir>` / `componentsDir` (also `themeDir`/`blocksDir`) | Where files land — fully relocatable; imports are rewritten to match. |
| `--filename-style snake` / `fileNameStyle` | `kebab` (default) or `snake` — `slot-tile.slint → slot_tile.slint`, and sibling/cross-file imports follow. |
| `--import-map <file.json>` / `importMap` | Arbitrary `{ "<import>": "<target>" }` overrides, highest precedence. |
| `routes` (slintcn.json) | Per-file destination overrides — `{ "components/dialog-panel.slint": "ui/surfaces/overlays/dialog_panel.slint" }` — to send e.g. overlay panels somewhere other than `componentsDir` while their deps still import from `componentsDir`. |
| `--dry-run` | Print the plan (`+ new` · `~ overwrite` · `= skip`) and write nothing (won't even create `slintcn.json`). |
| `--no-overwrite` / `overwrite: false` | Skip files that already exist. |

**Diff against upstream — reference, not just install.** Every real `add`
records `slintcn.lock.json` (a sha256 per written file). Then:

```bash
slintcn diff button     # unified diff: installed (rewritten for your config) vs registry
                        # annotates "locally modified since install" vs "upstream changed"
```

**Headless overlay panels.** If you have your own modal root, install the panel
without the backdrop/mount machinery: `dialog-panel` (`DialogPanel`),
`alert-dialog-panel` (`AlertDialogPanel`), `sheet-panel` (`SheetPanel`). The
batteries-included `Dialog`/`AlertDialog`/`Sheet` are these panels composed with
a `Scrim` + full-window mount.

**Feed your own codegen.** `export` emits one resolved item as JSON — metadata
plus file content **already rewritten for your config** — so a monorepo codegen
step can consume slintcn deterministically without a build.rs island:

```bash
slintcn export button --stdout        # JSON to stdout (pipeable)
slintcn export button                 # → dist/export/button.json
```

> `add`, `diff`, and `export` all run the **same** resolution pipeline (import
> rewrite + external tokens + external enums + filename style + routes), so a
> `diff`/`export` reflects exactly what `add` writes. A first `add` with adoption
> flags also persists them into `slintcn.json` so follow-up commands match.

## Components (default registry)

56 components across 11 categories — **actions, form, layout, display, feedback,
overlay, navigation, data, media, typography, hud** — plus 8 installable blocks.
Every component has a live preview, an auto-generated Properties section, and an
accessibility contract at **[stevekwon211.github.io/slintcn/docs](https://stevekwon211.github.io/slintcn/docs/)**
— that's the canonical catalog and never drifts from the source.

A quick map of the categories:

| Category | What's in it |
|---|---|
| **actions** | Button, ButtonGroup |
| **form** | Input, Textarea, Label, Checkbox, Switch, RadioGroup, Select, Combobox, Toggle, ToggleGroup, Slider, Calendar, DatePicker |
| **layout** | Card, Separator, AspectRatio |
| **display** | Badge, Accordion, Collapsible, Empty |
| **feedback** | Alert, Progress, Skeleton, Toast |
| **overlay** | Dialog (+ Panel), AlertDialog (+ Panel), Sheet (+ Panel), Tooltip, Popover, ContextMenu, DropdownMenu, HoverCard, Menubar, Command |
| **navigation** | Tabs, Breadcrumb, Pagination, NavigationMenu, Sidebar |
| **data** | Table, DataTable |
| **media** | Avatar, Icon |
| **typography** | Text |
| **hud** | Keycap, HudPill, SlotTile, Hotbar, Reticle, CompassStrip |

**Blocks**: Sign-in, Login, Pricing, Dashboard, Settings, Team, Profile, Stats.

### Keyboard contracts (verified per component in `a11y.json`)
- **Buttons / Checkbox / Switch / Toggle** — Enter / Space activates.
- **Tabs / RadioGroup / Slider** — Arrow keys navigate.
- **Select / DropdownMenu / Menubar / Combobox / Command** — Arrow keys + Enter inside an open popup; Escape closes.
- **Dialog / AlertDialog** — Tab trapped inside; Escape dismisses.
- **NavigationMenu** — ←/→ moves the active item, Enter fires `navigate`.

### Composed examples

`cd examples/showcase && cargo run` opens a sidebar-navigated app exercising
every primitive. The eight blocks ship as standalone screens: **Sign-in,
Login, Pricing, Dashboard, Settings** (auth + product UI) and **Team, Profile,
Stats** (members management, account form, analytics).

## Mounting overlays

Slint has no portal primitive, so modals mount as the **last child** of Window
and span the full window area:

```slint
Window {
    VerticalLayout { /* main UI */ }

    Dialog {
        width: parent.width;
        height: parent.height;
        open <=> dialog-state;
        title: "…";
    }

    Toaster { width: parent.width; height: parent.height; }
}
```

The Scrim in `popup-helpers.slint` only mounts its TouchArea while shown, so
closed modals don't block interaction with the underlying UI.

## vs alternatives

| | std-widgets / Fluent | [slint-ui-system](https://crates.io/crates/slint-ui-system) | **slintcn** |
|--|----------------------|--------------------------------------------------------------|-------------|
| Model | Framework widgets | Crate dependency | **Copy-paste** |
| Aesthetic | Platform / Fluent | Neon dashboard | **Dark glass / shadcn-like** |
| Customize | Theme API | Crate version lock | **Edit the `.slint` file** |
| Overlays | Limited PopupWindow | — | **Dialog · Sheet · Tooltip · Toast** |

## Project layout

```
registry/default/         # Source of truth (published with npm package)
  theme/palette.slint     #   raw color/alpha primitives
  theme/tokens.slint      #   semantic layer (components read this)
  components/*.slint      #   56 components + popup-helpers + lucide-paths
examples/showcase/        # Runnable gallery (regenerated via `slintcn add`)
bin/slintcn.mjs           # init + add CLI (transitive deps)
bin/__test__/             # node:test suite — `make test`
```

Run `make verify` before committing — it runs node tests, `cargo build`, and
`cargo clippy -D warnings` end-to-end. Run `make snapshot` to headlessly render
each showcase section to `docs/img/snapshots/section-<n>-<name>.png` via Slint's
SoftwareRenderer (no display server required); per-section baselines live in
the repo for visual-regression diffs.

Quality gate is local (no CI workflow): a tracked **pre-push hook** runs
`make verify` (node tests + cargo build + clippy `-D warnings`) and blocks the
push on failure. Enable it once per clone with `git config core.hooksPath
.githooks`; bypass a single push with `git push --no-verify`. Run `make
snapshot` to refresh the visual-regression baselines.

## Toast Rust glue (required for Toaster to function)

Toast's queue lives in Rust (`slint::VecModel<ToastItem>`) — pure-Slint array
mutation is too limited in 1.16 for a real stack. Mount this glue in your
app's `main.rs`:

```rust
use slint::{ComponentHandle, Model, ModelRc, SharedString, Timer, TimerMode, VecModel};
use std::{cell::RefCell, collections::HashMap, rc::Rc, time::Duration};

let items: Rc<VecModel<ToastItem>> = Rc::new(VecModel::default());
let next_id = Rc::new(RefCell::new(1i32));
let timers: Rc<RefCell<HashMap<i32, Timer>>> = Rc::default();
let queue = ui.global::<ToastQueue>();
queue.set_items(ModelRc::from(items.clone()));
// see examples/showcase/src/main.rs for the full on_show / on_dismiss closures
```

Required Slint feature: `slint = { version = "1.16", features = ["compat-1-2"] }`.
For visual-regression snapshots also enable `"renderer-software"`.

## Roadmap

See [docs/ROADMAP.md](docs/ROADMAP.md).

## License

MIT
