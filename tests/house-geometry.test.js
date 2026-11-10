import test from "node:test";
import assert from "node:assert/strict";
import { buildExterior } from "../src/world/exterior.js";
import { buildHouseA } from "../src/interiors/house-a.js";
import { buildHouseB } from "../src/interiors/house-b.js";

test("opposing houses share the same roof profile and complete roof edge detail", () => {
  const street = buildExterior();

  for (const id of ["house-a", "house-b"]) {
    const negativeSlope = street.group.getObjectByName(id + "-roof-slope-negative-z");
    const positiveSlope = street.group.getObjectByName(id + "-roof-slope-positive-z");
    const ridge = street.group.getObjectByName(id + "-roof-ridge-cap");

    assert.ok(negativeSlope && positiveSlope && ridge);
    assert.ok(Math.abs(negativeSlope.rotation.x + 0.34) < 1e-10);
    assert.ok(Math.abs(positiveSlope.rotation.x - 0.34) < 1e-10);
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
