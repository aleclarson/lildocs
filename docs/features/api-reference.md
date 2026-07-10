# Generated API Reference

> Generate static API pages from a package's exported TypeScript declarations.

Set `reference.packageJson` to a docs-root-relative package manifest:

```json
{
  "reference": {
    "packageJson": "../package.json"
  }
}
```

When the manifest exposes TypeScript declarations, lildocs generates API pages
under `/reference/`. If `reference.packageJson` is not configured, lildocs also
checks for a `package.json` next to the docs root. Sibling package manifests
without an `exports` field are ignored.

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
