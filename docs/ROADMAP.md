# slintcn roadmap

## Planned (v0.23+)

The distribution system (CLI · registry · docs · adoption mode) is at parity
with shadcn and ahead in places. The remaining gap is purely **component
catalog breadth**. These waves close it, ordered by value to real Slint apps,
not by chasing shadcn's full React-era list. Each wave ships a complete set:
component + variants + snapshot + docs preview + a11y/behavior contract + usage
snippet (the `docs-accuracy` test enforces the metadata). Every new component
must keep working under adoption mode (external tokens/enums, routes).

Lead with the menu family (we already have the overlay infra) and the app-shell
primitives (they serve real adopters like the Zero desktop app). Charts are a
heavy, separate R&D track; the Game/HUD layer is the long-term differentiator.

### v0.25 — Command & Combobox (search / filter)
- **Combobox** (searchable Select), **Command** (⌘K palette: groups + filter).
- Why: ⌘K is table-stakes in modern tools; Combobox unblocks large option sets.
- Reuse: Select trigger + PopupWindow + Input for the query; filter a VecModel.
- Risk: result highlight + keyboard nav; the global ⌘K shortcut is consumer-side.

### v0.26 — Data Table
- Sortable / filterable / paginated / row-selectable table (extends `Table`).
- Why: the single biggest "complex" gap; most-requested.
- Reuse: Table + Checkbox (select) + Pagination + Input (filter) + Button (sort).
- Risk: column sizing + virtualized scroll for large data (ScrollArea). Own wave.

### v0.27 — Date & Calendar
- **Calendar** (month grid + keyboard), **Date Picker** (Calendar in a Popover),
  basic range select.
- Why: forms / scheduling.
- Risk: date math in Rust glue, locale / first-day-of-week, range selection.

### v0.28 — App-shell primitives
- **Sidebar** (collapsible app sidebar), **Resizable** (split panes), **Drawer**
  (sheet variant).
- Why: makes slintcn viable for full desktop app shells — directly serves
  adopters like the Zero desktop app.
- Reuse: Sheet (Drawer), ScrollArea, layout primitives; Resizable = TouchArea
  drag + width state.

### v0.29 — Catalog round-out (small gaps)
- Collapsible, Aspect Ratio, Input OTP, Spinner, Carousel, Button Group,
  Empty / Field / Item, Native Select, Kbd (alias Keycap).
- Why: parity polish; each is small.

### v0.30 — Charts (separate R&D track)
- Area / Bar / Line / Pie.
- Why: shadcn has a whole charts section — a real gap.
- Risk: **heavy.** No Slint charting primitive exists; build one (Path/polyline
  drawing + axes/scales, geometry computed in Rust). Gate on actual demand.

### Tooling track (parallel)
- **MCP server** — let AI agents discover + `slintcn add` (shadcn ships one);
  reuse the registry + `bin/slintcn.mjs` helpers.
- **Directory page** (shadcn `/docs/directory` analog) for community registries.
- Optional **`/create`-style preset page** (pick components → copy command).

### v1.0 — Game / HUD expansion (the differentiator)
- Hotbar, reticle, health/mana/stamina bars, minimap frame, full keycap-hint
  system, damage numbers.
- Why: slintcn's unique angle ("Slint for games + tools"); no shadcn equivalent.
  Widen this moat once catalog parity is "good enough."

> Prioritization note: Slint's audience is smaller than React's, so depth on
> app-shell + the components Slint apps actually need + the HUD differentiator
> beats chasing all ~60 shadcn components. Skip the React-only items (Form/
> react-hook-form, framework adapters, Figma).

---

## v0.24 — menu family (current)

PopupWindow + the verified preferred-* exposure pattern (from Tooltip/Select/
Popover/ContextMenu) reused for four new overlay/nav primitives:

- [x] **DropdownMenu** — click-triggered action menu anchored below `@children`;
      list of items, `selected(int)`.
- [x] **HoverCard** — hover-triggered floating card (title + description) using
      Tooltip's `has-hover → popup.show/close` pattern with richer card chrome.
