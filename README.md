# slintcn

**Copy-paste Slint components that don't look like 2009 desktop widgets.**

shadcn proved that developers want to *own* UI code, not fight a theme API.
Slint 1.16 is moving to Fluent as the default — fine for consistency, weak for
modern dark/glass product UI. **slintcn** is the missing layer: tokens + primitives
you copy into your repo and customize.

## Philosophy

| Phase | Focus | Status |
|-------|--------|--------|
| **v0.1** | SaaS-adjacent dark glass — Button, Card, Input, Badge | ✅ |
| **v0.1.1** | Foundation hardening — enum variants, focus ring, dogfooded showcase | ✅ |
| **v0.2** | Shell + overlays — Label, Separator, Dialog, AlertDialog, Sheet, Tooltip, Toast | ✅ |
| **v0.3** | DX & theming — light palette, `npx slintcn` publish, visual-regression CI | upcoming |
| **v1.0** | Game HUD registry — hotbar, reticle, keycap hints | later |

SaaS-first is a **wedge**, not a ceiling. Once tokens + motion + hover semantics
exist, a second registry (`registry/game/`) is just more `.slint` files.

## Prerequisites

- **Rust** with Slint 1.16 (for the showcase or your Slint app)
- **Node 20+** (the CLI runtime)

## Quick start

```bash
# Run the visual showcase
cd examples/showcase && cargo run

# Install components into your Slint project
cd your-app
node /path/to/slintcn/bin/slintcn.mjs init
node /path/to/slintcn/bin/slintcn.mjs add button card input dialog
```

Files land in `ui/slintcn/` — **you own them**. Change colors in
`ui/slintcn/theme/tokens.slint`, tweak `button.slint` for your product.

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

## Components (default registry)

### Form primitives
| Component | Variants | Sizes |
|-----------|----------|-------|
| **Button** | default · outline · secondary · ghost · link · destructive · glow · glass | xs · sm · default · lg · icon (× 4 sizes) |
| **Card** | solid · glass · glass-interactive · raised | sm · default |
| **Input** | (focus ring · placeholder · password · auto-focus) | — |
| **Badge** | default · secondary · outline · destructive | sm · default |
| **Label** | default · muted · required | — |
| **Separator** | horizontal · vertical | — |

### Overlays
| Component | Purpose | Notable props |
|-----------|---------|---------------|
| **Dialog** | General-purpose modal | `open`, `title`, `description`, `dismiss-on-backdrop`, `close-label`, `@children` body |
| **AlertDialog** | Destructive confirm | `open`, `action-label`, `cancel-label`, `action-variant`, `confirmed()`, `cancelled()` |
| **Sheet** | Side drawer | `open`, `side` (top/right/bottom/left), `panel-extent`, `@children` body |
| **Tooltip** | Hover-revealed bubble | `text`, `side`; wraps a trigger as `@children` |
| **Toast** | Imperative notifications | `ToastQueue.show(text, variant)` — variants: default · success · error |

Keyboard activation (Enter / Space) and a visible 2 px focus ring are wired into
every interactive primitive. Modals close on Escape; Dialog and Sheet close on
backdrop click (configurable).

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
  components/*.slint      #   12 primitives + popup-helpers
examples/showcase/        # Runnable gallery (regenerated via `slintcn add`)
bin/slintcn.mjs           # init + add CLI (transitive deps)
bin/__test__/             # node:test suite — `make test`
```

Run `make verify` before committing — it runs node tests, `cargo build`, and
`cargo clippy -D warnings` end-to-end.

## Roadmap

See [docs/ROADMAP.md](docs/ROADMAP.md).

## License

MIT
