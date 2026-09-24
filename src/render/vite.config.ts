import { defineConfig } from "vite";
import { octane } from "@octanejs/vite-plugin";
import { flamefront } from "flamefront/vite";

// The base is a placeholder baked into generated bundles; `buildSite`
// rewrites it to the deployment basename when installing client assets.
export const basenamePlaceholder = "/__lildocs_base__";

export default defineConfig({
  base: `${basenamePlaceholder}/`,
  publicDir: false,
  plugins: [flamefront({ routes: "/app/app.ts", target: "node" }), octane()],
});