- [x] **Menubar** — horizontal row of menus (File/Edit/View) with per-trigger
      PopupWindows; `selected(menu, item)`. (v1 — no cross-menu keyboard nav.)
- [x] **NavigationMenu** — horizontal nav strip with active highlight;
      distinct from Tabs (no content slot, you drive routing).

43 components total. Each registered, usage verified by docs-accuracy (50/50),
wired into PreviewHost so docs previews are live.

## v0.23 — blocks expansion

shadcn's signature strength is **Blocks** — drop-in full screens. We had 5;
ship three more, composed from existing components (no new primitives):

- [x] **Team** — members list with avatars, roles, and an Invite action
      (Card + Avatar + Badge + Button).
- [x] **Profile** — account-settings form: avatar, name, email, bio, save/cancel
      (Card + Avatar + Input + Textarea + Button).
- [x] **Stats** — analytics overview: four metric cards + traffic-by-source
      bars (Card + Label + Badge + Progress; bars stand in until charts ship).

8 blocks total. Each registered + previewed in docs (`/docs/team`, `/profile`,
`/stats`) + usage snippets verified by the docs-accuracy test.

## v0.22.1 — responsive site + polish

- [x] **Docs mobile nav** — off-canvas drawer (☰ → sidebar over a scrim; closes on
      scrim/Esc/select; body scroll lock). Restores component navigation on phones.
- [x] **Playground sizing** — the WASM showcase fills the window like a maximized
      app (no letterbox, no clip); resize is debounced so Slint doesn't realloc its
      WebGL surface every frame (the Safari/Firefox flicker). `<760px` shows a note +
      docs link and skips the 7 MB download.
- [x] **Landing mobile** — fluid hero, condensed nav, overflow-safe install/commands.
- [x] **Popover/ContextMenu layout** — expose `preferred-*` so they don't collapse
      to 0 width and overlap siblings (same class as the earlier Tooltip/Select fix).
- [x] **Firefox first-click** — focus the canvas/iframe so the first click reaches
      the component (Select/Switch no longer need two clicks).

## v0.22 — adoption W4 (Zero adoption-test fixes)

The Zero desktop team ran v0.21 against their apps/desktop checkout and found
four real gaps — all fixed here:

- [x] **Unified resolution pipeline** — `resolveFileContent()` (import rewrite +
      external tokens + external enums + filename style + routes) is now the
      single source of truth for `add`, `diff`, AND `export`. Previously `diff`
      and `export` ran only `rewriteImports`, so they ignored `externalEnums`
      and reported spurious upstream-changed deltas / shipped local enums.
- [x] **Adoption flags persist** — a first `add` with adoption flags now writes
      them into `slintcn.json` (so follow-up `diff`/`export`/`add` use the same
      settings); passing flags when a config already exists warns instead of
      silently drifting.
- [x] **Per-file `routes`** — `routes: { "components/dialog-panel.slint":
      "ui/surfaces/overlays/dialog_panel.slint" }` sends overlay panels (or any
      file) somewhere other than `componentsDir`, and sibling imports resolve to
      each dep's real destination (panel in surfaces, deps in primitives).

## v0.21 — adoption W3 (richer registry metadata)

- [x] **Docs API section** — `Variants` / `Sizes` auto-derived from each
      component's source enums (always in sync, zero maintenance); rendered as
      chips on every component page + a TOC entry.
- [x] **Behavior / a11y contract** — `registry/default/a11y.json` declares
      `{ focusable, keyboard, focusTrap, escapeDismiss }` per interactive item.
      Surfaced in the docs "Accessibility" block AND merged into `slintcn export`
      output, so a consumer's design-system spec can adopt the keyboard/focus
      semantics, not just the visuals.

## v0.20 — adoption W2 (headless panels + external enums)

- [x] **Headless overlay panels** — extracted `DialogPanel` / `AlertDialogPanel`
      / `SheetPanel` (the card, no Scrim/mount) into their own registry items;
      the mounted `Dialog`/`AlertDialog`/`Sheet` are now `Scrim` + panel
      composed. Consumers with their own modal root install just the panel.
      Visually identical (snapshot + embed-preview verified).
