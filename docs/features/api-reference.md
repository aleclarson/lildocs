# Generated API Reference

> Generate static API pages from a package's exported TypeScript declarations.

Set `reference.packageJson` to a docs-root-relative package manifest:

```json
{
  "reference": {
    "enabled": true,
    "packageJson": "../package.json"
  }
}
```

When the manifest exposes TypeScript declarations, lildocs generates API pages
under `/reference/`. If `reference.packageJson` is not configured, lildocs also
checks for a `package.json` next to the docs root. Sibling package manifests
without an `exports` field are ignored. Automatic discovery is enabled by
default.

For a human-facing docs site whose repository package should not be inspected,
disable reference generation in the docs `config.json`:

```json
{
  "reference": {
    "enabled": false
  }
}
```

`enabled: false` skips reference generation before any package manifest is
loaded, including a `packageJson` value supplied in the same object. Omit the
field or set it to `true` to use an explicitly configured package or the
automatic sibling-package discovery. `enabled` must be a boolean and
`packageJson`, when supplied, must be a non-empty path. When reference
generation is enabled, a missing explicitly configured manifest is reported as
a build error.

## Export Paths

Reference pages are generated with `exports-md`. Package export maps follow
relative imports and re-exports by default, and property comments render below
declaration blocks.

Each export uses its full package specifier as its pathname. For a package named
`foo`, the `.` export is written to `/reference/foo.html`, while `./bar` is
written to `/reference/foo/bar.html`.

When the nearest package metadata points to a GitHub repository, generated
symbol sections include GitHub code search links.

See the [configuration reference](../reference/configuration.md#generated-reference)
for the field summary.
