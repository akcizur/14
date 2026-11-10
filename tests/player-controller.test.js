import test from "node:test";
import assert from "node:assert/strict";
import { createPlayerController } from "../src/core/player-controller.js";

function createCamera() {
  return {
    position: { x: 0, y: 0, z: 0, set(x, y, z) { this.x = x; this.y = y; this.z = z; } },
    rotation: { x: 0, y: 0, z: 0, order: "XYZ" }
  };
}

test("W moves the player forward along negative Z", () => {
  const state = { started: true, paused: false };
  const controller = createPlayerController({ camera: createCamera(), state });
  controller.keysDown.KeyW = true;
  controller.update(1 / 30);
  assert.ok(controller.player.z < 0);
});

test("solid AABB colliders block movement", () => {
  const state = { started: true, paused: false };
  const controller = createPlayerController({
    camera: createCamera(), state,
    colliders: [{ name: "wall", minX: -2, maxX: 2, minZ: -1, maxZ: 1 }]
  });
  controller.setSpawn({ x: 0, z: 1.35, yaw: 0 });
  controller.keysDown.KeyW = true;
  for (let i = 0; i < 30; i += 1) controller.update(1 / 30);
  assert.ok(controller.player.z >= 1.28);
});

test("diagonal digital movement is normalized", () => {
  const state = { started: true, paused: false };
  const controller = createPlayerController({ camera: createCamera(), state });
  controller.keysDown.KeyW = true;
  controller.keysDown.KeyD = true;
  controller.update(1 / 30);
  const distance = Math.hypot(controller.player.x, controller.player.z);
  assert.ok(distance <= 3.6 / 30 + 1e-9);
  assert.ok(distance > 0);
});

test("jump returns to the ground", () => {
  const state = { started: true, paused: false };
  const controller = createPlayerController({ camera: createCamera(), state });
  assert.equal(controller.jump(), true);
  for (let i = 0; i < 120; i += 1) controller.update(1 / 60);
  assert.equal(controller.isGrounded, true);
  assert.equal(controller.player.jumpHeight, 0);
});

test("paused state prevents movement", () => {
  const state = { started: true, paused: true };
  const controller = createPlayerController({ camera: createCamera(), state });
  controller.keysDown.KeyW = true;
  controller.update(1 / 30);
  assert.equal(controller.player.z, 0);
});

test("setWorld replaces colliders and interaction points without recreating the controller", () => {
  const state = { started: true, paused: false };
  const controller = createPlayerController({ camera: createCamera(), state });
  controller.setWorld({
    colliders: [{ name: "new-wall", minX: -1, maxX: 1, minZ: -1, maxZ: 1 }],
    interactables: [{ id: "door", x: 0, z: 1.35, range: 3, prompt: "ENTER" }],
    navigation: { bounds: { minX: -4, maxX: 4, minZ: -4, maxZ: 4 } }
  });
  assert.equal(controller.setSpawn({ x: 0, z: 1.35, yaw: 0 }), true);
  assert.equal(controller.update(1 / 60)?.id, "door");
  controller.keysDown.KeyW = true;
  controller.update(1 / 30);
  assert.equal(controller.player.z, 1.35);
});

test("interactions requiring facing only appear in front of the player", () => {
  const state = { started: true, paused: false };
  const controller = createPlayerController({ camera: createCamera(), state });
  controller.setWorld({ interactables: [{
    id: "front-door", x: 0, z: -1.5, range: 2,
    requiresFacing: true, facingThreshold: 0.2
  }] });
  controller.setSpawn({ x: 0, z: 0, yaw: 0 });
  assert.equal(controller.update(1 / 60)?.id, "front-door");
  controller.player.yaw = Math.PI;
  assert.equal(controller.update(1 / 60), null);
});

test("transition state locks movement and interaction", () => {
  const state = { started: true, paused: false, transitioning: true };
  const controller = createPlayerController({ camera: createCamera(), state });
  controller.keysDown.KeyW = true;
  controller.update(1 / 30);
  assert.equal(controller.player.z, 0);
  assert.equal(controller.jump(), false);
  assert.equal(controller.doInteract(), false);
});