- [x] **External enums** — `--external-enums <dir>` / `externalEnums`:
      `stripLocalEnums` removes a component's `export enum`s and imports
      (+ re-exports, so siblings still resolve) them from `<dir>/<name>.slint`.

## v0.19 — adoption mode (install into an existing design system)

Prompted by Zero-desktop-team feedback: slintcn's *components* were fine but its
*integration model* assumed a standalone `ui/slintcn` island. This wave makes the
CLI adopt into an existing Slint design system — generic + opt-in, not coupled to
any one consumer.

- [x] **Config-driven rewrite engine** — `rewriteImports(content, config, destAbs)`
      resolves per precedence: `importMap` → external-tokens redirect → theme/
      components/blocks → bare sibling, applying `fileNameStyle`. Default output
      byte-identical (regression-tested).
- [x] **External tokens** — `--external-tokens <path>` / `externalTokens`: skip
      installing the theme; rewrite `Tokens` imports to the host file.
- [x] **Filename style** — `--filename-style snake` / `fileNameStyle`:
      `slot-tile.slint → slot_tile.slint`, imports follow.
- [x] **Import map** — `--import-map <file>` / `importMap`: arbitrary overrides.
- [x] **Non-destructive** — `--dry-run` (plan, no writes), `--no-overwrite`,
      `slintcn diff <name>` (vs registry, lockfile-annotated), `slintcn.lock.json`.
- [x] **Export** — `slintcn export <name> [--stdout]`: one resolved item as JSON,
      content rewritten for the config, for monorepo codegen.
- Next (W2): external enums / `--no-local-enums`; headless Dialog→DialogPanel split.

## v0.18 — docs site (ui.shadcn.com clone)

`/demo.html` (one cramped WASM window) didn't read as "quality" next to
ui.shadcn.com. This wave builds a real docs site at `/docs`.

- [x] **Showcase isolated-preview mode** — `AppWindow.preview-name` renders a
      chromeless single component via a `PreviewHost` (40 instances; overlays
      open). `lib.rs` reads `?preview=<name>` on WASM start; `web/embed.html`
      loads the bundle. (web-sys gained `Window`/`Location` features.)
- [x] **Docs generator** — `scripts/build-docs.mjs` reads the registry (via
      `catalogFromRegistry`) + `scripts/docs-usage.mjs` snippets → one page per
      component/block + index, into `web/docs/`. Self-contained CSS/JS.
- [x] **shadcn-clone page** — sidebar IA (Get started + Components by category +
      Blocks), H1 + description, prev/next, **live WASM preview card** (iframe →
      `embed.html?preview=`), Installation tabs (npm/pnpm/yarn/bun + copy),
      Usage (`.slint`, hand-rolled syntax highlight + copy), dependency chips,
      right-hand TOC. Dark glass.
- [x] Deploy: pages.yml runs the generator → `/docs`; landing + demo link in.

## v0.17 — docs IA

The WASM showcase becomes a docs site: every component section now leads
with a shadcn-docs-style **install command + usage code** above its live
preview.

- [x] **DocBlock** showcase component — a `$ slintcn add …` command box over
      an optional `.slint` usage snippet, both monospace.
- [x] Applied to all 12 component sections (Buttons → Interaction): each
      shows how to install it and a minimal usage example, then the gallery.

That completes the shadcn.com ecosystem port: distribution backbone (v0.14),
blocks (v0.15), theming (v0.16), and docs IA (v0.17).

## v0.16 — theming

Base-color variants — shadcn's neutral/zinc/slate/stone choice, chosen at
init via `slintcn.json` `baseColor`.

- [x] **Variant palettes** — `theme/palette-{zinc,slate,stone}.slint`
      (Tailwind neutral scales); `palette.slint` stays the default neutral.
- [x] **baseColor-driven install** — `installItem(theme)` writes the
      `baseColor`-matching palette as `palette.slint` (so `tokens.slint`'s
      import resolves). `slintcn init --base-color zinc` records the choice.
- [x] **Colors showcase section** — neutral ramp (50–950) + accent swatches.

## v0.15 — blocks

Composed, multi-component templates distributed as `registry:block` items —
shadcn's "blocks." Installable like any component: `slintcn add sign-in`.

