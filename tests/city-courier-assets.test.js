import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { Script, runInNewContext } from "node:vm";

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
  "js/05-driving-rules.js",
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


test("Street lamps are connected to the day/night cycle", async () => {
  const city = await readFile(new URL("../public/city-courier/js/10-city.js", import.meta.url), "utf8");
  const world = await readFile(new URL("../public/city-courier/js/40-open-world.js", import.meta.url), "utf8");
  assert.match(city, /streetLights=\[\]/);
  assert.match(city, /new THREE\.PointLight\(0xffd09a,0,21,2\)/);
  assert.match(world, /streetLights\.forEach/);
  assert.match(world, /light\.intensity=night\*1\.65/);
});


test("Local split-screen has separate controls, cameras and a shared mission", async () => {
  const engine = await readFile(new URL("../public/city-courier/js/00-engine.js", import.meta.url), "utf8");
  const mission = await readFile(new URL("../public/city-courier/js/20-mission.js", import.meta.url), "utf8");
  const loop = await readFile(new URL("../public/city-courier/js/50-loop.js", import.meta.url), "utf8");
  const html = await readFile(new URL("../public/city-courier/index.html", import.meta.url), "utf8");

  assert.match(engine, /const C2=new THREE\.PerspectiveCamera/);
  assert.match(engine, /w\.userData\.animPhase=carModels\.length\*\.73/);
  assert.match(engine, /car\.userData\.animPhase/);
  assert.match(engine, /const p1map=\{KeyW:'up'/);
  assert.match(engine, /const p2map=\{ArrowUp:'up'/);
  assert.match(engine, /const map=splitMode\?p1map:kmap/);
  assert.match(mission, /function startSplit\(\)/);
  assert.match(mission, /if\(splitMode\)startSplit\(\);else start\(false\)/);
  assert.match(mission, /\$\('splitHud'\)\.style\.display='none'/);
  assert.match(mission, /CourierDriving\.stepVehicle\(player,fps\.on\?null:keys,dt,MAX\)/);
  assert.match(mission, /CourierDriving\.stepVehicle\(player2,keys2,dt,MAX\)/);
  assert.match(mission, /CourierDriving\.separatePlayers\(player,player2,3\.4\)/);
  assert.match(mission, /player2\.collider=\{/);
  assert.match(mission, /col\.push\(player2\.collider\)/);
  assert.match(mission, /d2<4\.4/);
  assert.match(loop, /R\.setScissorTest\(true\)/);
  assert.match(loop, /R\.render\(S,C2\)/);
  assert.match(html, /id="go3"/);
  assert.match(html, /id="splitDivider"/);
});


test("Driving rules move two player states independently", async () => {
  const source = await readFile(new URL("../public/city-courier/js/05-driving-rules.js", import.meta.url), "utf8");
  const context = {};
  runInNewContext(source, context);
  const rules = context.CourierDriving;
  const first = { x: 0, z: 0, h: 0, v: 0 };
  const second = { x: 20, z: 20, h: 0, v: 0 };

  rules.stepVehicle(first, { up: 1 }, 0.5, 24);
  assert.equal(first.v, 11);
  assert.equal(first.z, 5.5);
  assert.equal(second.x, 20);
  assert.equal(second.z, 20);

  rules.stepVehicle(second, { up: 1, right: 1 }, 0.5, 24);
  assert.equal(first.x, 0);
  assert.notEqual(second.h, 0);
  assert.ok(second.x < 20);
});

test("Driving rules clamp speed and separate overlapping local players", async () => {
  const source = await readFile(new URL("../public/city-courier/js/05-driving-rules.js", import.meta.url), "utf8");
  const context = {};
  runInNewContext(source, context);
  const rules = context.CourierDriving;
  const vehicle = { x: 0, z: 0, h: 0, v: 100 };
  rules.stepVehicle(vehicle, { up: 1 }, 1, 24);
  assert.equal(vehicle.v, 24);

  const p1 = { x: 0, z: 0 }, p2 = { x: 1, z: 0 };
  assert.equal(rules.separatePlayers(p1, p2, 3.4), true);
  assert.ok(Math.hypot(p2.x - p1.x, p2.z - p1.z) >= 3.399);
  assert.equal(rules.separatePlayers(p1, p2, 3.4), false);
});
