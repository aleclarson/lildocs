# AGENTS.md

## Project Instructions

This project is `lildocs`, a lightweight Node/TypeScript CLI that turns Markdown docs into a static searchable documentation site.

Read `spec.md` before making product changes. Use `task-list.md` as the implementation plan unless the user explicitly changes direction.

## Progress Tracking

- Before starting implementation work, read `progress.md` first.
- Use `progress.md` as the short source of truth for the current task, status, last completed commit, next action, blockers, and critical notes.
- After finishing each logical step or commit, update `progress.md`.
- Keep `progress.md` brief. Detailed planning belongs in `task-list.md`; detailed test coverage notes belong in `test-plan.md`.

## Workflow Rules

- Keep changes narrowly scoped to the current task.
- Use Conventional Commits when committing.
- Keep commits atomic and single-purpose.
- Do not write automated tests until the implementation is complete.
- Do not run `tsc` typechecking until the implementation is complete; save it for the cleanup/testing pass.
- During implementation, add test case descriptions and edge cases to `test-plan.md` so the final testing pass has a complete checklist.
- When the implementation is complete, convert `test-plan.md` cases into automated tests and run the cleanup pass.

## Tooling Decisions

- Use `cmd-ts` for CLI parsing.
- Use `oxlint` for linting.
- Use `oxfmt` for formatting.
- Configure VS Code format-on-save and linting code actions on save.
- Use `tsdown` for bundling the CLI.
- Use Node's built-in `node:test` runner for automated tests.

## Product Constraints

- The CLI should be zero-config for v1.
- Support:
  - `lildocs <path>`
  - `lildocs build <path>`
  - `lildocs dev <path>`
- Treat bare `lildocs <path>` as a build command.
- Support `--out dist` and `--theme <name>`.
- Default output directory is `dist`.
- Static HTML must work without a server.
- Prefer zero client-side JavaScript except where needed for search, Mermaid, or progressive enhancement.
- Use Preact SSR for rendering.
- Use CSS Modules for component-scoped styles.
- Use CSS variables for theme values.
- Keep theming minimal and build-time driven.
- Generate navigation from the folder structure.
- Infer page titles from frontmatter, first `h1`, then filename.
- Support nested folders.
- Ignore hidden/system files.
- Search is required and should be local/static with no external service.
- Mermaid diagrams should work out of the box.

## Out of Scope for v1

- Manual nav config.
- Versioned docs.
- MDX.
- Plugin system.
- API reference generators.
- Hosted search integrations.
- Auth.
- CMS features.
- Complex theme APIs.
- Component overrides.
- Multi-language/i18n.
- Redirects.
- Advanced analytics.
- Edit-this-page links.
- Deploy integrations.
