import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fixtureWorkspace, runCli } from "./helpers/fixture.mjs";

test("builds with bare path invocation", async () => {
  const { docs, workspace } = await fixtureWorkspace();
  const outDir = path.join(workspace, "site");

  const result = await runCli([docs, "--out", outDir]);

  assert.match(result.stdout, /Built 3 pages/);
});

test("builds with explicit build command", async () => {
  const { docs, workspace } = await fixtureWorkspace();
  const outDir = path.join(workspace, "custom");

  const result = await runCli(["build", docs, "--out", outDir, "--theme", "minimal"]);

  assert.match(result.stdout, /Built 3 pages/);
});

test("dev command returns a clear v1 message", async () => {
  const { docs } = await fixtureWorkspace();

  await assert.rejects(() => runCli(["dev", docs]), /dev command is not implemented yet/);
});

test("unknown commands report usage errors", async () => {
  await assert.rejects(() => runCli(["publish", "./docs"]), /Unknown arguments|Not a valid subcommand/);
});

test("unsupported options report usage errors", async () => {
  const { docs } = await fixtureWorkspace();

  await assert.rejects(() => runCli([docs, "--wat"]), /Unknown option|Unknown argument/);
});
