import * as THREE from "three";

function mix(a, b, amount) {
  return a + (b - a) * amount;
}

function smoothstep(a, b, value) {
  const t = Math.max(0, Math.min(1, (value - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

export function createWorldEnvironment({ width = 256, height = 128 } = {}) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 32 || height < 16) {
    throw new RangeError("Environment map dimensions must be sensible positive integers.");
  }

  const pixels = new Uint8Array(width * height * 4);
  const skyTop = [91, 119, 139];
  const skyHorizon = [190, 190, 181];
  const groundHorizon = [124, 119, 106];
  const groundBottom = [45, 50, 48];

  for (let y = 0; y < height; y += 1) {
    const v = y / (height - 1);
    const aboveHorizon = 1 - smoothstep(0.38, 0.56, v);
    const belowHorizon = smoothstep(0.44, 0.72, v);
    const verticalAmount = v < 0.5
      ? smoothstep(0, 0.5, v)
      : smoothstep(0.5, 1, v);

    for (let x = 0; x < width; x += 1) {
      const u = x / width;
      const index = (y * width + x) * 4;
      const sunDistance = Math.hypot((u - 0.73) * 1.7, (v - 0.36) * 2.2);
      const sunGlow = Math.exp(-sunDistance * 7.5) * 0.2;
      const sunCore = Math.max(0, 1 - sunDistance * 52);

      for (let channel = 0; channel < 3; channel += 1) {
        const sky = mix(skyTop[channel], skyHorizon[channel], verticalAmount);
        const ground = mix(groundHorizon[channel], groundBottom[channel], smoothstep(0.48, 1, v));
        let value = mix(ground, sky, aboveHorizon);
        value = mix(value, skyHorizon[channel] + 16, sunGlow);
        value = mix(value, [255, 245, 222][channel], sunCore * 0.9);
        pixels[index + channel] = Math.round(Math.max(0, Math.min(255, value)));
      }
      pixels[index + 3] = 255;
    }
  }

  const texture = new THREE.DataTexture(pixels, width, height, THREE.RGBAFormat);
  texture.name = "residential-world-equirectangular-environment";
  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

export function configureWorldRenderer(renderer, pixelRatio = 1) {
  if (!renderer?.shadowMap || typeof renderer.setPixelRatio !== "function") {
    throw new TypeError("configureWorldRenderer requires a Three.js WebGLRenderer.");
  }

  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.04;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setPixelRatio(Math.max(1, Math.min(Number(pixelRatio) || 1, 1.75)));
  return renderer;
}

export function createWorldLighting(scene) {
  if (!scene?.add) throw new TypeError("createWorldLighting requires a Three.js scene.");

  const environment = createWorldEnvironment();
  scene.environment = environment;
  scene.environmentIntensity = 0.42;

  const ambient = new THREE.HemisphereLight(0xe6edf0, 0x57584d, 1.25);
  ambient.name = "world-soft-sky-fill";
  scene.add(ambient);

  const sun = new THREE.DirectionalLight(0xffedcf, 2.65);
  sun.name = "world-sunlight";
  sun.position.set(-24, 38, 20);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -39;
  sun.shadow.camera.right = 39;
  sun.shadow.camera.top = 39;
  sun.shadow.camera.bottom = -39;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 100;
  sun.shadow.bias = -0.00016;
  sun.shadow.normalBias = 0.024;
  sun.shadow.radius = 3;
  sun.target.position.set(0, 0, 0);
  scene.add(sun, sun.target);

  return {
    environment,
    ambient,
    sun,
    dispose() {
      scene.remove(ambient, sun, sun.target);
      scene.environment = null;
      environment.dispose();
    }
  };
}
