import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "vitest";
import { bundledThemesInfo } from "shiki";

test("config schema lists the exact bundled shiki themes", async () => {
  const schema = JSON.parse(await readFile("schemas/config.schema.json", "utf8"));
  const shikiThemeEnum = schema.properties.theme.oneOf.find(
    (option) => option.title === "Bundled Shiki theme",
  )?.enum;

  assert.deepEqual(
    shikiThemeEnum,
    bundledThemesInfo.map((theme) => theme.id).sort((a, b) => a.localeCompare(b)),
  );
});

test("config schema exposes the reference generation toggle", async () => {
  const schema = JSON.parse(await readFile("schemas/config.schema.json", "utf8"));
  const reference = schema.properties.reference.properties;

  assert.equal(reference.enabled.type, "boolean");
  assert.equal(reference.enabled.default, true);
  assert.equal(reference.packageJson.type, "string");
});
