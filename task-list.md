# lildocs Task List

This plan builds the product in logical implementation steps. Do not write automated tests or run `tsc` typechecking until the implementation is complete. During each implementation step, append test case descriptions and edge cases to `test-plan.md` so the final test pass has a complete checklist.

Each commit should be atomic and use Conventional Commits.

## 1. Bootstrap the Project

- Initialize the repository structure for a Node/TypeScript CLI package.
- Add package metadata, TypeScript config, basic source folders, and executable bin wiring for `lildocs`.
- Add `cmd-ts` for CLI parsing.
- Add `oxlint` and `oxfmt` for linting and formatting.
- Add `tsdown` for bundling the CLI.
- Plan to use `node:test` for automated tests when the deferred testing pass begins.
- Add package scripts for formatting, linting, bundling, and eventual `node:test` execution, but still defer `tsc` typechecking and test writing until the implementation cleanup pass.
- Add VS Code workspace settings for format-on-save and linting code actions on save.
- Add a minimal CLI entrypoint that accepts commands/options but only prints placeholder output.
- Add `test-plan.md` with sections for CLI behavior, input resolution, Markdown rendering, assets, search, theming, and static output.

Suggested commits:

- `chore: initialize package scaffold`
- `chore: configure oxlint oxfmt and vscode save actions`
- `chore: configure tsdown cli bundle`
- `feat: add initial cli entrypoint`
- `docs: add implementation test plan outline`

Update `test-plan.md` with descriptions for:

- Running `lildocs <path>` with a folder path.
- Running `lildocs <path>` with a Markdown file path.
- Running `lildocs build <path>`.
- Handling unknown commands and unsupported options.

## 2. Implement CLI Parsing and Command Routing

- Implement CLI parsing with `cmd-ts`.
- Support the required command shapes:
  - `lildocs <path>`
  - `lildocs build <path>`
  - `lildocs dev <path>`
- Support shared options:
  - `--out dist`
  - `--theme <name>`
- Treat bare `lildocs <path>` as a build command.
- Keep `dev` as a routed command with a placeholder implementation if needed, but do not let it block static build behavior.
- Return clear errors for missing paths, unknown commands, and invalid option usage.

Suggested commits:

- `feat: parse cli commands and options with cmd-ts`
- `feat: route bare path invocation to build`
- `fix: report invalid cli usage clearly`

Update `test-plan.md` with descriptions for:

- Defaulting bare path invocation to build.
- `--out` before and after the path if supported.
- Missing path errors.
- Unknown command errors.
- Unknown option errors.

## 3. Resolve Input Paths and Docs Roots

- Resolve input paths relative to the current working directory.
- If input is a directory, treat it as the docs root.
- If input is a `.md` file, treat its parent as the docs root and the file as the home page.
- For directory input, find the home page using the ordered fallback list:
  - `index.md`
  - `intro.md`
  - `introduction.md`
  - `getting-started.md`
  - `quickstart.md`
  - `readme.md`
  - `README.md`
- Ignore hidden/system files when resolving docs content.
- Emit clear errors for non-existent paths, unsupported file types, and directories with no Markdown files.

Suggested commits:

- `feat: resolve docs input paths`
- `feat: detect home page from common markdown names`
- `fix: reject invalid docs inputs`

Update `test-plan.md` with descriptions for:

- Directory input with `index.md`.
- Directory input falling through to each common home filename.
- File input using the file as home.
- Missing path.
- Non-Markdown file path.
- Empty docs directory.
- Hidden Markdown files being ignored.

## 4. Collect Markdown Files and Build the Content Model

- Recursively collect Markdown files below the docs root.
- Support nested folders.
- Ignore hidden/system files and output directories.
- Parse frontmatter when present.
- Infer page titles in this order:
  - frontmatter title
  - first `h1`
  - formatted filename
- Generate stable slugs and output routes for every page.
- Normalize relative routes so static HTML works without a server.
- Build a typed content model containing source path, route, title, headings, raw Markdown, parsed metadata, and parent/child relationships.

Suggested commits:

- `feat: collect markdown files recursively`
- `feat: infer page metadata`
- `feat: generate static page routes`

Update `test-plan.md` with descriptions for:

- Nested folder collection.
- Frontmatter title precedence.
- First `h1` title precedence.
- Filename title fallback.
- Duplicate filenames in different folders.
- Spaces and punctuation in filenames.
- Output route for the home page.
- Relative route behavior from nested pages.

