---
name: lildocs
description: Trigger for authoring, reviewing, or restructuring lildocs-powered Markdown documentation, including docs architecture, page purpose, examples, technical-writing quality, and agent steering for docs changes.
---

# Lildocs Documentation Steering

> Keep lildocs docs focused on reader decisions: verify product facts from canonical docs, shape pages around clear tasks, and make each non-obvious concept concrete with an example.

## Source Boundary

This skill is agent steering, not product reference. Do not use it as a
replacement for lildocs docs. For exact commands, config fields, generated-site
behavior, and current examples, consult canonical lildocs documentation first.

```text
Prefer local installed docs:
node_modules/lildocs/docs/

Fallback:
https://aleclarson.github.io/lildocs/
```

When editing this repository, the project `docs/` directory is the source
artifact to update. When using lildocs from another project, prefer installed
package docs when present, then the published site.

```text
Repository docs source:
docs/

Installed package docs:
node_modules/lildocs/docs/
```

## Agent Role

Steer documentation quality and reader flow. Do not duplicate exhaustive
reference material in the skill or in prose where a link to canonical docs is
clearer.

```text
Good skill use:
Improve a CLI page so command choices are easier to compare.

Bad skill use:
Recreate every lildocs config field from memory.
```

When a product fact affects correctness, check the real docs or source before
writing. Treat remembered behavior as provisional.

```text
Check before documenting:
- command names and flags
- config field names and value sets
- generated output filenames
- deployment workflow details
```

## Page Contract

Every page H1 must be followed immediately by a purpose blockquote. The
blockquote must explain the page's real job: the decision it supports, the task
it helps complete, or the boundary it clarifies.

```md
 # Command Line

> Build, preview, and publish flows start from different commands; this page
> keeps their flags and defaults separate so scripts stay small.
```

Avoid boilerplate such as `Use this page to...`, and avoid restating the title.

```md
 # Configuration

> Learn about configuration.
```

Prefer direct clarity over page-navigation language.

```md
 # Configuration

> Persistent site defaults belong in `config.json`; one-off choices belong in
> CLI flags for the current build, preview, or deployment command.
```

## Example Discipline

Every new, non-trivial concept needs a minimal code block example close to its
first explanation. Non-trivial concepts include commands, config, file layout,
Markdown syntax, workflow steps, API shapes, generated output, and errors.

````md
Set the output directory when generated files should not go to `dist`:

```bash
lildocs build ./docs --out ./site
```
````

For prose concepts, use before/after snippets rather than abstract advice.

```md
Weak:
The build failed.

Strong:
The build failed because `docs/config.json` contains invalid JSON.
```

Comments inside examples may explain intent, but they cannot replace the
surrounding Markdown explanation.

```json
{
  "navigation": {
    "order": ["getting-started.md", "guides/"]
  }
}
```

## Technical Writing Standards

Lead with the reader's next decision or action, then give the smallest command,
config, file tree, or Markdown pattern that completes it.

````md
Build a static site for CI:

```bash
lildocs build ./docs
```
````

Prefer observable outcomes over vague benefits.

```md
Weak:
This makes deployment easier.

Strong:
`lildocs deploy` adds GitHub Pages metadata to the generated output directory.
```

Keep terminology stable across pages. Change terminology only when the
distinction helps readers make a different decision.

```md
Use `docs root` consistently.
Avoid switching between `source folder`, `content folder`, and `docs directory`
unless each term has a distinct meaning.
```

## Lildocs Fit Checks

Let lildocs generate navigation from the folder structure unless the docs need a
deliberate reading order. Show structure with a small tree before explaining
navigation implications.

```text
docs/
  index.md
  getting-started.md
  guides/
    authoring.md
  reference/
    cli.md
```

Keep reference pages optimized for lookup speed: a tight purpose blockquote,
tables for option or field scans, and examples only where a reader might choose
incorrectly.

```md
| Option | Applies to | Description |
| --- | --- | --- |
| `--out <dir>` | build, dev, deploy | Output directory for generated files. |
```

## Review Checks

Before finishing docs changes, verify the skill did not become a product
reference, exact lildocs facts came from canonical docs or source, each H1 has a
useful purpose blockquote, and every non-trivial concept has a nearby example.

```bash
pnpm run format
pnpm run lint
pnpm run typecheck
pnpm test
```
