# Dev Mode Implementation Plan

## Goal

Implement `lildocs dev <path>` as a local development server for the same generated site produced by `lildocs build <path>`.

Dev mode should prioritize correctness and a simple maintenance surface:

- Serve the generated static site over HTTP.
- Rebuild when Markdown, assets, or local theme files change.
- Refresh connected browsers after successful rebuilds.
- Preserve the static build pipeline as the source of truth.
- Keep production output behavior unchanged.

## Current State

`src/cli.ts` routes `dev` but throws a not-implemented error.

`src/core/build.ts` exposes `buildSite(options)` and always:

- Resolves input paths.
- Builds the content model.
- Renders pages with Preact SSR.
- Writes HTML, CSS, search index, scripts, and assets to `outDir`.
- Cleans `outDir` before each build.

The existing tests assert that `dev` returns a clear not-implemented message. Those tests must be replaced with real dev-mode behavior tests.

## Recommended Approach

Implement dev mode as a thin server around the existing static builder.

Use Node platform APIs first:

- `node:http` for the local server.
- `node:fs/promises` and `node:fs` watchers.
- No new dependency unless `fs.watch` proves too unreliable in tests.

This keeps the CLI lightweight and avoids pulling in a dev-server framework before the project needs one.

## CLI Surface

Keep the existing required command shape:

```bash
lildocs dev <path>
```

Initially support the same shared options:

```bash
--out <dir>
--theme <name>
```

Add dev-specific options:

```bash
--port <number>
--host <host>
```

Defaults:

- `--host 127.0.0.1`
- `--port 3000`
- `--out .lildocs`

Reasoning: defaulting dev output to `dist` is risky because dev rebuilds clean the output directory repeatedly. A hidden `.lildocs` directory keeps development artifacts separate from release output.

Update `.gitignore` to include:

```gitignore
.lildocs/
```

## Architecture

Add a new module:

```text
src/core/dev.ts
```

Suggested exports:

```ts
export type DevOptions = {
  input: string;
  outDir: string;
  cwd: string;
  theme?: string;
  host: string;
  port: number;
};

export type DevServer = {
  url: string;
  close: () => Promise<void>;
};

export async function startDevServer(options: DevOptions): Promise<DevServer>;
```

`startDevServer` should:

1. Run an initial `buildSite`.
2. Start an HTTP static file server rooted at `outDir`.
3. Watch the docs root and relevant project files.
4. Debounce rebuilds.
5. Notify browsers after successful rebuilds.
6. Log rebuild success and failure clearly.

## Serving Static Files

Implement a small static server:

- Map `/` to `/index.html`.
- Decode URLs safely.
- Prevent path traversal by verifying resolved paths stay inside `outDir`.
- Serve generated HTML, CSS, JS, JSON, SVG, PNG, JPG, GIF, WEBP, AVIF, ICO, TXT, and common font MIME types.
- Return `404` for missing files.
- Return `405` for unsupported methods except `GET` and `HEAD`.

This code can live in `src/core/server.ts` if it is large enough to warrant separation.

## Live Reload

Use Server-Sent Events instead of WebSockets.

Add a dev-only endpoint:

```text
/__lildocs/events
```

Connected browsers subscribe with `EventSource`.

Inject a dev-only reload script into generated HTML during dev mode:

```html
<script type="module" src="/__lildocs/client.js"></script>
```

The client script should:

- Open `new EventSource("/__lildocs/events")`.
- Reload the page on a `reload` event.
- Optionally log connection errors to `console.debug`.

Do not include this script in normal `build` output.

### Build Pipeline Change Needed

`buildSite` currently does not know whether it is building for production or dev.

Add optional build options:

```ts
type BuildOptions = {
  input: string;
  outDir: string;
  cwd: string;
  theme?: string;
  dev?: {
    clientScriptPath: string;
  };
};
```

Thread the dev option into `renderPage` / `Layout`, and render the extra script only when provided.

Keep the default behavior identical for static builds.

## Watching Files

Watch these paths:

- The resolved docs root.
- `theme.ts` inside the docs root when present.
- Static assets under docs root.

Implementation options:

1. Start with recursive `fs.watch` where supported.
2. If recursive watch is unavailable, walk the docs tree and watch directories individually.
3. On rebuild, refresh the watched directory set to account for new folders.

Debounce changes with a small delay, for example 100-200 ms.

Ignore:

- The dev output directory.
- `dist`.
- `node_modules`.
- Hidden/system files that the content collector already ignores, except `theme.ts` if hidden handling is later changed.

## Rebuild Behavior

Rebuilds should be serialized.

Suggested state:

- `rebuilding: boolean`
- `pending: boolean`
- `lastSuccessfulBuild?: BuildResult`

If a change arrives while rebuilding:

