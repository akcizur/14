import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

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
