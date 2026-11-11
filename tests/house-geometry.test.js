import test from "node:test";
import assert from "node:assert/strict";
import { buildExterior } from "../src/world/exterior.js";
import { buildHouseA } from "../src/interiors/house-a.js";
import { buildHouseB } from "../src/interiors/house-b.js";
import { createPlayerController } from "../src/core/player-controller.js";
import * as THREE from "three";
import { getHousePlan } from "../src/world/house-plans.js";

test("opposing houses share the same roof profile and complete roof edge detail", () => {
  const street = buildExterior();

  for (const id of ["house-a", "house-b"]) {
    const negativeSlope = street.group.getObjectByName(id + "-roof-slope-negative-z");
    const positiveSlope = street.group.getObjectByName(id + "-roof-slope-positive-z");
    const ridge = street.group.getObjectByName(id + "-roof-ridge-cap");

    assert.ok(negativeSlope && positiveSlope && ridge);
    const plan = getHousePlan(id === "house-a" ? "houseA" : "houseB");
    assert.ok(Math.abs(negativeSlope.rotation.x + plan.roof.pitch) < 1e-10);
    assert.ok(Math.abs(positiveSlope.rotation.x - plan.roof.pitch) < 1e-10);
    assert.ok(street.group.getObjectByName(id + "-roof-verge-left-north"));
    assert.ok(street.group.getObjectByName(id + "-roof-verge-right-south"));
    assert.ok(street.group.getObjectByName(id + "-front-gutter"));
    assert.ok(street.group.getObjectByName(id + "-rear-gutter"));
    assert.ok(street.group.getObjectByName(id + "-front-downpipe-left"));
    assert.ok(street.group.getObjectByName(id + "-rear-downpipe-right"));
  }
});

test("each house interior has four windows, continuous baseboards and a ceiling light", () => {
  const interiors = [
    buildHouseA(),
    buildHouseB()
  ];

  for (const interior of interiors) {
    const windows = interior.group.children.filter(child => child.isGroup && child.children.some(mesh => mesh.name === "window-horizontal-mullion"));
    assert.equal(windows.length, 4);
    assert.ok(interior.group.getObjectByName(interior.id + "-baseboard-left"));
    assert.ok(interior.group.getObjectByName(interior.id + "-baseboard-right"));
    assert.ok(interior.group.getObjectByName(interior.id + "-baseboard-front-left"));
    assert.ok(interior.group.getObjectByName(interior.id + "-baseboard-front-right"));
    assert.ok(interior.group.getObjectByName(interior.id + "-baseboard-rear"));
    assert.ok(interior.group.getObjectByName(interior.id + "-ceiling-light-diffuser"));
  }
});

test("street tree trunks block movement instead of acting as walk-through scenery", () => {
  const street = buildExterior();
  const treeColliders = street.colliders.filter(item => item.name === "garden-tree-trunk");

  assert.equal(treeColliders.length, 4);
  for (const collider of treeColliders) {
    assert.equal(collider.enabled, true);
    assert.ok(collider.maxX - collider.minX > 0.3);
    assert.ok(collider.maxZ - collider.minZ > 0.3);
  }
});
test("both exterior houses contain correctly aligned static interior window previews", () => {
  const street = buildExterior();

  for (const { id, centerZ, frontSide, wallColor, floorColor } of [
    {
      id: "house-a",
      centerZ: -17,
      frontSide: 1,
      wallColor: 0xd3cfc4,
      floorColor: 0x918d82
    },
    {
      id: "house-b",
      centerZ: 17,
      frontSide: -1,
      wallColor: 0xc6ceca,
      floorColor: 0x858c88
    }
  ]) {
    const preview = street.group.getObjectByName(id + "-window-preview");
    assert.ok(preview, id + " should have a static window preview");
    assert.equal(preview.visible, true);
    assert.equal(preview.userData.staticWindowPreview, true);
    assert.equal(preview.userData.frontZ, centerZ + frontSide * 5);
    assert.equal(preview.userData.rearZ, centerZ - frontSide * 5);
    assert.ok(preview.getObjectByName(id + "-preview-floor"));
    assert.ok(preview.getObjectByName(id + "-preview-ceiling"));
    assert.ok(preview.getObjectByName(id + "-preview-side-wall-left"));
    assert.ok(preview.getObjectByName(id + "-preview-side-wall-right"));
    assert.ok(preview.getObjectByName(id + "-preview-rear-glass--3.5"));
    assert.ok(preview.getObjectByName(id + "-preview-rear-glass-3.5"));
    assert.ok(preview.getObjectByName(id + "-preview-interior-light"));
    assert.ok(street.colliders.every(collider => !collider.name.includes("preview")));
    assert.deepEqual(preview.userData.bounds, {
      minX: -6,
      maxX: 6,
      minZ: centerZ - 5,
      maxZ: centerZ + 5
    });
  }
});

