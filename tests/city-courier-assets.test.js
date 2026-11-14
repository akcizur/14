import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { Script } from "node:vm";

const manifestUrl = new URL("../public/city-courier/assets/manifest.json", import.meta.url);

test("City Courier model manifest points to 32 valid GLB files", async () => {
  const manifest = JSON.parse(await readFile(manifestUrl, "utf8"));
  assert.equal(Object.keys(manifest).length, 32, "all extracted models should be listed");

  for (const [name, relativePath] of Object.entries(manifest)) {
    const url = new URL(relativePath, new URL("../public/city-courier/", import.meta.url));
    const data = await readFile(url);
    assert.equal(data.subarray(0, 4).toString("ascii"), "glTF", name + " should have a GLB header");
    assert.equal(data.readUInt32LE(8), data.length, name + " should have a valid GLB byte length");
  }
});


const gameRoot = new URL("../public/city-courier/", import.meta.url);
const runtimeFiles = [
  "js/00-engine.js",
  "js/10-city.js",
  "js/20-mission.js",
  "js/30-weapons.js",
  "js/40-open-world.js",
  "js/50-loop.js"
];

test("City Courier runtime scripts load in dependency order and parse", async () => {
  const html = await readFile(new URL("index.html", gameRoot), "utf8");
  const actualOrder = [...html.matchAll(/<script src="\.\/js\/([^"]+)"><\/script>/g)]
    .map(match => "js/" + match[1]);
  assert.deepEqual(actualOrder, runtimeFiles, "runtime script order must remain explicit");

  for (const relativePath of runtimeFiles) {
    const source = await readFile(new URL(relativePath, gameRoot), "utf8");
    assert.ok(source.trim().length > 0, relativePath + " should not be empty");
    assert.doesNotThrow(() => new Script(source, { filename: relativePath }), relativePath + " should parse");
  }
});

test("City Courier entry page does not load the retired monolithic runtime", async () => {
  const html = await readFile(new URL("index.html", gameRoot), "utf8");
  assert.equal(html.includes('src="./game.js"'), false);
});
