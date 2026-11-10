import test from "node:test";
import assert from "node:assert/strict";
import { SceneManager } from "../src/scenes/scene-manager.js";

function createFixture() {
  const root = { add() {}, remove() {} };
  const state = { transitioning: false, paused: false };
  const controller = {
    player: { x: 0, z: 0, yaw: 0, pitch: -0.04 },
    currentWorld: null,
    setWorld(world) { this.currentWorld = world; },
    setSpawn(spawn) {
      if (!spawn || spawn.blocked) return false;
      Object.assign(this.player, spawn);
      return true;
    }
  };
  const opened = [];
  const door = id => ({
    async animateOpen() { opened.push("open:" + id); },
    reset() { opened.push("reset:" + id); }
  });
  const manager = new SceneManager({ root, controller, state });
  manager.fade = async () => {};
  manager.register({
    id: "street",
    group: { visible: false },
    colliders: ["street-colliders"],
    interactables: ["street-interactions"],
    navigation: { bounds: { minX: -20, maxX: 20, minZ: -20, maxZ: 20 } },
    doors: { houseA: door("street-A"), houseB: door("street-B") },
    spawns: {
      start: { x: 0, z: 0, yaw: 0 },
      outsideHouseA: { x: 0, z: -10.2, yaw: Math.PI },
      outsideHouseB: { x: 0, z: 10.2, yaw: 0 }
    }
  });
  manager.register({
    id: "houseA",
    group: { visible: false },
    colliders: ["house-A-colliders"],
    interactables: ["house-A-interactions"],
    navigation: { bounds: { minX: -5, maxX: 5, minZ: -22, maxZ: -12 } },
    doors: { exit: door("inside-A") },
    spawns: { entry: { x: 0, z: -13.6, yaw: 0 } }
  });
  manager.register({
    id: "houseB",
    group: { visible: false },
    colliders: ["house-B-colliders"],
    interactables: ["house-B-interactions"],
    navigation: { bounds: { minX: -5, maxX: 5, minZ: 12, maxZ: 22 } },
    doors: { exit: door("inside-B") },
    spawns: { entry: { x: 0, z: 13.6, yaw: Math.PI } }
  });
  return { manager, controller, state, opened };
}

test("entering House A selects the inside-facing spawn", async () => {
  const { manager, controller } = createFixture();
  manager.activate("street", "start");
  assert.equal(await manager.transition("houseA", "houseA", "entry"), true);
  assert.deepEqual(controller.player, { x: 0, z: -13.6, yaw: 0, pitch: -0.04 });
  assert.equal(manager.currentId, "houseA");
});

test("leaving House A returns outside the same door facing toward the street", async () => {
  const { manager, controller } = createFixture();
  manager.activate("street", "start");
  await manager.transition("houseA", "houseA", "entry");
  assert.equal(await manager.transition("street", "exit", "outsideHouseA"), true);
  assert.deepEqual(controller.player, { x: 0, z: -10.2, yaw: Math.PI, pitch: -0.04 });
  assert.equal(manager.currentId, "street");
});

test("entering and leaving House B preserve the opposite orientation", async () => {
  const { manager, controller } = createFixture();
  manager.activate("street", "start");
  assert.equal(await manager.transition("houseB", "houseB", "entry"), true);
  assert.deepEqual(controller.player, { x: 0, z: 13.6, yaw: Math.PI, pitch: -0.04 });
  assert.equal(await manager.transition("street", "exit", "outsideHouseB"), true);
  assert.deepEqual(controller.player, { x: 0, z: 10.2, yaw: 0, pitch: -0.04 });
});

test("an unknown destination spawn is rejected before opening the door", async () => {
  const { manager, opened } = createFixture();
  manager.activate("street", "start");
  await assert.rejects(
    manager.transition("houseA", "houseA", "missing"),
    /Missing spawn/
  );
  assert.deepEqual(opened, []);
});
