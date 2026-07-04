import { defineConfig } from "tsdown";

export default defineConfig([
  {
    entry: ["src/cli.ts", "src/core/github-pages.ts"],
    format: ["esm"],
    outDir: "dist",
    clean: true,
    copy: [{ from: "src/render/*.{css,js,svg}", to: "dist/render" }],
    dts: false,
    shims: true,
  },
  {
    entry: {
      "render/search": "src/render/search.tsx",
    },
    platform: "browser",
    format: ["esm"],
    outDir: "dist",
    clean: false,
    dts: false,
    deps: {
      onlyBundle: false,
      alwaysBundle: [
        /^@goddard-ai\/ui-primitives(?:\/.*)?$/,
        /^@floating-ui\/(?:dom|core|utils)(?:\/.*)?$/,
        /^@preact\/signals(?:-core)?(?:\/.*)?$/,
        /^preact(?:\/.*)?$/,
        /^tabbable(?:\/.*)?$/,
      ],
    },
  },
]);