- [x] **Block routing** — `slintcn.json` `blocksDir` (default `outDir/blocks`);
      `routeDest` sends `blocks/*` there; imports rewritten as usual.
- [x] **5 blocks** in `registry/default/blocks/`: **sign-in**, **login**,
      **pricing** (3-tier), **dashboard** (metrics + activity feed),
      **settings** (tabbed). Each is a self-contained component composing
      primitives, with exposed props + callbacks.
- [x] Registered as `registry:block` (category `block`) with `requires`;
      added to the showcase's `build.rs` + a new **Blocks** showcase section.

## v0.14 — distribution backbone

shadcn.com isn't a component library — it's "a distribution system for code."
This wave brings slintcn's ecosystem up to that model.

- [x] **Registry metadata** — every item gains `type` (registry:ui/theme/lib),
      `title`, `description`, `category`; `schema/registry.schema.json` documents
      the shape; a shape test guards it.
- [x] **CLI `list`** — catalog grouped by category (`--json` for machines).
- [x] **CLI `view <name>`** — metadata + resolved install order + files
      (`--files` prints source).
- [x] **CLI `build`** — emit a static registry: `registry.json` index +
      `r/<name>.json` items with source inlined as `content` (shadcn's resolved
      shape). Dogfooded in the Pages deploy → served at `/r/`.
- [x] **Remote install** — `slintcn add <https-url>` and `@ns/name` (via
      `slintcn.json` `registries`); `registryDependencies` resolve recursively;
      reuses the local import-rewriting. Verified with a real HTTP round-trip.
- [x] **Config** — `slintcn.json` gains `baseColor` + `registries`.
- [x] **npm-ready** — `files` ships `schema`; `prepublishOnly` runs tests;
      `npm login && npm publish` is the only operator step left.

## v0.13 — web-parity P1/P2

Closes the remaining audit gaps — the interaction-heavy ones. 34 → 37.

- [x] **ScrollArea** — clipped `Flickable` viewport with a slim custom
      scrollbar (thumb size/position from viewport-y / content-height /
      visible-height). Set `content-height`; lay children to that height.
- [x] **Popover** — click-triggered floating panel; trigger is `@children`,
      content is a `title` + `description` card in a PopupWindow that closes
      on click-outside.
- [x] **ContextMenu** — right-click menu over an area (`@children`); a
      TouchArea `pointer-event` catches the right button and opens a
      PopupWindow at the cursor with `items`, each firing `selected(int)`.
- [x] Showcase: **Interaction** section.

## v0.12 — web-parity P0

Driven by an audit of a real Base-UI/shadcn web app (apps/web): the 21 UI
elements actually used there, with their variant axes. Closed slintcn's P0
gaps. 30 → 34 components.

- [x] **Text** — typography primitive: `variant` (display/headline/title/
      body-lg/body/body-sm/label/caption) × `tone` (default/muted/subtle/
      accent/danger). Import `as Typography` to avoid the built-in `Text`.
- [x] **Keycap** — keyboard-hint cap; `size` (sm/md) × `tone` (on-glow/
      on-glass/muted/affirm-*/deny-*). Affirm = green, deny = red.
- [x] **HudPill** — rounded-full status pill; `size` (sm/md/lg) × `tone`
      (scrim0/scrim1/scrim2).
- [x] **SlotTile** — inventory/hotbar slot holding `@children`; `tone`
      (stone/empty/accent) × `state` (idle/active/disabled) × `interactive`.
- [x] **Variant axes**: Card gains `card-padding` (none/sm/md/lg) +
      `card-radius` (md/lg/xl/xxl); Badge gains `ghost` + `link`; Tabs gains
      a `line` variant (underline) alongside the default segmented control.
- [x] Tokens: `color-affirm` (green), `color-subtle-foreground`,
      `color-scrim-0/1` (HUD pill levels).
- [x] Showcase: **Typography** + **HUD** sections.

## v0.11 — breadth batch B

Navigation + data primitives. 26 → 30 components.

- [x] **Breadcrumb** — chevron-separated path; last item is the current
      page (foreground, non-clickable), earlier items fire `navigate(int)`.
