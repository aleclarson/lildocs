import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/cli.ts", "src/core/github-pages.ts"],
  format: ["esm"],
  outDir: "dist",
  clean: true,
  copy: [{ from: "src/render/*.{css,js}", to: "dist/render" }],
  dts: false,
  shims: true,
});
