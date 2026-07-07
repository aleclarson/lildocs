---
title: GitHub Pages
---

# GitHub Pages

> Generate GitHub Pages-ready output and wire it into an Actions workflow without
> changing how the static site is built.

Use `deploy` to build GitHub Pages-ready output:

```bash
lildocs deploy ./docs
```

`deploy` builds the same static site as `build`, then adds Pages deployment
metadata:

- `.nojekyll`
- `lildocs-deploy.json`

The command prepares files only. It does not commit, push, or publish your site.

## Project Pages

Use `--base` for GitHub project pages metadata:

```bash
lildocs deploy ./docs --out ./site --base /repo-name/
```

Generated page links remain relative so the site can still be opened directly
from disk.

## GitHub Actions Workflow

Use `init github-pages` to create a Pages workflow:

```bash
lildocs init github-pages ./docs --out ./site
```

This writes `.github/workflows/lildocs-pages.yml` if it does not already exist.
The workflow installs dependencies with pnpm, builds the project, runs
`lildocs deploy`, uploads the output with `actions/upload-pages-artifact`, and
deploys with `actions/deploy-pages`.

Pass the same output and base path that the workflow should use:

```bash
lildocs init github-pages ./docs --out ./site --base /repo-name/
```

In the repository settings, set Pages source to **GitHub Actions** before relying
on the workflow.

## Repository Link

Generated sites include a GitHub icon button before search when lildocs can
detect a GitHub repository.

During GitHub Actions builds, lildocs reads `GITHUB_REPOSITORY` as
`<owner>/<repo>`. For local builds, it walks up from the docs root to the nearest
`package.json` and uses the `repository` field when it points to GitHub.
