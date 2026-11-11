import * as THREE from "three";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";

function mix(a, b, amount) {
  return a + (b - a) * amount;
}

function smoothstep(a, b, value) {
  const t = Math.max(0, Math.min(1, (value - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

function hash2(x, y, seed = 0) {
  let value = Math.imul(x ^ seed, 374761393) + Math.imul(y + seed, 668265263);
  value = Math.imul(value ^ (value >>> 13), 1274126177);
  return ((value ^ (value >>> 16)) >>> 0) / 4294967295;
}

function periodicNoise(u, v, scaleX, scaleY, seed) {
  const x = u * scaleX;
  const y = v * scaleY;
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const wrap = value => ((value % scaleX) + scaleX) % scaleX;
  const a = hash2(wrap(x0), y0, seed);
  const b = hash2(wrap(x0 + 1), y0, seed);
  const c = hash2(wrap(x0), y0 + 1, seed);
  const d = hash2(wrap(x0 + 1), y0 + 1, seed);
  const top = mix(a, b, sx);
  const bottom = mix(c, d, sx);
  return mix(top, bottom, sy);
}

export function createWorldEnvironment({ width = 512, height = 256 } = {}) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 32 || height < 16) {
    throw new RangeError("Environment map dimensions must be sensible positive integers.");
  }

  const pixels = new Uint8Array(width * height * 4);
  const skyTop = [112, 146, 166];
  const skyHorizon = [204, 207, 199];
  const cloudLight = [239, 239, 230];
  const cloudShade = [168, 181, 187];
  const groundHorizon = [133, 130, 119];
  const groundBottom = [48, 53, 51];

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
      const cloudFade = smoothstep(0.025, 0.13, v) * (1 - smoothstep(0.42, 0.56, v));
      const broadCloud = periodicNoise(u, v, 5, 3, 71) * 0.55
        + periodicNoise(u, v, 11, 7, 113) * 0.3
        + periodicNoise(u, v, 23, 13, 191) * 0.15;
      const cloudCoverage = smoothstep(0.54, 0.76, broadCloud) * cloudFade;
      const cloudUnderside = 1 - smoothstep(0.58, 0.92, broadCloud);

      for (let channel = 0; channel < 3; channel += 1) {
        const sky = mix(skyTop[channel], skyHorizon[channel], verticalAmount);
        const ground = mix(groundHorizon[channel], groundBottom[channel], smoothstep(0.48, 1, v));
        let value = mix(ground, sky, aboveHorizon);
        const cloudColor = mix(cloudShade[channel], cloudLight[channel], 1 - cloudUnderside * 0.34);
        value = mix(value, cloudColor, cloudCoverage * aboveHorizon * 0.82);
        value = mix(value, skyHorizon[channel] + 16, sunGlow);
        value = mix(value, [255, 247, 229][channel], sunCore * 0.9);
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
  renderer.toneMappingExposure = 1.06;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setPixelRatio(Math.max(1, Math.min(Number(pixelRatio) || 1, 1.75)));
  return renderer;
}

export function createWorldLighting(scene, renderer = null) {
  if (!scene?.add) throw new TypeError("createWorldLighting requires a Three.js scene.");

  const previousBackground = scene.background;
  const previousEnvironment = scene.environment;
  const previousEnvironmentIntensity = scene.environmentIntensity;
  const previousBackgroundBlurriness = scene.backgroundBlurriness;
  let fallbackEnvironment = createWorldEnvironment();
  let hdriTexture = null;
  let environmentTarget = null;
  let pmremGenerator = null;

  scene.environment = fallbackEnvironment;
  scene.background = fallbackEnvironment;
  scene.backgroundBlurriness = 0;
  scene.environmentIntensity = 0.24;

  const ambient = new THREE.HemisphereLight(0xdce8ee, 0x605b4d, 0.78);
  ambient.name = "world-natural-sky-fill";
  scene.add(ambient);

  const sun = new THREE.DirectionalLight(0xfff0dc, 1.85);
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
  sun.shadow.bias = -0.00012;
  sun.shadow.normalBias = 0.022;
  sun.shadow.radius = 4;
  sun.target.position.set(0, 0, 0);
  scene.add(sun, sun.target);

  let disposed = false;
  let hdriReady = Promise.resolve(false);
  if (renderer?.isWebGLRenderer) {
    pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();
    hdriReady = fetch("/assets/pbr/manifest.json", { cache: "force-cache" })
      .then(response => {
        if (!response.ok) throw new Error("PBR manifest unavailable: " + response.status);
        return response.json();
      })
      .then(manifest => {
        const url = manifest?.hdri?.url;
        if (!url) throw new Error("The PBR manifest has no HDRI URL.");
        return new RGBELoader().loadAsync(url);
      })
      .then(texture => {
        if (disposed) {
          texture.dispose();
          return false;
        }
        hdriTexture = texture;
        hdriTexture.mapping = THREE.EquirectangularReflectionMapping;
        environmentTarget = pmremGenerator.fromEquirectangular(hdriTexture);
        scene.background = hdriTexture;
        scene.environment = environmentTarget.texture;
        scene.backgroundBlurriness = 0;
        scene.environmentIntensity = 0.72;
        fallbackEnvironment?.dispose();
        fallbackEnvironment = null;
        pmremGenerator.dispose();
        pmremGenerator = null;
        return true;
      })
      .catch(error => {
        console.warn("[Lighting] HDRI unavailable; using the procedural daylight fallback.", error);
        pmremGenerator?.dispose();
        pmremGenerator = null;
        return false;
      });
  }

  return {
    get environment() { return environmentTarget?.texture ?? fallbackEnvironment; },
    ambient,
    sun,
    hdriReady,
    dispose() {
      disposed = true;
      scene.remove(ambient, sun, sun.target);
      scene.environment = previousEnvironment ?? null;
      scene.background = previousBackground ?? null;
      scene.environmentIntensity = previousEnvironmentIntensity;
      scene.backgroundBlurriness = previousBackgroundBlurriness ?? 0;
      environmentTarget?.dispose();
      hdriTexture?.dispose();
      fallbackEnvironment?.dispose();
      pmremGenerator?.dispose();
    }
  };
}
