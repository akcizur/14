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

  const aGlass = street.group.getObjectByName("house-a-front-wall-left-glazing-0");
  const bGlass = street.group.getObjectByName("house-b-front-wall-left-glazing-0");
  assert.ok(aGlass && bGlass);
  assert.ok(street.colliders.some(item => item.name === aGlass.name));
  assert.ok(street.colliders.some(item => item.name === bGlass.name));

  const aRearGlass = street.group.getObjectByName("house-a-rear-wall-glazing-0");
  const bRearGlass = street.group.getObjectByName("house-b-rear-wall-glazing-0");
  assert.ok(aRearGlass && bRearGlass);
  assert.ok(street.colliders.some(item => item.name === aRearGlass.name));
  assert.ok(street.colliders.some(item => item.name === bRearGlass.name));

  const aWindow = street.group.children.find(item =>
    item.isGroup && item.position.x === -3.55 && Math.abs(item.position.z - (-12 + 0.135)) < 1e-9
  );
  const bWindow = street.group.children.find(item =>
    item.isGroup && item.position.x === -3.55 && Math.abs(item.position.z - (12 - 0.135)) < 1e-9
  );
  assert.ok(aWindow && bWindow);
  assert.equal(aWindow.rotation.y, 0);
  assert.equal(bWindow.rotation.y, Math.PI);
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
