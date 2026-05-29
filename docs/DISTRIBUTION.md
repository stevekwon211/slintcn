# slintcn Distribution Plan

## Positioning

slintcn is shadcn/ui-style copy-paste UI for Slint native apps: primitives, blocks, theming, CLI install, and a hostable registry.

## Primary Launch Channels

- Slint GitHub Discussions: ask for Slint-specific feedback first.
- This Week in Rust: submit as a tooling update after npm and GitHub Releases are aligned.
- Hacker News Show HN: link to the live docs, with GitHub and npm in the first comment.
- X thread: lead with screenshots, install command, and the shadcn-for-Slint hook.

## Launch Notes

### Hacker News

Do not paste generated copy into HN. HN explicitly asks submitters not to use
LLM-generated or LLM-edited text for submissions or comments. Use these as
notes, then write the title and first comment by hand in your own voice.

Recommended link target:

```text
https://zero-sq.github.io/slintcn/docs/
```

Title shape to write by hand:

```text
Show HN: slintcn, shadcn-style components for Slint apps
```

Facts worth mentioning in a first comment:

- You built this because Slint has a good typed UI language, but app teams still
  need editable components rather than a fixed theme API.
- It copies `.slint` source into the user's repo, so teams can inspect, change,
  and version the UI code.
- Current release: `0.22.0`.
- Includes 36 primitives, 5 blocks, theme tokens, generated docs, live WASM
  previews, and an npm CLI.
- Useful commands:

```text
npx slintcn@latest init
npx slintcn@latest add button card input dialog
```

Keep the comment short. Avoid "value prop", "powerful", "seamless",
"developer experience", "reimagined", and any request for stars/upvotes.

### Slint Discussions

Title: `I built a shadcn-style component registry for Slint`

Body:

```text
I have been building slintcn: copy-paste Slint components inspired by shadcn/ui.

The goal is to make Slint apps feel easier to style without depending on a theme API: install components into your repo, edit the .slint files, and optionally host your own registry.

Feedback wanted on component APIs, docs clarity, and which primitives should come next.
```

### This Week in Rust

```markdown
[slintcn 0.22](https://github.com/zero-sq/slintcn/blob/main/docs/INTRODUCING_SLINTCN.md) is a shadcn/ui-style copy-paste component registry for Slint native apps.
```

### X Thread

Write this by hand too. The useful shape is:

- one sentence on why you built it.
- short demo clip or screenshot.
- install command.
- GitHub/docs link.
- no "please star" CTA.

## Metrics to Track

- GitHub stars, views, clones, and referrers.
- npm downloads and latest version.
- Issues opened from launch feedback.
- Docs page availability and Pages workflow status.
