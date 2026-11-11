import test from "node:test";
import assert from "node:assert/strict";
import { GTAO_TUNING, createWorldPostProcessing } from "../src/world/postprocessing.js";

test("GTAO uses denoised contact occlusion with mobile-aware sample counts", () => {
  assert.equal(GTAO_TUNING.screenSpaceRadius, true);
  assert.ok(GTAO_TUNING.blendIntensity > 0.5 && GTAO_TUNING.blendIntensity < 1);
  assert.ok(GTAO_TUNING.radius > 0 && GTAO_TUNING.radius < 1);
  assert.equal(GTAO_TUNING.samples, 8);
  assert.equal(GTAO_TUNING.denoiseSamples, 8);
});

test("postprocessing rejects an incomplete renderer setup", () => {
  assert.throws(() => createWorldPostProcessing({}, {}, {}), TypeError);
});