## 5. Generate Navigation

- Build sidebar navigation from the folder structure.
- Sort navigation predictably, using filesystem order only if it can be made deterministic.
- Use inferred page titles as nav labels.
- Mark the active page in the render model.
- Keep the nav implementation zero-config and avoid manual nav configuration.
- Support nested folders without exposing hidden/system entries.

Suggested commits:

- `feat: build navigation from folder structure`
- `feat: add active page state to navigation`

Update `test-plan.md` with descriptions for:

- Top-level pages in navigation.
- Nested folder pages in navigation.
- Active page state.
- Hidden files and folders excluded from navigation.
- Home page position in navigation.

## 6. Render Markdown to HTML

- Add the Markdown processing pipeline for:
  - standard Markdown
  - GitHub-flavored Markdown
  - frontmatter
  - syntax-highlighted code blocks
  - heading anchors
  - relative Markdown links
  - images/assets
- Convert relative `.md` links to generated static HTML routes.
- Preserve external links.
- Track page headings for table of contents and search indexing.
- Keep the implementation build-time only where possible.

Suggested commits:

- `feat: render markdown content to html`
- `feat: add heading anchors to rendered markdown`
- `feat: rewrite relative markdown links`
- `feat: support markdown images and assets`

Update `test-plan.md` with descriptions for:

- GFM tables, task lists, and strikethrough.
- Code block syntax highlighting.
- Duplicate headings and anchor uniqueness.
- Relative links to sibling pages.
- Relative links to parent/child pages.
- External links staying unchanged.
- Images copied and linked correctly.
- Missing referenced assets.

## 7. Add Mermaid Support

- Detect Mermaid code blocks by language.
- Prefer build-time diagram rendering if practical for the chosen toolchain.
- If build-time rendering is too heavy or unreliable, add the smallest client-side Mermaid enhancement needed.
- Ensure Mermaid works out of the box with no user config.
- Keep non-Mermaid code blocks on the normal syntax highlighting path.

Suggested commits:

- `feat: detect mermaid diagrams in markdown`
- `feat: render mermaid diagrams in generated pages`

Update `test-plan.md` with descriptions for:

- A simple flowchart diagram.
- Multiple Mermaid diagrams on one page.
- Mermaid inside nested docs.
- Invalid Mermaid syntax handling.
- Non-Mermaid code blocks unaffected.
- Static HTML behavior when opened from disk.

## 8. Implement Theme Resolution and CSS Variables

- Add built-in default and `minimal` themes.
- Resolve themes in the required order:
  - `--theme <name>`
  - local `theme.ts`
  - default built-in theme
- Generate CSS variables at build time from limited color and font tokens.
- Keep the theme shape small and avoid broad token systems.
- Return clear errors for unknown built-in themes or invalid local theme exports.

Suggested commits:

- `feat: add built in themes`
- `feat: resolve local theme files`
- `feat: emit theme css variables`
- `fix: validate theme resolution errors`

Update `test-plan.md` with descriptions for:

- Default theme with no config.
- `--theme minimal`.
- Local `theme.ts` discovery.
- CLI theme taking precedence over local theme.
- Unknown theme name.
- Invalid `theme.ts` export.

## 9. Build Preact SSR Page Rendering

- Add Preact SSR rendering for static pages.
- Create the core layout:
  - minimal header
  - left sidebar navigation
  - main content column
  - optional right-side table of contents if straightforward
  - search entry point
- Use CSS Modules for component-scoped styles.
- Use CSS variables for theme values.
- Make the layout responsive with `vw`-based widths and wide-screen max constraints.
- Keep client-side JavaScript out of the layout unless required for search or Mermaid.

Suggested commits:

- `feat: render pages with preact ssr`
- `feat: add documentation layout styles`
- `feat: add responsive navigation layout`
- `feat: render page table of contents`

Update `test-plan.md` with descriptions for:

- Home page rendering.
- Nested page rendering.
- Sidebar layout on desktop.
- Mobile layout behavior.
- Readable code block overflow.
- Table of contents links.
- Static HTML opened directly from disk.

## 10. Emit Static Site Files

- Write generated pages to `dist` by default.
- Respect `--out`.
- Emit static HTML, CSS, copied assets, search index, and any required runtime scripts.
- Ensure links between pages are relative enough to work without a server.
- Clean or overwrite generated files in the output directory in a predictable way.
- Avoid deleting user files outside the configured output directory.

