# AGENTS.md

## Project

`lildocs` is a Node/TypeScript CLI that turns Markdown docs into a static searchable documentation site.

Keep product behavior aligned with the README, generated documentation, and existing tests.

## Workflow

- Keep changes narrowly scoped.
- Follow existing code style and architecture.
- Use Conventional Commits.
- Keep commits atomic and single-purpose.
- Always commit your work when a task implies a checkpoint or durable handoff.
- Delete plan files once the plan is completed and approved by a human.
- Avoid new dependencies unless they are clearly justified.
- Update tests with behavior changes.

## Tooling

- CLI parsing: `cmd-ts`
- Rendering: Preact SSR
- Markdown/frontmatter: `marked` and `gray-matter`
- Theme loading: `jiti`
- Bundling: `tsdown`
- Linting: `oxlint`
- Formatting: `oxfmt`
- Tests: Node's built-in `node:test`

Useful commands:

```bash
pnpm run format
pnpm run lint
pnpm run typecheck
pnpm test
```

## Product Constraints

- Support `lildocs <path>`, `lildocs build <path>`, and `lildocs dev <path>`.
- Treat bare `lildocs <path>` as a build command.
- Support `--out <dir>` and `--theme <name>`.
- Support `--font.heading`, `--font.body`, and `--font.code` with Google Fonts names or local font files.
- Default output directory is `dist`.
- Generated HTML must work without a server.
- Keep client-side JavaScript limited to search, Mermaid, or progressive enhancement.
- Generate navigation from the folder structure.
- Infer page titles from frontmatter, first `h1`, then filename.
- Support nested folders and ignore hidden/system files.
- Search must be local/static with no external service.
- Mermaid diagrams should work out of the box.

## Out of Scope

- Manual nav config
- Versioned docs
- MDX
- Plugin system
- API reference generators
- Hosted search integrations
- Auth or CMS features
- Complex theme APIs or component overrides
- Multi-language/i18n
- Redirects, analytics, or deploy integrations
