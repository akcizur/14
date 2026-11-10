import test from "node:test";
import assert from "node:assert/strict";
import { createPedestrians } from "../src/world/pedestrians.js";

function makeDoor() {
  return {
    collider: { enabled: true },
    pivot: { rotation: { y: 0 } },
    animateOpen() { this.collider.enabled = false; return Promise.resolve(); },
    reset() { this.collider.enabled = true; this.pivot.rotation.y = 0; }
  };
}

test("street pedestrians include sidewalk walkers, benches and seated people", () => {
  const colliders = [];
  const pedestrians = createPedestrians({ colliders, random: () => 0.5 });

  assert.equal(pedestrians.walkers.length, 6);
  assert.equal(pedestrians.benches.length, 2);
  assert.equal(pedestrians.sitters.length, 2);
  assert.ok(pedestrians.walkers.every(agent => Math.abs(agent.root.position.z) === 4.9));
  assert.ok(pedestrians.walkers.every(agent => agent.collider.enabled));
  assert.equal(colliders.filter(item => item.name === "pedestrian-collider").length, 6);
  assert.equal(colliders.filter(item => item.name === "street-bench-collider").length, 2);

  pedestrians.dispose();
  assert.equal(colliders.length, 0);
});

test("walking pedestrians move along the sidewalk and animate their limbs", () => {
  const pedestrians = createPedestrians({ random: () => 0.5 });
  const agent = pedestrians.walkers[0];
  const before = {
    x: agent.root.position.x,
    z: agent.root.position.z,
    leg: agent.root.userData.legs[0].rotation.x,
    colliderX: agent.collider.minX
  };

  pedestrians.update(0.05, true);

  assert.notEqual(agent.root.position.x, before.x);
  assert.equal(agent.root.position.z, before.z);
  assert.notEqual(agent.root.userData.legs[0].rotation.x, before.leg);
  assert.ok(Math.abs(agent.collider.minX - (agent.root.position.x - 0.22)) < 1e-9);

  const pausedX = agent.root.position.x;
  pedestrians.update(0.05, false);
  assert.equal(agent.root.position.x, pausedX);
  pedestrians.dispose();
});

test("pedestrians wait for approaching traffic before entering a crossing", () => {
  const traffic = {
    vehicles: [{
      root: { position: { x: -2 } },
      lane: { direction: 1 },
      length: 4.5,
      speed: 8
    }]
  };
  const pedestrians = createPedestrians({ traffic, random: () => 0.5 });

  assert.equal(pedestrians.isCrossingSafe(0, 1.3), false);
  traffic.vehicles[0].root.position.x = -30;
  assert.equal(pedestrians.isCrossingSafe(0, 1.3), true);

  pedestrians.dispose();
});