- [x] **Pagination** — prev / page-numbers / next; active page highlighted;
      `total` + 0-based `current`, `changed(int)`. Uses `for page in total`.
- [x] **Slider** — track + filled + draggable thumb; drag via TouchArea
      moved/pressed + mouse-x, ←/→ arrow keys, focus ring; `value` 0–100.
- [x] **Table** — `columns: [string]` header + `rows: [TableRow{cells}]`;
      equal-stretch columns, row hover, hairline dividers.
- [x] Showcase: new **Navigation** (Breadcrumb/Pagination/Slider) and
      **Data** (Table) sections.

## v0.10 — breadth batch A

Eight static (no-popup) primitives, born on the v0.9-calibrated token system.
18 → 26 components.

- [x] **Accordion** — single-open collapsible; animated content height,
      chevron swaps down/up, border-b dividers.
- [x] **Avatar** — circular image with initials fallback; `size` diameter.
- [x] **Textarea** — multi-line word-wrapping input with focus ring.
- [x] **Progress** — horizontal bar, `value` 0–100, animated fill.
- [x] **Alert** — bordered callout (icon + title + description),
      default / destructive variants.
- [x] **Skeleton** — muted pulsing placeholder (Timer + opacity).
- [x] **Toggle** — two-state pressable button (default / outline).
- [x] **ToggleGroup** — single-select row of toggles.
- [x] Showcase: new **Feedback** (Alert/Progress/Skeleton) and **Display**
      (Avatar/Accordion/Toggle/ToggleGroup) sections; Textarea added to Form.

## v0.9 — shadcn fidelity pass

First real visual/UX feedback on the live demo drove a measured-from-shadcn
recalibration (tokens were previously inspired by, not measured from, shadcn).

- [x] **Token recalibration**: button h-9 (36px), px-4 padding, Input h-9,
      radius scale to shadcn's `--radius:10px` (sm6/md8/lg10/xl16), new
      `spacing-xl(24)` / `spacing-2xl(32)`, heading typography tokens
      (text-lg/xl/h1), smoother `cubic-bezier(0.4,0,0.2,1)` motion, named
      `color-accent` + translucent `color-ring-muted` (ring/50 at 3px).
- [x] **Tabs** rebuilt as the shadcn-default **segmented control** —
      muted pill container, active trigger lifts onto bg-background + shadow.
- [x] **Dialog/AlertDialog/Sheet** to shadcn chrome — p-6 padding, rounded-lg,
      Dialog X-close button top-right, opacity-fade entrance. Panel TouchArea
      absorbs inside-clicks so they don't fall through to the Scrim
      (fixes "clicking inside the dialog closes it").
- [x] **Card** anatomy — p-6 padding, CardHeader/CardTitle/CardDescription/
      CardContent/CardFooter composition helpers.
- [x] **Button/Input/Checkbox/Switch/RadioGroup/Select/Tooltip/Badge/Label**
      each retuned to measured specs (Select trigger h-9, Tooltip inverted
      bg-primary, Badge rounded-md, Label text-sm, checkbox rounded-[4px]).
- [x] **Showcase float fixes** — token-driven spacing (no hardcoded 24/32),
      segmented Tabs wrapped to content width, SectionHeading breathing room,
      v0.9 badges.

## v0.1 — prove "not ugly"

- [x] `Tokens` dark glass theme
- [x] Button (8 variants, 8 sizes)
- [x] Card, Input, Badge
- [x] Showcase app
- [x] CLI `init` + `add`

## v0.1.1 — foundation hardening

Pays down the v0.1 debt that would compound across every overlay
added in v0.2. No new components — every existing surface upgraded
to be Slint-idiomatic, accessible, and dogfood-verified.

- [x] Token system split: `Palette` (raw) + `Tokens` (semantic) for
      cheap future light-theme swap
- [x] Typed enums for variant / size — `variant: "outlin"` typos
      become compile errors instead of silent fallthroughs
- [x] Button refactor: per-variant resolution into rest/hover pairs;
      adding a 9th variant is one row, not six ternary edits
