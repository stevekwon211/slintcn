# slintcn

Copy-paste [Slint](https://slint.dev) UI components — the **cargo-native**
installer for the [slintcn](https://zero-sq.github.io/slintcn/) registry.
No Node, no npm: if you build Slint apps you already have `cargo`.

```sh
cargo install slintcn

slintcn init --base-color zinc
slintcn add button card input dialog
# or, as a cargo subcommand:
cargo slintcn add data-table calendar
```

This installs the same `.slint` files, from the same hosted registry, as the
npm CLI (`npx slintcn`) — the two are interchangeable transports over one
source of truth. Components land in `ui/slintcn/` (configurable via
`slintcn.json`) and are yours to edit; there's no runtime dependency on this
tool.

## Commands

| Command | What it does |
|---|---|
| `slintcn init [--base-color <c>]` | Write `slintcn.json` + install the theme |
| `slintcn add <name…>` | Install components/blocks + their dependencies |
| `slintcn list` | List the registry by category |
| `slintcn view <name>` | Show an item's metadata + install order |

`--base-color` accepts `neutral` (default), `zinc`, `slate`, `stone`.
`--registry <url>` points at a self-hosted registry.

## Docs

Full component catalog, live previews, and the adoption guide:
<https://zero-sq.github.io/slintcn/>

MIT licensed.
