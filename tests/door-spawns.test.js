import test from "node:test";
import assert from "node:assert/strict";
import { createDoorSpawns } from "../src/scenes/door-spawns.js";

test("House A entry faces into the interior and exit faces out to the street", () => {
  const spawns = createDoorSpawns({ doorZ: -12, frontSide: 1 });
  assert.deepEqual(spawns.inside, { x: 0, z: -13.6, yaw: 0 });
  assert.deepEqual(spawns.outside, { x: 0, z: -10.2, yaw: Math.PI });
});

test("House B entry faces into the interior and exit faces out to the street", () => {
  const spawns = createDoorSpawns({ doorZ: 12, frontSide: -1 });
  assert.deepEqual(spawns.inside, { x: 0, z: 13.6, yaw: Math.PI });
  assert.deepEqual(spawns.outside, { x: 0, z: 10.2, yaw: 0 });
});

test("invalid door orientation is rejected", () => {
  assert.throws(() => createDoorSpawns({ doorZ: 0, frontSide: 0 }), TypeError);
});
