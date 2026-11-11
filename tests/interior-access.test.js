import test from "node:test";
import assert from "node:assert/strict";
import { buildHouseA } from "../src/interiors/house-a.js";
import { buildHouseB } from "../src/interiors/house-b.js";
import { createPlayerController } from "../src/core/player-controller.js";

function createCamera() {
  return {
    position: { x: 0, y: 0, z: 0, set(x, y, z) { this.x = x; this.y = y; this.z = z; } },
    rotation: { x: 0, y: 0, z: 0, order: "YXZ" }
  };
}

function hasReachableCellInRoom(interior, room, controller, step = 0.12) {
  const { minX, maxX, minZ, maxZ } = interior.navigation.bounds;
  const frontSide = interior.id === "houseA" ? 1 : -1;
  const centerZ = interior.id === "houseA" ? -17 : 17;
  const start = interior.spawn;
  const queue = [[start.x, start.z]];
  const seen = new Set([start.x.toFixed(3) + ":" + start.z.toFixed(3)]);
  const directions = [[step, 0], [-step, 0], [0, step], [0, -step]];
  const localMinX = room.x - room.width / 2 + 0.42;
  const localMaxX = room.x + room.width / 2 - 0.42;
  const localMinZ = room.z - room.depth / 2 + 0.42;
  const localMaxZ = room.z + room.depth / 2 - 0.42;

  while (queue.length) {
    const [x, z] = queue.shift();
    const localZ = frontSide * (z - centerZ);
    if (x >= localMinX && x <= localMaxX && localZ >= localMinZ && localZ <= localMaxZ) {
      return true;
    }

    for (const [dx, dz] of directions) {
      const nextX = Math.round((x + dx) * 1000) / 1000;
      const nextZ = Math.round((z + dz) * 1000) / 1000;
      if (nextX < minX || nextX > maxX || nextZ < minZ || nextZ > maxZ) continue;
      const key = nextX.toFixed(3) + ":" + nextZ.toFixed(3);
      if (seen.has(key)) continue;
      if (controller.getBlockingCollidersAt(nextX, nextZ).length) continue;
      seen.add(key);
      queue.push([nextX, nextZ]);
    }
  }
  return false;
}

test("every generated room is reachable from the entrance in both houses", () => {
  const cases = [
    { interior: buildHouseA({ seed: 1401 }) },
    { interior: buildHouseB({ seed: 1402 }) }
  ];

  for (const { interior } of cases) {
    const controller = createPlayerController({ camera: createCamera() });
    controller.setWorld({ colliders: interior.colliders, navigation: interior.navigation });
    assert.equal(controller.setSpawn(interior.spawn), true, interior.id + " spawn must be clear");

    for (const room of interior.plan.rooms) {
      assert.equal(
        hasReachableCellInRoom(interior, room, controller),
        true,
        interior.id + " cannot reach room: " + room.id
      );
    }
  }
});

test("all internal room door openings provide practical player clearance", () => {
  for (const interior of [buildHouseA({ seed: 1401 }), buildHouseB({ seed: 1402 })]) {
    const minWidth = interior.plan.interiorDoor.width;
    for (const partition of interior.plan.partitions) {
      for (const opening of partition.openings ?? []) {
        assert.ok(opening.width >= minWidth, interior.id + " narrow doorway in " + partition.id);
        assert.ok(opening.height === undefined || opening.height >= 2.05);
      }
    }
  }
});
