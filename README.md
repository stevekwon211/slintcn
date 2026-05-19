# slintcn

**Copy-paste Slint components that don't look like 2009 desktop widgets.**

shadcn proved that developers want to *own* UI code, not fight a theme API.
Slint 1.16 is moving to Fluent as the default — fine for consistency, weak for
modern dark/glass product UI. **slintcn** is the missing layer: tokens + primitives
you copy into your repo and customize.

## Philosophy

| Phase | Focus | Why |
|-------|--------|-----|
| **Now (v0.1)** | SaaS-adjacent dark glass — button, card, input, badge | Matches shadcn mental model; fastest path to "not ugly" |
| **Next** | Dialog, tabs, select, toast, sidebar shell | Complete app chrome without WebView |
| **Later** | Game HUD — hotbar, reticle, keycap hints | Same copy-paste model, different registry style (`game`) |

SaaS-first is a **wedge**, not a ceiling. Once tokens + motion + hover semantics
exist, a second registry (`registry/game/`) is just more `.slint` files.

## Quick start

```bash
# Run the visual showcase (requires Rust + Slint 1.16)
cd examples/showcase && cargo run

# Install components into your Slint project
cd your-app
node /path/to/slintcn/bin/slintcn.mjs init
node /path/to/slintcn/bin/slintcn.mjs add button card input
```

Files land in `ui/slintcn/` — **you own them**. Change colors in
`ui/slintcn/theme/tokens.slint`, tweak `button.slint` for your product.

## Components (default registry)

| Component | Variants |
|-----------|----------|
| **Button** | default, outline, secondary, ghost, destructive, link, glow, glass |
| **Card** | solid, glass, glassInteractive, raised |
| **Input** | focus ring, placeholder, password |
| **Badge** | default, secondary, outline, destructive |

## vs alternatives

| | std-widgets / Fluent | [slint-ui-system](https://crates.io/crates/slint-ui-system) | **slintcn** |
|--|----------------------|--------------------------------------------------------------|-------------|
| Model | Framework widgets | Crate dependency | **Copy-paste** |
| Aesthetic | Platform / Fluent | Neon dashboard | **Dark glass / shadcn-like** |
| Customize | Theme API | Crate version lock | **Edit the `.slint` file** |

## Project layout

```
registry/default/     # Source of truth (published with npm package)
  theme/tokens.slint
  components/*.slint
examples/showcase/    # Runnable gallery
bin/slintcn.mjs       # init + add CLI
```

## Roadmap

See [docs/ROADMAP.md](docs/ROADMAP.md).

## License

MIT
