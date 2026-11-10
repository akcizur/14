import test from "node:test";
import assert from "node:assert/strict";
import { createDoorSpawns } from "../src/scenes/door-spawns.js";
import { createPlayerController } from "../src/core/player-controller.js";

function createCamera() {
  return {
    position: { x: 0, y: 0, z: 0, set(x, y, z) { this.x = x; this.y = y; this.z = z; } },
    rotation: { x: 0, y: 0, z: 0, order: "XYZ" }
  };
}

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

test("after exiting either house, the entry prompt stays hidden until the player turns back to the door", () => {
  for (const { doorZ, frontSide } of [
    { doorZ: -12, frontSide: 1 },
    { doorZ: 12, frontSide: -1 }
  ]) {
    const spawns = createDoorSpawns({ doorZ, frontSide });
    const controller = createPlayerController({
      camera: createCamera(),
      state: { started: true, paused: false, transitioning: false }
    });
    controller.setWorld({
      interactables: [{
        id: "entry-door",
        x: 0,
        z: doorZ,
        range: 2.45,
        requiresFacing: true,
        facingThreshold: 0.18
      }]
    });

    assert.equal(controller.setSpawn(spawns.outside), true);
    assert.equal(controller.update(1 / 60), null);

    assert.equal(controller.setSpawn({
      ...spawns.outside,
      yaw: spawns.inside.yaw
    }), true);
    assert.equal(controller.update(1 / 60)?.id, "entry-door");
  }
});

test("invalid door orientation is rejected", () => {
  assert.throws(() => createDoorSpawns({ doorZ: 0, frontSide: 0 }), TypeError);
});


test("invalid door spawn distances are rejected", () => {
  assert.throws(
    () => createDoorSpawns({ doorZ: 0, frontSide: 1, outsideDistance: 0 }),
    RangeError
  );
  assert.throws(
    () => createDoorSpawns({ doorZ: 0, frontSide: 1, insideDistance: Number.NaN }),
    RangeError
  );
});
