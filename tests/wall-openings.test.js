import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { addWallWithOpenings, makeMaterial } from "../src/world/geometry.js";
import { buildExterior } from "../src/world/exterior.js";
import { buildEmptyInterior } from "../src/world/interior-builder.js";

test("wall openings create real geometry gaps with blocking glazing colliders", () => {
  const group = new THREE.Group();
  const colliders = [];
  addWallWithOpenings(group, colliders, "test-wall", {
    minX: -6, maxX: 6, z: 0, thickness: 0.24, height: 3, material: makeMaterial(0xffffff),
    openings: [
      { minX: -4, maxX: -2, minY: 1, maxY: 2 },
      { minX: 2, maxX: 4, minY: 1, maxY: 2 }
    ]
  });

  assert.ok(group.getObjectByName("test-wall-sill-0"));
  assert.ok(group.getObjectByName("test-wall-lintel-1"));
  assert.equal(colliders.filter(item => item.name.includes("glazing")).length, 2);
  assert.equal(colliders.length, 9);
});

test("overlapping and out-of-bounds openings are rejected", () => {
  const group = new THREE.Group();
  const material = makeMaterial(0xffffff);
  const base = { minX: -5, maxX: 5, z: 0, thickness: 0.2, height: 3, material };

  assert.throws(() => addWallWithOpenings(group, [], "overlap", {
    ...base,
    openings: [
      { minX: -2, maxX: 1, minY: 1, maxY: 2 },
      { minX: 0, maxX: 2, minY: 1, maxY: 2 }
    ]
  }), RangeError);

  assert.throws(() => addWallWithOpenings(group, [], "outside", {
    ...base,
    openings: [{ minX: 4, maxX: 6, minY: 1, maxY: 2 }]
  }), RangeError);
});

test("exterior facade windows sit on the outside face and retain solid collision", () => {
  const street = buildExterior();
  const houseAWindow = street.group.getObjectByName("house-a-front-wall-left-sill-0");
  const houseBWindow = street.group.getObjectByName("house-b-front-wall-left-sill-0");
  assert.ok(houseAWindow);
  assert.ok(houseBWindow);

  const glazingColliders = street.colliders.filter(item => item.name.includes("-glazing-"));
  assert.ok(glazingColliders.some(item => item.name === "house-a-front-wall-left-glazing-0"));
  assert.ok(glazingColliders.some(item => item.name === "house-b-front-wall-left-glazing-0"));
  assert.ok(glazingColliders.some(item => item.name === "house-a-rear-wall-glazing-0"));
  assert.ok(glazingColliders.some(item => item.name === "house-b-rear-wall-glazing-0"));

  const findWindow = (x, z) => street.group.children.find(item =>
    item.isGroup && item.position.x === x && Math.abs(item.position.z - z) < 1e-9
  );
  const aWindow = findWindow(-3.55, -12 + 0.135);
  const bWindow = findWindow(-3.55, 12 - 0.135);
  const aRearWindow = findWindow(-3.5, -22 - 0.135);
  const bRearWindow = findWindow(-3.5, 22 + 0.135);
  assert.ok(aWindow && bWindow && aRearWindow && bRearWindow);
  for (const windowGroup of [aWindow, bWindow, aRearWindow, bRearWindow]) {
    assert.ok(windowGroup.children.some(child => child.name === "window-glass-pane"));
  }
  assert.equal(aWindow.rotation.y, 0);
  assert.equal(bWindow.rotation.y, Math.PI);
  assert.equal(aRearWindow.rotation.y, Math.PI);
  assert.equal(bRearWindow.rotation.y, 0);
});

test("interior front and rear windows match the two facade openings", () => {
  for (const config of [
    { centerZ: -17, frontSide: 1 },
    { centerZ: 17, frontSide: -1 }
  ]) {
    const interior = buildEmptyInterior({
      id: "window-test",
      centerZ: config.centerZ,
      frontSide: config.frontSide
    });
    const frontZ = config.centerZ + config.frontSide * 5;
    const rearZ = config.centerZ - config.frontSide * 5;
    const frontWindowZ = frontZ - config.frontSide * 0.135;
    const rearWindowZ = rearZ + config.frontSide * 0.135;
    const frontWindows = interior.group.children.filter(item =>
      item.isGroup && Math.abs(item.position.z - frontWindowZ) < 1e-9
    );
    const rearWindows = interior.group.children.filter(item =>
      item.isGroup && Math.abs(item.position.z - rearWindowZ) < 1e-9
    );

    assert.equal(frontWindows.length, 2);
    assert.equal(rearWindows.length, 2);
    assert.ok(frontWindows.every(item => item.rotation.y === (config.frontSide > 0 ? Math.PI : 0)));
    assert.ok(rearWindows.every(item => item.rotation.y === (config.frontSide < 0 ? Math.PI : 0)));
  }
});