- [x] Keyboard activation (Enter / Space) + visible 2px focus ring
      on Button and Input, driven by `Tokens.color-ring`
- [x] Card hover is self-tracked via internal `TouchArea`
- [x] CLI `rewriteImports` actually rewrites + honors
      `themeDir` / `componentsDir` config (covered by `node:test`)
- [x] Showcase regenerates itself through `slintcn add` on every
      `cargo build` — no more bypass of the user code path
- [x] `make verify` (npm test + cargo build + clippy -D warnings)

## v0.2 — shadcn shell

App-chrome overlays. Slint has no portals, so modals mount as the last
Window child sized to fill via `width: parent.width; height: parent.height`
(documented in popup-helpers.slint).

- [x] **Label** + **Separator** primitives (form scaffolding for the rest)
- [x] **popup-helpers.slint** shared module — `Scrim` (full-coverage
      dimmed backdrop, opacity-animated, click-to-dismiss callback)
- [x] **Dialog** — title + description + `@children` body + default
      Close-button footer; Escape closes; backdrop click closes
      (configurable). Slide-up + fade entrance.
- [x] **AlertDialog** — destructive-confirm variant; Cancel + Action
      footer; no backdrop dismissal; Escape fires `cancelled()`
- [x] **Sheet** — side-anchored drawer (top/right/bottom/left); slide
      animation matches anchor edge; configurable `panel-extent`
- [x] **Tooltip** — hover-triggered floating bubble; wraps trigger as
      `@children`; `side: TooltipSide`
- [x] **Toast** + **Toaster** — Sonner-shaped imperative API
      (`ToastQueue.show(text, variant)`); single-active for v0.2;
      auto-dismiss after 3 s; variants default / success / error
- [x] CLI: transitive component dependencies — `dialog` resolves
      `popup-helpers + button + separator + theme` automatically

### v0.2 limitations (tracked for v0.3)

- **Focus trap** inside Dialog/Sheet is not airtight; Tab can escape
  to the underlying UI. (Slint's FocusScope grabs focus but doesn't
  cycle-bound it.)
- **Tooltip clipping** at window edges — the bubble is in-tree, so
  near-edge triggers can crop. PopupWindow-based positioning would
  fix this but introduces its own constraints.
- **Toast queue** is single-active. Stacked toasts + per-toast
  dismissal timing need richer Slint array mutation than 1.16 ships.

## v0.3 — selection primitives + showcase

Form-selection trio and a docs-style showcase. The showcase becomes
the kind of multi-section surface developers expect when they land
on a component library — sidebar nav, gallery sections, three
realistic composed examples.

- [x] **Tabs** primitive — horizontal nav strip; consumer renders
      content with `if current == N`. Tab + Enter / Space.
- [x] **Checkbox** primitive — Path-drawn check, optional label,
      Space toggles, 2 px focus ring.
- [x] **Switch** primitive — 36 × 20 track + 16 × 16 sliding knob,
      Space toggles, 2 px focus ring.
- [x] **Showcase reorganization** — sidebar nav (Components +
      Examples) + section pages.
- [x] **Composed examples** — Sign-in (Card + Inputs + Checkbox +
      CTA), Settings (Tabs + Switches + Inputs), Dashboard (metric
      Cards + activity feed).
- [x] **Button regression fix** — drop root-level `y` so Button
      works inside layouts that own placement; press feedback moves
      to the label.

## v0.4 — Select, RadioGroup, Icon, runtime theme

- [x] **Select** primitive — trigger + in-tree dropdown card; chevron
      from `Icon` + `LucidePaths.chevron-down`; Enter / Space toggles,
      Escape closes
- [x] **RadioGroup** primitive — vertical list, Path-drawn inner dot,
      Space activates, 2 px focus ring
- [x] **Icon** + **LucidePaths** — 24-unit viewBox Path-stroke icon
      with `tint` (renamed from `color` to dodge Slint's reserved
      Rectangle alias) and an 11-icon Lucide starter set (check,
      x-mark, chevron-{up,down,left,right}, plus, minus,
      arrow-{left,right}, dot)