- Mark `pending = true`.
- Run one more rebuild after the current one finishes.

On successful rebuild:

- Update served files in `outDir`.
- Emit `reload` to connected SSE clients.
- Log page count and elapsed time.

On failed rebuild:

- Keep the server running.
- Log the error.
- Do not emit reload.
- Continue watching so the next edit can recover.

## Output Directory Safety

The existing `buildSite` clears `outDir`.

Before dev mode calls `buildSite`, validate:

- `outDir` resolves under `cwd`, unless the user explicitly provided an absolute path.
- `outDir` is not the docs root.
- `outDir` is not an ancestor of the docs root.
- `outDir` is not the repository root.

This protection should probably be shared with build mode later, but dev mode needs it first because it rebuilds repeatedly.

## CLI Integration

Update `src/cli.ts`:

- Add `hostOption`.
- Add `portOption`.
- Extend dev command args.
- Replace the stub handler with `startDevServer`.
- Print the serving URL.
- Keep the process alive until interrupted.

Handle shutdown:

- `SIGINT`
- `SIGTERM`

On shutdown:

- Close HTTP server.
- Close file watchers.
- End SSE connections.

## Testing Plan

Add focused tests instead of one broad dev test.

Suggested files:

```text
test/dev-server.test.mjs
test/dev-watch.test.mjs
```

### Server Tests

- `lildocs dev <path>` starts and serves `/index.html`.
- `/` returns the home page.
- Nested generated pages are served.
- CSS, search JS, search index, and copied assets are served with correct status.
- Missing files return `404`.
- Path traversal attempts return `403` or `404`.
- Unsupported methods return `405`.

### CLI Option Tests

- `--host` is respected.
- `--port` is respected.
- Port `0` works for tests and reports the actual assigned port if using the programmatic API.
- Invalid ports fail clearly.
- `--theme minimal` affects served CSS.
- Default dev output is `.lildocs`.
- Custom `--out` works.

### Watch/Rebuild Tests

Use the programmatic `startDevServer` API to avoid brittle process management where possible.

Cases:

- Editing an existing Markdown file rebuilds and updates served HTML.
- Adding a new Markdown file rebuilds and serves the new page.
- Deleting a Markdown file rebuilds and stops serving that page.
- Editing an asset rebuilds/copies the updated asset.
- Editing local `theme.ts` rebuilds CSS.
- A build error does not stop the dev server.
- Fixing the error triggers a successful rebuild.

### Live Reload Tests

At unit/integration level:

- SSE endpoint accepts clients.
- Successful rebuild emits `reload`.
- Failed rebuild does not emit `reload`.

Browser-level live reload can remain a manual check unless a browser test harness is introduced.

## Documentation Updates

Update `README.md`:

```bash
pnpm run build
node dist/cli.mjs dev ./docs
```

Document:

- Default dev URL.
- `--port`.
- `--host`.
- `.lildocs` dev output directory.
- `dev` is for local preview; `build` remains the deployable static output.

Update `AGENTS.md` if new tooling or commands are added.

## Dependency Decision

Do not add a dependency for the first implementation.

Reconsider only if:

- Recursive watching is too unreliable across supported platforms.
- Tests become dominated by watch edge-case plumbing.

If needed later, the smallest likely dependency is `chokidar`, but it is not justified until native watching proves insufficient.

## Implementation Steps

1. Add static server helper with MIME handling and path traversal protection.
2. Add `startDevServer` with initial build and static serving.
3. Add host/port CLI options and replace the dev stub.
4. Add dev-only reload script injection support to the render pipeline.
5. Add SSE endpoint and reload client script.
6. Add native watch/debounce/rebuild loop.
7. Add output directory safety checks.
8. Replace the current dev-not-implemented test with server tests.
9. Add watch/rebuild tests.
10. Update README and `.gitignore`.
11. Run `pnpm run lint`, `pnpm run typecheck`, `pnpm test`, and a manual `node dist/cli.mjs dev ./docs` smoke test.

## Open Questions

- Should dev mode open the browser automatically? Recommendation: no for first implementation.
- Should dev mode clean `.lildocs` on shutdown? Recommendation: no; keeping it helps debugging and avoids extra shutdown work.
- Should build mode also get output-directory safety checks now? Recommendation: yes if the helper is simple, but avoid broad behavior changes unless covered by tests.
- Should live reload be disabled by a flag? Recommendation: not initially.

## Acceptance Criteria

- `lildocs dev ./docs` serves the generated docs locally.
- The server rebuilds on Markdown, asset, and theme changes.
- Browser pages reload after successful rebuilds.
- Build failures are visible but do not kill the server.
- Static `lildocs build` output is unchanged.
- Tests cover server behavior, rebuild behavior, and error recovery.
