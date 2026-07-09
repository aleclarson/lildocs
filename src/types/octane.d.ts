declare module "octane/compiler/vite" {
  import type { Plugin } from "vite";

  export function octane(options?: {
    exclude?: string[];
    hmr?: boolean;
    ssr?: boolean;
  }): Plugin;
}
