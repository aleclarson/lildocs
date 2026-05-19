---
title: Contributing
---

# Contributing

Use these commands when working on lildocs itself:

```bash
pnpm install
pnpm run format
pnpm run lint
pnpm run typecheck
pnpm test
```

Read `spec.md` before product changes and keep behavior aligned with the README,
documentation, and existing tests.

The project uses:

- `cmd-ts` for CLI parsing
- Preact SSR for rendering
- `marked` and `gray-matter` for Markdown and frontmatter
- `jiti` for theme loading
- `tsdown` for bundling
- `oxlint` for linting
- `oxfmt` for formatting
- Node's built-in `node:test` runner
