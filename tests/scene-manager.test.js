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


test("a blocked destination rolls the scene, world data and spawn back atomically", async () => {
  const { manager, controller, state } = createFixture();
  manager.activate("street", "start");
  const street = manager.locations.get("street");
  const houseA = manager.locations.get("houseA");
  houseA.spawns.entry.blocked = true;

  await assert.rejects(
    manager.transition("houseA", "houseA", "entry"),
    /blocked/
  );

  assert.equal(manager.currentId, "street");
  assert.equal(street.group.visible, true);
  assert.equal(houseA.group.visible, false);
  assert.equal(controller.currentWorld.colliders[0], "street-colliders");
  assert.deepEqual(controller.player, { x: 0, z: 0, yaw: 0, pitch: -0.04 });
  assert.equal(state.transitioning, false);
});

test("a door animation error restores the closed door and transition lock", async () => {
  const { manager, controller, state, opened } = createFixture();
  manager.activate("street", "start");
  const door = manager.locations.get("street").doors.houseA;
  door.animateOpen = async () => {
    opened.push("failed-open");
    throw new Error("animation failure");
  };

  await assert.rejects(
    manager.transition("houseA", "houseA", "entry"),
    /animation failure/
  );

  assert.deepEqual(opened, ["failed-open", "reset:street-A"]);
  assert.equal(manager.currentId, "street");
  assert.equal(controller.player.z, 0);
  assert.equal(state.transitioning, false);
});

test("transitions are rejected while paused or already transitioning", async () => {
  const { manager, state, opened } = createFixture();
  manager.activate("street", "start");

  state.paused = true;
  assert.equal(await manager.transition("houseA", "houseA", "entry"), false);
  state.paused = false;

  state.transitioning = true;
  assert.equal(await manager.transition("houseA", "houseA", "entry"), false);
  assert.deepEqual(opened, []);
});


test("failed direct activation restores the previous world and player spawn", () => {
  const { manager, controller } = createFixture();
  manager.activate("street", "start");
  controller.setSpawn({ x: 2, z: 3, yaw: 0.5, pitch: -0.2 });

  const houseA = manager.locations.get("houseA");
  houseA.spawns.entry.blocked = true;

  assert.throws(
    () => manager.activate("houseA", "entry"),
    /Invalid or obstructed spawn/
  );

  assert.equal(manager.currentId, "street");
  assert.equal(manager.locations.get("street").group.visible, true);
  assert.equal(houseA.group.visible, false);
  assert.equal(controller.currentWorld.colliders[0], "street-colliders");
  assert.deepEqual(controller.player, { x: 2, z: 3, yaw: 0.5, pitch: -0.2 });
});


test("a partial world-data switch restores the source scene before rejecting", async () => {
  const { manager, controller, state } = createFixture();
  manager.activate("street", "start");
  const originalSetWorld = controller.setWorld.bind(controller);
  controller.setWorld = world => {
    if (world.colliders?.[0] === "house-A-colliders") {
      throw new Error("world switch failure");
    }
    originalSetWorld(world);
  };

  await assert.rejects(
    manager.transition("houseA", "houseA", "entry"),
    /world switch failure/
  );

  assert.equal(manager.currentId, "street");
  assert.equal(manager.locations.get("street").group.visible, true);
  assert.equal(manager.locations.get("houseA").group.visible, false);
  assert.equal(controller.currentWorld.colliders[0], "street-colliders");
  assert.deepEqual(controller.player, { x: 0, z: 0, yaw: 0, pitch: -0.04 });
  assert.equal(state.transitioning, false);
});

test("door transition moves through the open doorway and switches worlds mid-passage", async () => {
  const { manager, controller } = createFixture();
  manager.activate("street", "start");
  const street = manager.locations.get("street");
  const house = manager.locations.get("houseA");
  const previousSetSpawn = controller.setSpawn.bind(controller);
  let midpointWorld = null;
  controller.setTransitionPose = pose => {
    Object.assign(controller.player, pose);
    return true;
  };
  manager.animatePassage = async (from, to, onMidpoint) => {
    assert.deepEqual(from, { x: 0, z: 0, yaw: 0, pitch: -0.04 });
    assert.deepEqual(to, house.spawns.entry);
    assert.equal(street.group.visible, true);
    assert.equal(house.group.visible, false);
    onMidpoint();
    midpointWorld = controller.currentWorld.colliders[0];
    assert.equal(street.group.visible, false);
    assert.equal(house.group.visible, true);
    controller.setTransitionPose(to);
  };
  controller.setSpawn = spawn => {
    const success = previousSetSpawn(spawn);
    return success;
  };

  assert.equal(await manager.transition("houseA", "houseA", "entry"), true);
  assert.equal(midpointWorld, "house-A-colliders");
  assert.equal(controller.player.z, -13.6);
  assert.equal(manager.currentId, "houseA");
});

test("side approach is aligned to the door opening before the scene switches", async () => {
  const { manager, controller } = createFixture();
  const door = manager.locations.get("street").doors.houseA;
  door.pivot = { parent: { position: { x: 0, z: -12 } } };

  const frames = [];
  const originalRaf = globalThis.requestAnimationFrame;
  globalThis.requestAnimationFrame = callback => {
    frames.push(callback);
    return frames.length;
  };

  const observations = [];
  let switched = false;
  let midpoint = null;
  controller.setTransitionPose = pose => {
    Object.assign(controller.player, pose);
    observations.push({ x: pose.x, z: pose.z, switched });
    return true;
  };

  const from = { x: 2, z: -10.2, yaw: 0, pitch: -0.04 };
  const to = { x: 0, z: -13.6, yaw: 0, pitch: -0.04 };
  const start = performance.now();
  try {
    const transition = manager.animatePassage(from, to, () => {
      midpoint = { x: controller.player.x, z: controller.player.z };
      switched = true;
    }, 620, door);

    for (const offset of [0, 100, 200, 300, 400, 500, 700]) {
      const nextFrame = frames.shift();
      assert.equal(typeof nextFrame, "function", "animation should schedule the next frame");
      nextFrame(start + offset);
    }
    await transition;
  } finally {
    if (originalRaf) globalThis.requestAnimationFrame = originalRaf;
    else delete globalThis.requestAnimationFrame;
  }

  assert.deepEqual(midpoint, { x: 0, z: -12 });
  const beforeCrossing = observations.filter(entry => !entry.switched);
  assert.ok(beforeCrossing.every(entry => entry.z >= -12 - 1e-9));
  const afterCrossing = observations.filter(entry => entry.switched);
  assert.ok(afterCrossing.some(entry => entry.z < -12));
  assert.equal(controller.player.x, 0);
  assert.equal(controller.player.z, -13.6);
});
