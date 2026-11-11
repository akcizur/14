import test from "node:test";
import assert from "node:assert/strict";
import { createGableRoofLayout } from "../src/world/roof-geometry.js";

const PITCH = 0.34;
const HALF_DEPTH = 5;
const WALL_HEIGHT = 3.15;
const EPSILON = 1e-10;

function roofHeightAt(panel, z) {
  return panel.centerY - Math.tan(panel.rotationX) * (z - panel.centerZ);
}

function assertRoofEdges(roof, dimensions) {
  const horizontalHalfLength = (dimensions.halfDepth + dimensions.panelOverhang) / 2;

  assert.equal(roof.panels.length, 2);
  assert.ok(Math.abs(roof.ridgeY - (
    dimensions.wallHeight + Math.tan(dimensions.pitch) * dimensions.halfDepth
  )) < EPSILON);

  for (const panel of roof.panels) {
    const projectedHalfLength = Math.cos(panel.rotationX) * panel.depth / 2;
    assert.ok(Math.abs(projectedHalfLength - horizontalHalfLength) < EPSILON,
      "sloped panel must preserve its requested horizontal footprint");
    assert.ok(Math.abs(roofHeightAt(panel, dimensions.centerZ) - roof.ridgeY) < EPSILON,
      "panel must meet the ridge at the exact ridge height");
    assert.ok(Math.abs(
      roofHeightAt(panel, dimensions.centerZ + panel.side * dimensions.halfDepth)
      - dimensions.wallHeight
    ) < EPSILON, "panel must meet the wall at eave height");

    const innerEdgeZ = panel.centerZ - panel.side * projectedHalfLength;
    const outerEdgeZ = panel.centerZ + panel.side * projectedHalfLength;
    assert.ok(Math.abs(innerEdgeZ - dimensions.centerZ) < EPSILON,
      "inner panel edge must end at the ridge");
    assert.ok(Math.abs(
      Math.abs(outerEdgeZ - dimensions.centerZ)
      - (dimensions.halfDepth + dimensions.panelOverhang)
    ) < EPSILON, "outer panel edge must reach the full horizontal overhang");

    const expectedSlopeLength = (dimensions.halfDepth + dimensions.panelOverhang)
      / Math.cos(dimensions.pitch);
    assert.ok(Math.abs(panel.depth - expectedSlopeLength) < EPSILON,
      "panel depth must be measured along the roof slope");
  }
}

for (const centerZ of [-17, 17]) {
  test(`gable roof for house at Z=${centerZ} rises to one centered ridge`, () => {
    const dimensions = {
      centerZ,
      halfDepth: HALF_DEPTH,
      wallHeight: WALL_HEIGHT,
      pitch: PITCH,
      panelOverhang: 0.8
    };
    const roof = createGableRoofLayout(dimensions);

    assert.equal(roof.panels[0].rotationX, -PITCH);
    assert.equal(roof.panels[1].rotationX, PITCH);
    assert.ok(roof.ridgeY > WALL_HEIGHT);
    assertRoofEdges(roof, dimensions);
  });
}

test("gable roof alignment remains exact for different wall heights, pitches and overhangs", () => {
  const cases = [
    { centerZ: -17, halfDepth: 5, wallHeight: 3.05, pitch: 0.34, panelOverhang: 0.8 },
    { centerZ: 17, halfDepth: 5, wallHeight: 3.15, pitch: 0.39, panelOverhang: 0.95 },
    { centerZ: 2.75, halfDepth: 4.2, wallHeight: 2.9, pitch: 0.27, panelOverhang: 0.65 }
  ];

  for (const dimensions of cases) {
    assertRoofEdges(createGableRoofLayout(dimensions), dimensions);
  }
});

test("gable roof profile does not depend on the entrance facade orientation", () => {
  const houseA = createGableRoofLayout({ centerZ: -17, halfDepth: HALF_DEPTH, wallHeight: WALL_HEIGHT });
  const houseB = createGableRoofLayout({ centerZ: 17, halfDepth: HALF_DEPTH, wallHeight: WALL_HEIGHT });

  assert.deepEqual(
    houseA.panels.map(({ side, rotationX, depth }) => ({ side, rotationX, depth })),
    houseB.panels.map(({ side, rotationX, depth }) => ({ side, rotationX, depth }))
  );
  assert.ok(Math.abs(houseA.ridgeY - houseB.ridgeY) < EPSILON);
});

test("invalid roof dimensions and pitch are rejected", () => {
  assert.throws(() => createGableRoofLayout({ centerZ: 0, halfDepth: 0, wallHeight: 3 }), RangeError);
  assert.throws(() => createGableRoofLayout({ centerZ: 0, halfDepth: 5, wallHeight: 3, pitch: Math.PI / 2 }), RangeError);
  assert.throws(() => createGableRoofLayout({ centerZ: Number.NaN, halfDepth: 5, wallHeight: 3 }), TypeError);
});
