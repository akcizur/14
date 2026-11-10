import test from "node:test";
import assert from "node:assert/strict";
import { createTraffic } from "../src/world/traffic.js";

test("street traffic starts with cars and trucks in two opposing lanes", () => {
  const colliders = [];
  const traffic = createTraffic({ colliders, random: () => 0.5 });

  assert.equal(traffic.vehicles.length, 4);
  assert.equal(traffic.vehicles.filter(vehicle => vehicle.type === "car").length, 2);
  assert.equal(traffic.vehicles.filter(vehicle => vehicle.type === "truck").length, 2);
  assert.deepEqual(traffic.lanes.map(lane => lane.direction), [1, -1]);
  assert.deepEqual(traffic.lanes.map(lane => lane.z), [-1.82, 1.82]);
  assert.equal(colliders.length, 4);

  traffic.dispose();
  assert.equal(traffic.vehicles.length, 0);
  assert.equal(colliders.length, 0);
});

test("vehicles travel in their lane direction and pause when the street is inactive", () => {
  const traffic = createTraffic({ random: () => 0.5 });
  const snapshots = traffic.vehicles.map(vehicle => ({
    vehicle,
    x: vehicle.root.position.x,
    minX: vehicle.collider.minX
  }));

  traffic.update(0.05, false);
  for (const snapshot of snapshots) {
    assert.equal(snapshot.vehicle.root.position.x, snapshot.x);
    assert.equal(snapshot.vehicle.collider.minX, snapshot.minX);
  }

  traffic.update(0.05, true);
  for (const snapshot of snapshots) {
    const { vehicle } = snapshot;
    const moved = vehicle.root.position.x - snapshot.x;
    assert.equal(Math.sign(moved), vehicle.lane.direction);
    assert.ok(Math.abs(moved) > 0.1);
    assert.ok(Math.abs(vehicle.collider.minX - (snapshot.minX + moved)) < 1e-9);

    assert.ok(vehicle.wheels.every(wheel => wheel.isGroup), "each wheel should have a shared axle pivot");
    for (const wheel of vehicle.wheels) {
      assert.ok(wheel.getObjectByName(vehicle.type === "car" ? "car-wheel-tire" : "truck-wheel-tire"));
      assert.ok(wheel.getObjectByName(vehicle.type === "car" ? "car-wheel-hub" : "truck-wheel-hub"));
      const expectedSpin = vehicle.speed * 0.05 / vehicle.wheelRadius;
      assert.ok(Math.abs(wheel.rotation.z - expectedSpin) < 1e-9);
    }
  }

  traffic.dispose();
});

test("randomized traffic spawns new vehicles without leaving the road lane", () => {
  const traffic = createTraffic({ random: () => 0.5 });
  for (let frame = 0; frame < 90; frame += 1) traffic.update(0.05, true);

  assert.ok(traffic.vehicles.length > 4);
  for (const vehicle of traffic.vehicles) {
    assert.ok(Math.abs(vehicle.root.position.z - vehicle.lane.z) < 1e-9);
    assert.equal(vehicle.root.userData.traffic.direction, vehicle.lane.direction);
    assert.ok(vehicle.collider.enabled);
  }

  traffic.dispose();
});
