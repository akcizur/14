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

test("closed door leaf overlaps the frame opening on every edge without visible gaps", () => {
  const street = buildExterior();
  for (const id of ["house-a-front-door", "house-b-front-door"]) {
    const door = street.doors[id === "house-a-front-door" ? "houseA" : "houseB"];
    const leaf = door.pivot.getObjectByName(id + "-door-leaf");
    assert.ok(leaf, id + " must have a door leaf");

    const left = door.pivot.position.x + leaf.position.x - leaf.geometry.parameters.width / 2;
    const right = door.pivot.position.x + leaf.position.x + leaf.geometry.parameters.width / 2;
    const bottom = leaf.position.y - leaf.geometry.parameters.height / 2;
    const top = leaf.position.y + leaf.geometry.parameters.height / 2;

    // The frame opening is X -0.58..0.58, with its head starting at Y 2.10.
    assert.ok(left < -0.58, id + " must overlap the left jamb");
    assert.ok(right > 0.58, id + " must overlap the right jamb");
    assert.ok(bottom < 0.03, id + " must overlap the threshold");
    assert.ok(top > 2.10, id + " must overlap the head frame");
    assert.equal(door.collider.enabled, true);
  }
});
