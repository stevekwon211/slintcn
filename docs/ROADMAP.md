# slintcn roadmap

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

## v0.5 — keyboard polish + modal focus trap (current)

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

## v0.6 — pending

- [ ] **PopupWindow-based Tooltip** — edge-aware positioning that
      escapes the parent component's bounds. Needs a probe of Slint
      1.16's PopupWindow API: positioning semantics, parent-window
      clipping behavior, close-policy reliability.
- [ ] **PopupWindow-based Select dropdown** — same investigation,
      plus outside-click-to-close.
- [ ] **Generalized modal focus trap** (Sheet @children + Dialog
      with body inputs) — likely a `focusables: [length]` prop on
      modals so consumers register their controls.
- [ ] **`slint-viewer` headless snapshot CI** — probe whether Slint
      1.16's tooling supports rendering to PNG without a display.
- [ ] **`npx slintcn@latest` published package** + registry raw-URL
      install — one-way door, awaits author approval.
- [ ] **Growable Toast queue** — Rust-side model (the 3-slot ring
      buffer is the ceiling of pure-Slint array mutation in 1.16).
- [ ] **Font embedding guide** — Inter / Geist registration via
      Rust + import in Slint.
- [ ] Tab focusable detection inside Sheet body / Dialog body.

## v1.0 — expand beyond SaaS

- [ ] `registry/game/` — HudPill, SlotTile, KeycapHint
- [ ] `registry/embedded/` — compact density preset
- [ ] Optional codegen from `components.toml` (spine-rs integration)

## Design principles (non-negotiable)

1. **Copy-paste over crate dependency** for primitives
2. **Hover / press / focus** must match web shadcn semantics (pointer cursor, 1px press, no fake 4px bounce)
3. **No runtime backdrop-blur** on Slint until platform supports it — fake glass with scrim + hairline (documented)
4. **Tokens are the only source of color** in components
