---
name: lildocs
description: Use when authoring, reviewing, or restructuring Markdown documentation in projects that use lildocs, including docs architecture, page purpose, examples, technical-writing quality, and docs-change review.
---

# Lildocs-Powered Documentation

> Shape project docs around reader decisions: start from the current project's facts, keep page purpose explicit, and make each non-obvious concept concrete with a nearby example.

## Operating Assumptions

The current project already uses lildocs. Do not spend prose validating or
pitching that choice, and do not write as if the audience maintains lildocs
itself.

Write for the project's readers and contributors:

- users trying to complete tasks with the project
- contributors editing or publishing the project's docs
- operators building or deploying the project's static docs site

Mention lildocs only when it changes what those readers do, such as a local
build command, docs folder structure, supported Markdown behavior, or
generated-site constraint.

## Project Context First

Use the current project's sources as truth:

- existing docs and README
- docs root and file layout
- package scripts and CI workflows
- lildocs config, theme, and font files
- examples and fixtures used by the project

For exact lildocs behavior, verify from the installed package docs or source
before writing:

```text
node_modules/lildocs/docs/
node_modules/lildocs/
```

Use the published docs only when local package docs are unavailable:

```text
https://aleclarson.github.io/lildocs/
```

Do not copy broad product reference into project docs. Link to reference
material or keep the explanation scoped to the project task.

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
> CLI flags for the current build or preview command.
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
This makes publishing easier.

Strong:
`lildocs build ./docs --out ./site` writes the static site to `./site` for CI to upload.
```

Keep terminology stable across pages. Change terminology only when the
distinction helps readers make a different decision.

```md
Use `docs root` consistently.
Avoid switching between `source folder`, `content folder`, and `docs directory`
unless each term has a distinct meaning.
```

## Navigation and Structure

Respect lildocs' folder-based navigation. Put pages and folders where readers
expect to find them, and show structure with a small tree before explaining
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
| `--out <dir>` | build, dev | Output directory for generated files. |
```

## Review Checks

Before finishing docs changes, verify that:

- the content serves the current project's readers, not lildocs maintainers
- exact lildocs facts came from local project files, installed package docs, or source
- each H1 has a useful purpose blockquote
- every non-trivial concept has a nearby example
- broad lildocs reference material was linked or omitted instead of copied

Run the project's available checks, such as formatting, linting, typechecking,
tests, or a local lildocs build. Do not invent missing scripts.
