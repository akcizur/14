import test from "node:test";
import assert from "node:assert/strict";
import { combineAnalogSources, getGamepadButtonEdges } from "../src/core/input-controller.js";

test("touch joystick input remains active when the gamepad has no movement input", () => {
  const combined = combineAnalogSources(
    { x: 0.42, y: -0.7 },
    { x: 0, y: 0 }
  );
  assert.deepEqual(combined, { x: 0.42, y: -0.7 });
});

test("analogue inputs are combined and normalized without changing direction", () => {
  const combined = combineAnalogSources(
    { x: 0.8, y: 0.2 },
    { x: 0.8, y: 0.2 }
  );
  assert.ok(Math.abs(Math.hypot(combined.x, combined.y) - 1) < 1e-12);
  assert.ok(combined.x > 0 && combined.y > 0);
});

test("gamepad pause and action buttons only trigger on a press edge", () => {
  const released = [{ pressed: false }, { pressed: false }];
  const pressed = [{ pressed: true }, { pressed: true }];
  assert.deepEqual(getGamepadButtonEdges(pressed, [false, false]), [true, true]);
  assert.deepEqual(getGamepadButtonEdges(pressed, [true, true]), [false, false]);
  assert.deepEqual(getGamepadButtonEdges(released, [true, true]), [false, false]);
  assert.deepEqual(getGamepadButtonEdges(pressed, [false, false]), [true, true]);
});

test("empty gamepad snapshots are safe", () => {
  assert.deepEqual(getGamepadButtonEdges([], []), []);
});
