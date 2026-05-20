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

test("config schema supports navigation feel options", async () => {
  const schema = JSON.parse(await readFile("schemas/config.schema.json", "utf8"));

  assert.equal(schema.properties.navigation.properties.order.type, "array");
  assert.equal(schema.properties.navigation.properties.order.items.type, "string");
  assert.equal(schema.properties.navigation.properties.order.items.minLength, 1);
  assert.deepEqual(schema.properties.navigation.properties.transition.enum, [
    "fade",
    "slide",
    "scale",
    "instant",
  ]);
  assert.equal(schema.properties.navigation.properties.duration.minimum, 0);
  assert.equal(schema.properties.navigation.properties.easing.minLength, 1);
  assert.equal(schema.properties.navigation.additionalProperties, false);
});

test("config schema supports logo options", async () => {
  const schema = JSON.parse(await readFile("schemas/config.schema.json", "utf8"));

  assert.deepEqual(Object.keys(schema.properties.logo.properties), ["image", "text", "font"]);
  assert.equal(schema.properties.logo.properties.font.$ref, "#/$defs/fontValue");
  assert.equal(schema.properties.logo.additionalProperties, false);
});

test("config schema supports favicon", async () => {
  const schema = JSON.parse(await readFile("schemas/config.schema.json", "utf8"));

  assert.equal(schema.properties.favicon.type, "string");
  assert.equal(schema.properties.favicon.minLength, 1);
});

test("config schema supports project name override", async () => {
  const schema = JSON.parse(await readFile("schemas/config.schema.json", "utf8"));

  assert.equal(schema.properties.projectName.type, "string");
  assert.equal(schema.properties.projectName.minLength, 1);
});
