import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/cli.ts", "src/core/github-pages.ts"],
  format: ["esm"],
  outDir: "dist",
  clean: true,
  dts: false,
  shims: true,
});