- [x] **Stacked Toast** — 3-slot ring buffer (Slint 1.16 lacks
      `.filter()` and array spread, so we declare fixed slot
      properties and rotate writes through them). Drop-oldest at
      4-toast saturation; per-slot Timer auto-dismiss
- [x] **Runtime `Theme.mode` swap** — single `Theme.mode:
      ThemeMode { dark, light }` global drives every semantic
      Tokens binding; mutate anywhere and the whole app reflows
      reactively. Light palette adds `alpha-b-*-on-light`
      counterparts to the existing dark alphas

## v0.5 — keyboard polish + modal focus trap

This wave closes the keyboard-accessibility gaps that v0.2–v0.4 left
visible, and adds the small DX hint that makes `slintcn init` useful
in real Rust crates.

- [x] **Arrow-key navigation** wired into Tabs (← / →),
      RadioGroup (↑ / ↓ vertical, ← / → horizontal), and Select
      (↑ / ↓ highlight inside an open dropdown, Enter commits,
      ↓ also opens a closed dropdown). Each component restructured
      around a single root-level FocusScope so the focus ring follows
      the active item and key events have one handler instead of one
      per for-loop iteration.
- [x] **Horizontal RadioGroup orientation** — adds
      `RadioOrientation { vertical, horizontal }` enum and conditional
      layout dispatch.
- [x] **Modal focus trap** — Dialog and AlertDialog intercept Tab in
      their root FocusScope; Dialog traps to its single Close button
      (effectively a no-op Tab), AlertDialog cycles Cancel ↔ Action
      via an internal `trap-index`. `changed open` callback moves
      focus into the dialog on open. Slint 1.16's lack of
      cycle-bound FocusScope is worked around with explicit
      `.focus()` calls on the named buttons.
- [x] **`slintcn init` build.rs hint** — when init detects a
      Cargo.toml in the working directory it prints a copy-pasteable
      build.rs snippet showing the CLI invocation pattern. The CLI
      never writes to the host Rust crate, just educates.

### Sheet focus trap (limitation, intentional)

Sheet has a `@children` body slot so its focusables are arbitrary.
Trapping Tab there would require the consumer to declare its
focusable children to the Sheet — pushed to v0.6 with the larger
PopupWindow rework.

## v0.6 — PopupWindow Tooltip + font guide

- [x] **PopupWindow-based Tooltip** — Tooltip migrated from in-tree
      bubble to Slint's `PopupWindow`. The bubble now renders on a
      layer above the parent window so deeply nested triggers
      don't get the popup clipped by surrounding components.
      Reactive show/close on hover via a `trigger-hovered` property
      + `changed` callback; size pre-computed from a hidden
      measurement Text.
- [x] **Font embedding guide** — `docs/FONTS.md` covers system-font
      defaults, `slint::register_font_from_path` /
      `register_font_from_memory`, Slint-side `font-family` usage,
      Inter / Geist specifics, and OFL redistribution notes.

### slint-viewer snapshot CI — investigated, not feasible in 1.16

`slint-viewer 1.16.1` ships only the interactive viewer (`--auto-reload`,
`--load-data`, `--on callback`). No `--screenshot` / `--headless` /
`--render` flag exists in the CLI. A snapshot pipeline would need a
custom Rust harness using `slint::SoftwareRenderer` to rasterize the
showcase to PNG without a display — pushed to v0.7.

## v0.7 — Rust-backed Toast + headless snapshot CI

- [x] **Growable Rust Toast queue** — `toast.slint` replaces the v0.4
      3-slot ring buffer with a `slint::VecModel<ToastItem>` owned by
      Rust. The showcase main.rs ships the reference glue: per-toast
      `Timer` for auto-dismiss after 3 s, `on_show` pushes,
      `on_dismiss` filter-removes. README documents the required
      wiring. `ToastItem` and `ToastVariant` are re-exported from
      app_window.slint so `include_modules!()` exposes them.