test("house plans generate distinct room layouts and internal partition geometry", () => {
  const planA = getHousePlan("houseA");
  const planB = getHousePlan("houseB");
  const interiorA = buildHouseA();
  const interiorB = buildHouseB();

  assert.deepEqual(planA.rooms.map(room => room.type), ["living", "kitchen", "bedroom", "bathroom"]);
  assert.deepEqual(planB.rooms.map(room => room.type), ["living", "kitchen", "bedroom", "bathroom", "office"]);
  assert.notDeepEqual(planA.partitions, planB.partitions);
  assert.notEqual(planA.roof.pitch, planB.roof.pitch);

  for (const [interior, plan] of [[interiorA, planA], [interiorB, planB]]) {
    const partitions = interior.group.children.filter(child => child.name.startsWith(interior.id + "-partition-"));
    assert.ok(partitions.length >= plan.partitions.length * 2);
    assert.ok(interior.group.getObjectByName(plan.id + "-procedural-furnishings"));
  }
});

test("procedural interiors contain furniture appropriate to each room type", () => {
  const interiorA = buildHouseA();
  const interiorB = buildHouseB();
  const furnitureA = interiorA.group.getObjectByName("houseA-procedural-furnishings");
  const furnitureB = interiorB.group.getObjectByName("houseB-procedural-furnishings");

  assert.ok(furnitureA.getObjectByName("living-sofa-base"));
  assert.ok(furnitureA.getObjectByName("kitchen-lower-cabinets"));
  assert.ok(furnitureA.getObjectByName("bedroom-bed-frame"));
  assert.ok(furnitureA.getObjectByName("bathroom-bath"));
  assert.ok(furnitureB.getObjectByName("living-sofa-base"));
  assert.ok(furnitureB.getObjectByName("office-desk"));
  assert.ok(furnitureB.getObjectByName("kitchen-lower-cabinets"));

  furnitureB.updateMatrixWorld(true);
  const worldCouch = new THREE.Vector3();
  furnitureB.getObjectByName("living-sofa-base").getWorldPosition(worldCouch);
  assert.ok(Math.abs(worldCouch.x - (-2.75)) < 1e-9);
  assert.ok(Math.abs(worldCouch.z - (17 - 1.8)) < 1e-9);
});

test("declared rooms remain within the footprint and do not overlap", () => {
  for (const id of ["houseA", "houseB"]) {
    const plan = getHousePlan(id);
    const bounds = {
      minX: -plan.footprint.width / 2,
      maxX: plan.footprint.width / 2,
      minZ: -plan.footprint.depth / 2,
      maxZ: plan.footprint.depth / 2
    };
    for (const room of plan.rooms) {
      assert.ok(room.x - room.width / 2 >= bounds.minX - 1e-8, room.id + " extends past left wall");
      assert.ok(room.x + room.width / 2 <= bounds.maxX + 1e-8, room.id + " extends past right wall");
      assert.ok(room.z - room.depth / 2 >= bounds.minZ - 1e-8, room.id + " extends past rear wall");
      assert.ok(room.z + room.depth / 2 <= bounds.maxZ + 1e-8, room.id + " extends past front wall");
    }
    for (let left = 0; left < plan.rooms.length; left += 1) {
      for (let right = left + 1; right < plan.rooms.length; right += 1) {
        const a = plan.rooms[left], b = plan.rooms[right];
        const overlapX = Math.min(a.x + a.width / 2, b.x + b.width / 2)
          - Math.max(a.x - a.width / 2, b.x - b.width / 2);
        const overlapZ = Math.min(a.z + a.depth / 2, b.z + b.depth / 2)
          - Math.max(a.z - a.depth / 2, b.z - b.depth / 2);
        assert.ok(overlapX <= 1e-8 || overlapZ <= 1e-8, a.id + " overlaps " + b.id);
      }
    }
  }
});

test("procedural house layouts keep the entrance spawn clear of all generated walls", () => {
  const camera = {
    position: { x: 0, y: 0, z: 0, set(x, y, z) { this.x = x; this.y = y; this.z = z; } },
    rotation: { x: 0, y: 0, z: 0, order: "YXZ" }
  };

  for (const interior of [buildHouseA(), buildHouseB()]) {
    const controller = createPlayerController({ camera });
    controller.setWorld({
      colliders: interior.colliders,
      navigation: interior.navigation
    });
    assert.equal(controller.setSpawn(interior.spawn), true, interior.id + " entry spawn must remain clear");
    assert.deepEqual(
      controller.getBlockingCollidersAt(interior.spawn.x, interior.spawn.z),
      [],
      interior.id + " entry path should not intersect a partition"
    );
  }
});
