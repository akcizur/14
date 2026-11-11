import test from "node:test";
import assert from "node:assert/strict";
import { WORLD_PLAN, assertWorldPlan, validateWorldPlan } from "../src/world/world-plan.js";
import { generateHousePlan, getHousePlan, validateHousePlan } from "../src/world/house-plans.js";
import { buildExterior } from "../src/world/exterior.js";
import { buildHouseA } from "../src/interiors/house-a.js";
import { buildHouseB } from "../src/interiors/house-b.js";
import { createPlayerController } from "../src/core/player-controller.js";

function camera() {
  return {
    position: { x: 0, y: 0, z: 0, set(x, y, z) { this.x = x; this.y = y; this.z = z; } },
    rotation: { x: 0, y: 0, z: 0, order: "YXZ" }
  };
}

test("the canonical world plan keeps the street, sidewalks, crossings and house sites coherent", () => {
  assert.equal(assertWorldPlan(WORLD_PLAN), WORLD_PLAN);
  assert.deepEqual(validateWorldPlan(WORLD_PLAN), { valid: true, errors: [] });
  assert.equal(WORLD_PLAN.street.traffic.laneOffset, 1.82);
  assert.equal(WORLD_PLAN.street.pedestrians.walkZ, 4.9);
  assert.deepEqual(
    WORLD_PLAN.street.crossings.centersX,
    WORLD_PLAN.street.pedestrians.crosswalkXs
  );
  assert.equal(WORLD_PLAN.houses.length, 2);
  assert.ok(WORLD_PLAN.street.crossings.spanZ / 2 >= 5.25);
});

test("seeded procedural house plans are stable, valid and structurally varied", () => {
  for (const archetype of ["houseA", "houseB"]) {
    for (let seed = 1; seed <= 100; seed += 1) {
      const first = generateHousePlan(seed, archetype);
      const second = generateHousePlan(seed, archetype);
      assert.deepEqual(first, second, archetype + " seed " + seed + " must be deterministic");
      assert.equal(validateHousePlan(first).valid, true, archetype + " seed " + seed);
      assert.equal(first.seed, seed);
    }
  }

  assert.notDeepEqual(generateHousePlan(101, "houseA").partitions, generateHousePlan(102, "houseA").partitions);
  assert.notDeepEqual(generateHousePlan(101, "houseB").partitions, generateHousePlan(102, "houseB").partitions);
  assert.deepEqual(getHousePlan("houseA", 777), generateHousePlan(777, "houseA"));
});

test("the exterior preview and playable interiors consume the exact same generated house plan", () => {
  const street = buildExterior({ generatedHouses: true });
  for (const site of WORLD_PLAN.houses) {
    const expected = generateHousePlan(site.seed, site.planId);
    assert.deepEqual(street.housePlans[site.planId], expected);

    const preview = street.group.getObjectByName(site.id + "-window-preview");
    assert.ok(preview);
    assert.equal(preview.userData.seed, site.seed);
    for (const window of expected.facade.windows.filter(item => item.side === "rear")) {
      assert.ok(preview.getObjectByName(site.id + "-preview-rear-glass-" + window.x));
    }

    const interior = site.planId === "houseA"
      ? buildHouseA({ seed: site.seed })
      : buildHouseB({ seed: site.seed });
    assert.deepEqual(interior.plan, expected);
    assert.equal(interior.doors.exit.dimensions.width, expected.entry.width);
  }
});

test("large furniture produces matching solid colliders without blocking the entry spawn", () => {
  for (const interior of [buildHouseA({ seed: 1401 }), buildHouseB({ seed: 1402 })]) {
    const furniture = interior.colliders.filter(item => item.source);
    assert.ok(furniture.length >= 6, interior.id + " should contain furniture collision");
    assert.ok(furniture.every(item => item.enabled && item.maxX > item.minX && item.maxZ > item.minZ));

    const controller = createPlayerController({ camera: camera() });
    controller.setWorld({ colliders: interior.colliders, navigation: interior.navigation });
    assert.equal(controller.setSpawn(interior.spawn), true, interior.id + " entry spawn must remain clear");

    const obstacle = furniture[0];
    const centerX = (obstacle.minX + obstacle.maxX) / 2;
    const centerZ = (obstacle.minZ + obstacle.maxZ) / 2;
    assert.ok(
      controller.getBlockingCollidersAt(centerX, centerZ).some(item => item.name === obstacle.name),
      obstacle.name + " must block player movement"
    );
  }
});

test("street geometry, traffic and pedestrian systems share the canonical world plan", () => {
  const street = buildExterior();
  assert.deepEqual(street.navigation.bounds, WORLD_PLAN.street.navigation);
  assert.equal(street.traffic.lanes[0].z, -WORLD_PLAN.street.traffic.laneOffset);
  assert.equal(street.traffic.lanes[1].z, WORLD_PLAN.street.traffic.laneOffset);
  assert.equal(street.pedestrians.walkers.length, WORLD_PLAN.street.pedestrians.initialWalkers.length);
  assert.deepEqual(
    street.pedestrians.benches.map(bench => ({ x: bench.x, z: bench.z })),
    WORLD_PLAN.street.pedestrians.benches.map(bench => ({ x: bench.x, z: bench.z }))
  );
  street.pedestrians.dispose();
  street.traffic.dispose();
});
