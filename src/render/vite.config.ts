import { defineConfig } from "vite";
import { octane } from "@octanejs/vite-plugin";
import { flamefront } from "flamefront/vite";

// The base is a placeholder baked into generated bundles; `buildSite`
// rewrites it to the deployment basename when installing client assets.
export const basenamePlaceholder = "/__lildocs_base__";

export default defineConfig({
  base: `${basenamePlaceholder}/`,
  publicDir: false,
  experimental: {
    // Client chunks are installed under assets/lildocs/; emit dep URLs
    // relative to the importing module so they resolve under any basename.
    renderBuiltUrl: () => ({ relative: true }),
  },
  plugins: [flamefront({ routes: "/app/app.ts", target: "node" }), octane()],
});
