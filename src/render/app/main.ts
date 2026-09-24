import { startOctaneClient } from "flamefront/octane/client";
import { createApp } from "./app.ts";
import { initGlobalBehaviors } from "./enhance.ts";
import { initDevReload } from "./dev-reload.ts";

const lildocs = (
  window as typeof window & {
    __lildocs?: { basename?: string; dev?: boolean };
  }
).__lildocs;

await startOctaneClient({ app: createApp(lildocs?.basename ?? "/") });
initGlobalBehaviors();
initDevReload();
