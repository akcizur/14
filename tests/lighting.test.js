import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createWorldEnvironment, createWorldLighting, configureWorldRenderer } from "../src/world/lighting.js";

test("environment map is a browser-independent equirectangular texture", () => {
  const environment = createWorldEnvironment({ width: 64, height: 32 });
  assert.ok(environment instanceof THREE.DataTexture);
  assert.equal(environment.mapping, THREE.EquirectangularReflectionMapping);
  assert.equal(environment.colorSpace, THREE.SRGBColorSpace);
  assert.equal(environment.image.data.length, 64 * 32 * 4);
  environment.dispose();
});

test("world lighting adds balanced ambient fill, directional sun and environment", () => {
  const scene = new THREE.Scene();
  const lighting = createWorldLighting(scene);

  assert.equal(scene.environment, lighting.environment);
  assert.equal(scene.background, lighting.environment);
  assert.ok(scene.environmentIntensity > 0 && scene.environmentIntensity < 1);
  assert.ok(scene.children.includes(lighting.ambient));
  assert.ok(scene.children.includes(lighting.sun));
  assert.equal(lighting.sun.castShadow, true);
  assert.ok(lighting.ambient.intensity > 0 && lighting.ambient.intensity < 1);
  assert.ok(lighting.sun.intensity > 1);
  assert.equal(lighting.sun.shadow.mapSize.width, 2048);

  lighting.dispose();
  assert.equal(scene.environment, null);
  assert.equal(scene.background, null);
  assert.equal(scene.children.includes(lighting.sun), false);
});

test("renderer configuration caps pixel ratio and uses cinematic color management", () => {
  const renderer = {
    shadowMap: {},
    setPixelRatio(value) { this.pixelRatio = value; }
  };

  configureWorldRenderer(renderer, 3);
  assert.equal(renderer.pixelRatio, 1.75);
  assert.equal(renderer.outputColorSpace, THREE.SRGBColorSpace);
  assert.equal(renderer.toneMapping, THREE.ACESFilmicToneMapping);
  assert.equal(renderer.shadowMap.enabled, true);
  assert.equal(renderer.shadowMap.type, THREE.PCFSoftShadowMap);
  assert.ok(renderer.toneMappingExposure > 0);
});
