import { octane } from "octane/compiler/vite";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [octane()],
  test: {
    include: ["test/**/*.test.mjs"],
  },
});
