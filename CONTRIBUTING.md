# Contributing to slintcn

Thanks for helping improve Slint's copy-paste UI ecosystem.

## Good First Contributions

- Fix docs or usage snippets that do not match the generated component files.
- Add focused examples for existing primitives.
- Improve CLI errors, install output, or registry metadata.
- Propose missing shadcn-style components with a clear API sketch.

## Local Checks

```bash
npm test
npm run build
cd examples/showcase && cargo build
```

For visual work, also run the showcase:

```bash
cd examples/showcase
cargo run
```

## Pull Request Guidelines

- Keep changes narrow and explain the user-facing behavior.
- Add or update tests for CLI, registry, or docs-generation changes.
- Avoid introducing runtime package dependencies unless they are clearly needed.
- Do not include credentials, private registry URLs, or unreleased Zero material.

## Release Notes

User-facing changes should be described in the PR body so they can be folded into the next GitHub Release.