- [x] **Headless snapshot CI** — `examples/showcase/src/bin/snapshot.rs`
      implements `slint::platform::Platform` with a
      `MinimalSoftwareWindow` and a `SoftwareRenderer`, then
      rasterizes the showcase to PNG at 1100 × 760 (Rgb565 →
      RGBA8). No display server needed. Baseline lives at
      `docs/img/snapshots/showcase-buttons.png`. Build/run via
      `make snapshot` (feature-gated on `snapshot` so the default
      build stays lean). The required Slint feature is
      `renderer-software`.

## v0.8 — PopupWindow Select + Toast fade-out + per-section CI (current)

The Slint 1.16 PopupWindow limitation that blocked Select in v0.7
turned out to be sidesteppable: by treating PopupWindow's own
visibility as the source of truth for "open" and routing keyboard
handlers through Slint's focus chain, we don't need to observe
close at all.

- [x] **PopupWindow Select** — dropdown migrated from in-tree to
      PopupWindow. The trigger's FocusScope handles Enter / Space / ↓
      to open; the popup's own inner FocusScope (reached via
      `forward-focus`) handles ↑ / ↓ / Enter / Esc. Outside-click
      auto-closes via `close-policy: close-on-click-outside` — Slint
      manages return-focus to the trigger. No external `open: bool`,
      so the missing `closed` callback is irrelevant.
- [x] **Toast fade-out animation** — `ToastItem` gains a `dismissed:
      bool` field. The Rust on_dismiss closure runs in two phases:
      (1) set `dismissed: true` so the Slint ToastView's opacity and
      y animate out over motion-base (200 ms), then (2) a 220 ms
      removal Timer drops the row from the VecModel after the
      animation lands. Auto-dismiss timers are cancelled when manual
      dismissal beats them.
- [x] **Per-section snapshots** — `snapshot.rs` iterates 0..8 via
      `ui.set_active_section()`, rendering each section to
      `docs/img/snapshots/section-<n>-<name>.png`. Optional CLI arg
      filters to a specific section. The v0.7 single-frame baseline
      is replaced with 8 per-section baselines.
- [x] **GitHub Actions CI** — `.github/workflows/ci.yml` runs `make
      verify` on every push/PR (with Slint system deps + Node 20 +
      Rust caching). A `snapshot` job then runs `make snapshot` and
      fails the build if any PNG drifts from the committed baseline
      — regenerated PNGs are uploaded as an artifact for human
      review until perceptual-diff lands in v0.9.
- [x] **Sheet focus-trap policy documented** — the file header now
      spells out the v0.8 contract: Sheet doesn't trap Tab because
      its @children body is arbitrary; consumers needing a true trap
      should wrap their content in a FocusScope and intercept Tab
      themselves. Slint 1.16 lacks the introspection to do this
      generically inside Sheet.

## v0.9 — pending

- [ ] **`npx slintcn@latest` published package** — package.json
      and registry/ are publish-ready; needs `npm login` from the
      operator (the Claude harness can't authenticate to npm).
- [ ] **Registry raw-URL remote install** — once npm publish lands,
      enable `slintcn add --registry https://raw.github…` for users
      who'd rather pull straight from GitHub.
- [ ] **Perceptual-diff CI step** — replace the byte-level
      `git diff` snapshot guard with `image-compare` (Rust crate)
      so a 1-pixel anti-aliasing wobble doesn't fail the build.
- [ ] **Generalized modal focus-trap API** — `focus-at(int)`
      callback contract on Dialog/Sheet/AlertDialog so consumers
      can register their N focusables.
- [ ] **Fade-out queue smoothing** — when a stack of toasts dismisses
      mid-animation, the trailing toasts currently snap upward. A
      "settle" pass after the removal Timer would slide them in
      place.

## v1.0 — expand beyond SaaS

- [ ] `registry/game/` — HudPill, SlotTile, KeycapHint
- [ ] `registry/embedded/` — compact density preset
- [ ] Optional codegen from `components.toml` (spine-rs integration)

## Design principles (non-negotiable)

1. **Copy-paste over crate dependency** for primitives
2. **Hover / press / focus** must match web shadcn semantics (pointer cursor, 1px press, no fake 4px bounce)
3. **No runtime backdrop-blur** on Slint until platform supports it — fake glass with scrim + hairline (documented)
4. **Tokens are the only source of color** in components
