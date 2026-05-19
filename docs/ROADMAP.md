# slintcn roadmap

## v0.1 — prove "not ugly" (current)

- [x] `Tokens` dark glass theme
- [x] Button (8 variants, 8 sizes)
- [x] Card, Input, Badge
- [x] Showcase app
- [x] CLI `init` + `add`

## v0.2 — shadcn parity (SaaS shell)

- [ ] Dialog / Sheet (modal scrim + glass panel)
- [ ] Tabs
- [ ] Label + Separator
- [ ] `slintcn init` scaffolds Rust `build.rs` import paths
- [ ] Font guide (Inter / Geist embedding in Slint)
- [ ] Icon slot pattern (optional `image` prop + lucide PNG pipeline doc)

## v0.3 — developer experience

- [ ] `npx slintcn@latest` published package
- [ ] Registry index on GitHub (raw URL like shadcn)
- [ ] Visual regression: render showcase frames in CI
- [ ] Second theme: `light` (same components, swapped tokens)

## v1.0 — expand beyond SaaS

- [ ] `registry/game/` — HudPill, SlotTile, KeycapHint
- [ ] `registry/embedded/` — compact density preset
- [ ] Optional codegen from `components.toml` (spine-rs integration)

## Design principles (non-negotiable)

1. **Copy-paste over crate dependency** for primitives
2. **Hover / press / focus** must match web shadcn semantics (pointer cursor, 1px press, no fake 4px bounce)
3. **No runtime backdrop-blur** on Slint until platform supports it — fake glass with scrim + hairline (documented)
4. **Tokens are the only source of color** in components
