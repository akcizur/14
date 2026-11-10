import test from "node:test";
import assert from "node:assert/strict";
import { buildExterior } from "../src/world/exterior.js";
import { buildHouseA } from "../src/interiors/house-a.js";
import { buildHouseB } from "../src/interiors/house-b.js";
import { createPlayerController } from "../src/core/player-controller.js";

function createCamera() {
  return {
    position: { x: 0, y: 0, z: 0, set(x, y, z) { this.x = x; this.y = y; this.z = z; } },
    rotation: { x: 0, y: 0, z: 0, order: "XYZ" }
  };
}

test("approaching either exterior door exposes E and starts the correct house transition", () => {
  const calls = [];
  const street = buildExterior({
    onDoorInteract: (...args) => calls.push(args)
  });
  const interactionErrors = [];
  const controller = createPlayerController({
    camera: createCamera(),
    state: { started: true, paused: false, transitioning: false },
    ui: { showToast: message => interactionErrors.push(message) }
  });
  controller.setWorld({
    colliders: street.colliders,
    interactables: street.interactables,
    navigation: street.navigation
  });

  for (const entry of [
    { house: "houseA", doorId: "houseA", yaw: 0, targetZ: -12 },
    { house: "houseB", doorId: "houseB", yaw: Math.PI, targetZ: 12 }
  ]) {
    assert.equal(controller.setSpawn({ x: 0, z: 0, yaw: entry.yaw }), true);
    controller.keysDown.KeyW = true;
    for (let i = 0; i < 180; i += 1) controller.update(1 / 30);
    controller.keysDown.KeyW = false;

    const nearby = controller.update(1 / 60);
    assert.ok(nearby, entry.house + " should expose a door prompt");
    assert.match(nearby.prompt, /VSTOUPIT/);
    assert.equal(typeof nearby.action, "function");
    const interacted = controller.doInteract();
    assert.equal(interacted, true, interactionErrors.join("; ") || "doInteract returned false");
    assert.deepEqual(calls.at(-1), [entry.house, entry.doorId, "entry"]);
  }
});

test("both interior exit doors expose E immediately inside and target the matching street spawn", () => {
  const calls = [];
  const cases = [
    {
      build: buildHouseA,
      spawn: { x: 0, z: -13.6, yaw: 0 },
      expected: ["street", "exit", "outsideHouseA"]
    },
    {
      build: buildHouseB,
      spawn: { x: 0, z: 13.6, yaw: Math.PI },
      expected: ["street", "exit", "outsideHouseB"]
    }
  ];

  for (const entry of cases) {
    const interior = entry.build({
      onExit: (...args) => calls.push(args)
    });
    const controller = createPlayerController({
      camera: createCamera(),
      state: { started: true, paused: false, transitioning: false }
    });
    controller.setWorld({
      colliders: interior.colliders,
      interactables: interior.interactables,
      navigation: interior.navigation
    });
    assert.equal(controller.setSpawn(entry.spawn), true);

    const nearby = controller.update(1 / 60);
    assert.ok(nearby, "exit prompt should be available inside the room");
    assert.match(nearby.prompt, /ODEJÍT/);
    assert.equal(controller.doInteract(), true);
    assert.deepEqual(calls.at(-1), entry.expected);
  }
});

test("street entry prompts stay behind the player after exiting and appear when they turn back", () => {
  const street = buildExterior();
  const controller = createPlayerController({
    camera: createCamera(),
    state: { started: true, paused: false, transitioning: false }
  });
  controller.setWorld({
    colliders: street.colliders,
    interactables: street.interactables,
    navigation: street.navigation
  });

  const cases = [
    { spawn: street.spawns.outsideHouseA, id: "enter-house-a", towardDoorYaw: 0 },
    { spawn: street.spawns.outsideHouseB, id: "enter-house-b", towardDoorYaw: Math.PI }
  ];

  for (const entry of cases) {
    assert.equal(controller.setSpawn(entry.spawn), true);
    assert.equal(controller.update(1 / 60), null, entry.id + " must stay behind the player after exit");

    controller.player.yaw = entry.towardDoorYaw;
    assert.equal(controller.update(1 / 60)?.id, entry.id, entry.id + " should appear when facing the door");
  }
});
