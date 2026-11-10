import test from "node:test";
import assert from "node:assert/strict";
import { createGableRoofLayout } from "../src/world/roof-geometry.js";

const PITCH = 0.34;
const HALF_DEPTH = 5;
const WALL_HEIGHT = 3.15;

function roofHeightAt(panel, z) {
  return panel.centerY - Math.tan(panel.rotationX) * (z - panel.centerZ);
}

for (const centerZ of [-17, 17]) {
  test(`gable roof for house at Z=${centerZ} rises to one centered ridge`, () => {
    const roof = createGableRoofLayout({
      centerZ,
      halfDepth: HALF_DEPTH,
      wallHeight: WALL_HEIGHT
    });

    assert.equal(roof.panels.length, 2);
    assert.equal(roof.panels[0].rotationX, -PITCH);
    assert.equal(roof.panels[1].rotationX, PITCH);
    assert.ok(roof.ridgeY > WALL_HEIGHT);

    for (const panel of roof.panels) {
      assert.ok(Math.abs(roofHeightAt(panel, centerZ) - roof.ridgeY) < 1e-10);
      assert.ok(Math.abs(roofHeightAt(panel, centerZ + panel.side * HALF_DEPTH) - WALL_HEIGHT) < 1e-10);
    }
  });
}

test("gable roof profile does not depend on the entrance facade orientation", () => {
  const houseA = createGableRoofLayout({ centerZ: -17, halfDepth: HALF_DEPTH, wallHeight: WALL_HEIGHT });
  const houseB = createGableRoofLayout({ centerZ: 17, halfDepth: HALF_DEPTH, wallHeight: WALL_HEIGHT });

  assert.deepEqual(
    houseA.panels.map(({ side, rotationX, depth }) => ({ side, rotationX, depth })),
    houseB.panels.map(({ side, rotationX, depth }) => ({ side, rotationX, depth }))
  );
  assert.ok(Math.abs(houseA.ridgeY - houseB.ridgeY) < 1e-10);
});

test("invalid roof dimensions and pitch are rejected", () => {
  assert.throws(() => createGableRoofLayout({ centerZ: 0, halfDepth: 0, wallHeight: 3 }), RangeError);
  assert.throws(() => createGableRoofLayout({ centerZ: 0, halfDepth: 5, wallHeight: 3, pitch: Math.PI / 2 }), RangeError);
  assert.throws(() => createGableRoofLayout({ centerZ: Number.NaN, halfDepth: 5, wallHeight: 3 }), TypeError);
});
