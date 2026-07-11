import { defineConfig } from "tsdown";

export default defineConfig([
  {
    entry: ["src/cli.ts", "src/core/github-pages.ts"],
    format: ["esm"],
    outDir: "dist",
    clean: true,
    deps: {
      alwaysBundle: [
        /^(?:cmd-ts|culori|entities|exports-md|gray-matter|marked|marked-shiki)(?:$|\/)/,
      ],
      onlyBundle: [
        /^(?:ansi-regex|chalk|cmd-ts|culori|debug|didyoumean|entities|esprima|exports-md|extend-shallow|gray-matter|is-extendable|js-yaml|kind-of|marked|marked-shiki|ms|section-matter|strip-ansi|strip-bom-string)(?:$|\/)/,
      ],
    },
    define: {
      "import.meta.main": "false",
    },
    dts: false,
    shims: true,
  },
]);
