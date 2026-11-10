import test from "node:test";
import assert from "node:assert/strict";
import { buildExterior } from "../src/world/exterior.js";
import { buildEmptyInterior } from "../src/world/interior-builder.js";

function worldSwingZ(door) {
  return -Math.sin(door.pivot.parent.rotation.y + door.openAngle);
}

test("exterior entrance doors swing inward for both opposite houses", () => {
  const street = buildExterior();
  const cases = [
    { door: street.doors.houseA, insideSide: -1 },
    { door: street.doors.houseB, insideSide: 1 }
  ];

  for (const { door, insideSide } of cases) {
    assert.equal(Math.sign(worldSwingZ(door)), insideSide);
  }
});

test("interior exit doors swing outward toward the street for both houses", () => {
  const cases = [
    { centerZ: -17, frontSide: 1, expectedOutsideSide: 1 },
    { centerZ: 17, frontSide: -1, expectedOutsideSide: -1 }
  ];

  for (const config of cases) {
    const interior = buildEmptyInterior({
      id: "door-direction-test",
      centerZ: config.centerZ,
      frontSide: config.frontSide,
      streetSpawnKey: "outside"
    });
    assert.equal(Math.sign(worldSwingZ(interior.doors.exit)), config.expectedOutsideSide);
  }
});


test("zero-duration door animation finishes deterministically and can be reset", async () => {
  const street = buildExterior();
  const door = street.doors.houseA;

  await door.animateOpen(0);
  assert.equal(door.pivot.rotation.y, door.openAngle);
  assert.equal(door.collider.enabled, false);

  door.reset();
  assert.equal(door.pivot.rotation.y, 0);
  assert.equal(door.collider.enabled, true);
});