Suggested commits:

- `feat: emit static site output`
- `feat: support custom output directory`
- `fix: generate file relative links`
- `fix: protect paths outside output directory`

Update `test-plan.md` with descriptions for:

- Default `dist` output.
- Custom `--out` output.
- Existing output directory.
- Nested output pages.
- CSS asset links from nested pages.
- Image asset links from nested pages.
- Opening generated HTML without a server.

## 11. Build Static Search

- Generate a search index at build time from page titles, headings, and body text.
- Add a minimal search UI entry point.
- Implement local search with no external service dependency.
- Keep ranking simple and predictable.
- Ensure the search UI works from static files.
- Minimize client-side JavaScript to only what search requires.

Suggested commits:

- `feat: generate static search index`
- `feat: add client side search ui`
- `feat: rank search results simply`

Update `test-plan.md` with descriptions for:

- Searching by page title.
- Searching by heading.
- Searching by body text.
- Multiple result ranking.
- Empty query behavior.
- No results behavior.
- Search from nested generated pages.
- Search when opened from disk.

## 12. Add Developer-Facing Examples and Fixture Docs

- Add small example docs that exercise the main product behavior.
- Include nested pages, images, code blocks, links, frontmatter, and Mermaid.
- Keep examples compact and useful for manual verification.
- Document basic local development commands in the README.

Suggested commits:

- `docs: add example documentation site`
- `docs: document local development workflow`

Update `test-plan.md` with descriptions for:

- Building the example docs.
- Inspecting generated navigation.
- Inspecting generated Mermaid.
- Inspecting generated search.
- Verifying linked assets in the example site.

## 13. Finish Implementation Hardening

- Review error messages across the CLI and build pipeline.
- Ensure all async filesystem operations are handled consistently.
- Check cross-platform path behavior.
- Check that generated output is deterministic.
- Remove placeholders left from earlier steps.
- Make sure `dev` either works minimally or returns a clear "not implemented yet" message that does not affect v1 build success.
- Do a first cleanup pass for obvious TypeScript shape issues, but still defer running `tsc` until the implementation is otherwise complete.

Suggested commits:

- `fix: improve cli error messages`
- `fix: normalize generated paths`
- `chore: remove implementation placeholders`

Update `test-plan.md` with descriptions for:

- Windows-style path assumptions where relevant.
- Deterministic output order.
- Permission errors while reading docs.
- Permission errors while writing output.
- `dev` command behavior.

## 14. Write and Run the Test Suite

- Convert accumulated `test-plan.md` descriptions into automated tests.
- Use Node's built-in `node:test` runner.
- Run `tsc` typechecking as part of this cleanup pass, after the implementation is complete.
- Fix type errors before or alongside the focused automated tests.
- Start with unit tests for path resolution, title inference, route generation, theme resolution, nav generation, and search indexing.
- Add integration tests that build fixture docs and inspect generated output.
- Add static output tests for relative links, copied assets, search index generation, Mermaid handling, and generated HTML.
- Keep tests focused on product behavior rather than implementation details.
- Run the full test suite and fix implementation bugs found by the tests.

Suggested commits:

- `test: cover input resolution`
- `test: cover content model generation`
- `test: cover markdown rendering`
- `test: cover theme resolution`
- `test: cover static site output`
- `test: cover search indexing`
- `fix: resolve typecheck findings`
- `fix: address test suite findings`

Use `test-plan.md` to ensure every deferred case has either an automated test, a documented manual check, or an explicit punt.

## 15. Final v1 Verification

- Build the example docs with:
  - `lildocs ./docs`
  - `lildocs ./docs/index.md`
  - `lildocs build ./docs --out dist`
- Open generated HTML directly from disk and verify navigation, content, assets, Mermaid, and search.
- Run lint, typecheck, build, and test commands.
- Update README usage notes if behavior changed during implementation.
- Confirm the final CLI surface still matches the spec and no punted v1 features slipped into scope.

Suggested commits:

- `docs: update cli usage documentation`
- `chore: verify v1 build readiness`

Final verification checklist:

- Static docs site generated.
- Home page selected correctly.
- Sidebar navigation generated.
- Search works locally.
- Mermaid works without user config.
- Code blocks are readable.
- Theme CSS variables emitted.
- Responsive layout behaves acceptably.
- Generated output works without a server.
