# Introducing slintcn

`slintcn` is a shadcn/ui-style component registry for Slint native apps.

The goal is simple: copy UI source into your app, keep ownership of the `.slint`
files, and avoid fighting a theme API when your product needs its own visual
language.

## Why Slint

Slint is a strong fit for Rust desktop and embedded UI work: the UI language is
typed, bindings are explicit, and a bad property name fails at compile time
instead of becoming a runtime styling bug.

That is also why a shadcn-style workflow maps well to Slint. A component is just
source code. If it lands in your repo, your team can inspect, edit, and version
it like the rest of the app.

## Install

```bash
cd your-slint-app
npx slintcn@latest init
npx slintcn@latest add button card input dialog
```

This creates a local `slintcn.json`, installs theme files into
`ui/slintcn/theme/`, and copies selected components into
`ui/slintcn/components/`.

## Example

```slint
import { Button, ButtonVariant, ButtonSize } from "ui/slintcn/components/button.slint";
import { Dialog } from "ui/slintcn/components/dialog.slint";

export component App inherits Window {
    preferred-width: 420px;
    preferred-height: 260px;

    in-out property <bool> confirm-open;

    Button {
        variant: ButtonVariant.glow;
        size: ButtonSize.lg;
        text: "Ship it";
        clicked => {
            confirm-open = true;
        }
    }

    Dialog {
        width: parent.width;
        height: parent.height;
        open <=> confirm-open;
        title: "Confirm";
        description: "Ship this build?";
    }
}
```

Variants are typed enums, so `ButtonVariant.outlin` is a compile error. That is
the main Rust/Slint advantage I wanted to preserve: customization without losing
static feedback.

## What v0.22 includes

- 36 UI primitives.
- 5 installable blocks.
- dark/light theme tokens.
- base color variants inspired by shadcn/ui.
- generated docs with live WASM previews.
- a CLI for local installs and static registry builds.

The registry can also be hosted as static JSON:

```bash
slintcn build -o dist/registry
slintcn add https://example.com/r/button.json
```

That makes it possible for a team to publish its own Slint component registry
without turning the components into a runtime dependency.

## Links

- Docs: https://stevekwon211.github.io/slintcn/docs/
- GitHub: https://github.com/stevekwon211/slintcn
- npm: https://www.npmjs.com/package/slintcn
