import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
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

test("config schema supports simple background options", async () => {
  const schema = JSON.parse(await readFile("schemas/config.schema.json", "utf8"));

  assert.deepEqual(Object.keys(schema.properties.background.properties), [
    "image",
    "gradient",
    "blendMode",
  ]);
  assert.equal(schema.properties.background.additionalProperties, false);
});

test("config schema supports link underline options", async () => {
  const schema = JSON.parse(await readFile("schemas/config.schema.json", "utf8"));

  assert.deepEqual(schema.properties.link.properties.underline.enum, ["always", "hover", "none"]);
  assert.equal(schema.properties.link.additionalProperties, false);
});
