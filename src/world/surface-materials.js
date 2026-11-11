import * as THREE from "three";

const SIZE = 256;
const textureCache = new Map();
const textureVariantCache = new Map();
const liveSurfaceMaterials = new Set();
const realTextureSources = new Map();
const externalVariants = new Set();
const clamp01 = value => Math.max(0, Math.min(1, value));

function hash2(x, y, seed = 0) {
  let value = Math.imul(x ^ seed, 374761393) + Math.imul(y + seed, 668265263);
  value = Math.imul(value ^ (value >>> 13), 1274126177);
  return ((value ^ (value >>> 16)) >>> 0) / 4294967295;
}

function smoothNoise(x, y, seed) {
  const x0 = Math.floor(x), y0 = Math.floor(y);
  const fx = x - x0, fy = y - y0;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const a = hash2(x0, y0, seed);
  const b = hash2(x0 + 1, y0, seed);
  const c = hash2(x0, y0 + 1, seed);
  const d = hash2(x0 + 1, y0 + 1, seed);
  const top = a + (b - a) * sx;
  const bottom = c + (d - c) * sx;
  return top + (bottom - top) * sy;
}

function fractalNoise(u, v, seed) {
  return (
    smoothNoise(u * 3, v * 3, seed) * 0.5 +
    smoothNoise(u * 9, v * 9, seed + 17) * 0.28 +
    smoothNoise(u * 27, v * 27, seed + 31) * 0.15 +
    smoothNoise(u * 81, v * 81, seed + 53) * 0.07
  );
}

function surfaceProfile(kind, u, v, seed) {
  const noise = fractalNoise(u, v, seed);
  let grain = 0;
  let relief = noise;
  let roughness = 0.84;

  switch (kind) {
    case "plaster": {
      const pores = hash2(Math.floor(u * 256), Math.floor(v * 256), seed + 7);
      grain = (noise - 0.5) * 0.16 + (pores > 0.986 ? -0.11 : 0);
      relief = noise * 0.68 + smoothNoise(u * 48, v * 48, seed + 9) * 0.32;
      roughness = 0.94;
      break;
    }
    case "concrete": {
      const aggregate = hash2(Math.floor(u * 192), Math.floor(v * 192), seed + 13);
      grain = (noise - 0.5) * 0.22 + (aggregate - 0.5) * 0.1;
      relief = noise * 0.52 + smoothNoise(u * 74, v * 74, seed + 21) * 0.48;
      roughness = 0.96;
      break;
    }
    case "asphalt": {
      const gravel = hash2(Math.floor(u * 220), Math.floor(v * 220), seed + 29);
      grain = (noise - 0.5) * 0.13 + (gravel - 0.5) * 0.14;
      relief = noise * 0.38 + gravel * 0.62;
      roughness = 0.98;
      break;
    }
    case "grass": {
      const blades = Math.sin((u * 47 + noise * 2.5) * Math.PI * 2) * 0.035;
      grain = (noise - 0.5) * 0.2 + blades;
      relief = noise * 0.7 + smoothNoise(u * 42, v * 42, seed + 5) * 0.3;
      roughness = 1;
      break;
    }
    case "wood":
    case "laminate": {
      const bands = Math.sin(v * 92 + noise * 8) * 0.045
        + Math.sin(v * 223 + noise * 13) * 0.018;
      const knotX = u - (0.22 + hash2(Math.floor(v * 5), 4, seed) * 0.58);
      const knotY = v - (0.18 + hash2(5, Math.floor(u * 4), seed + 4) * 0.64);
      const knot = Math.exp(-(knotX * knotX * 850 + knotY * knotY * 1800)) * 0.13;
      const plankSeam = kind === "laminate" && Math.abs((u * 4) % 1 - 0.5) > 0.486 ? -0.15 : 0;
      grain = bands - knot + (noise - 0.5) * 0.07 + plankSeam;
      relief = 0.52 + bands * 2.1 - knot + noise * 0.12;
      roughness = kind === "laminate" ? 0.68 : 0.9;
      break;
    }
    case "roof-tile": {
      const row = Math.floor(v * 11);
      const rowV = (v * 11) % 1;
      const offset = (row % 2) * 0.5;
      const colV = (u * 8 + offset) % 1;
      const edge = Math.min(colV, 1 - colV, rowV, 1 - rowV);
      const roundedBottom = Math.abs(rowV - (0.78 + 0.14 * Math.cos((colV - 0.5) * Math.PI)));
      const seam = edge < 0.035 || roundedBottom < 0.025 ? -0.25 : 0;
      const center = Math.sin(colV * Math.PI) * Math.sin(rowV * Math.PI);
      grain = seam + center * 0.075 + (noise - 0.5) * 0.07;
      relief = 0.42 + center * 0.44 + (noise - 0.5) * 0.12 + seam * 0.5;
      roughness = 0.9;
      break;
    }
    case "paving":
    case "ceramic": {
      const cells = kind === "paving" ? 5 : 4;
      const row = Math.floor(v * cells);
      const column = Math.floor(u * cells + (kind === "paving" ? (row % 2) * 0.5 : 0));
      const localU = (u * cells + (kind === "paving" ? (row % 2) * 0.5 : 0)) % 1;
      const localV = (v * cells) % 1;
      const seam = Math.min(localU, 1 - localU, localV, 1 - localV);
      const border = seam < (kind === "ceramic" ? 0.035 : 0.055) ? -0.22 : 0;
      const variation = hash2(column, row, seed + 11) - 0.5;
      grain = border + variation * 0.075 + (noise - 0.5) * 0.04;
      relief = 0.44 + variation * 0.12 + noise * 0.09 + border * 0.35;
      roughness = kind === "ceramic" ? 0.34 : 0.86;
      break;
    }
    case "fabric": {
      const warp = Math.sin(u * 256 * Math.PI) * 0.035;
      const weft = Math.sin(v * 256 * Math.PI) * 0.035;
      grain = warp + weft + (noise - 0.5) * 0.08;
      relief = 0.5 + warp + weft + noise * 0.12;
      roughness = 0.97;
      break;
    }
    case "metal": {
      const brush = Math.sin(v * 960 + noise * 4) * 0.018;
      grain = brush + (noise - 0.5) * 0.045;
      relief = 0.52 + brush * 0.7 + noise * 0.08;
      roughness = 0.52;
      break;
    }
    case "paint": {
      const flakes = hash2(Math.floor(u * 380), Math.floor(v * 380), seed + 37);
      grain = (noise - 0.5) * 0.045 + (flakes > 0.993 ? 0.08 : 0);
      relief = 0.5 + (noise - 0.5) * 0.14;
      roughness = 0.38;
      break;
    }
    case "rubber": {
      const tread = Math.sin(v * 78 * Math.PI) * 0.05;
      const fineGrain = Math.sin(u * 210 * Math.PI + noise * 4) * 0.018;
      grain = tread + fineGrain + (noise - 0.5) * 0.05;
      relief = 0.48 + tread * 1.5 + noise * 0.08;
      roughness = 0.96;
      break;
    }
    case "brick": {
      const row = Math.floor(v * 9);
      const localU = (u * 5 + (row % 2) * 0.5) % 1;
      const localV = (v * 9) % 1;
      const mortar = localU < 0.025 || localU > 0.975 || localV < 0.035;
      grain = (mortar ? -0.22 : 0.02) + (noise - 0.5) * 0.15;
      relief = (mortar ? 0.28 : 0.62) + noise * 0.17;
      roughness = 0.94;
      break;
    }
    default: {
      grain = (noise - 0.5) * 0.1;
      relief = noise;
      break;
    }
  }
  return { grain, relief: clamp01(relief), roughness };
}

function createDataTexture(data, kind, mapType) {
  const texture = new THREE.DataTexture(data, SIZE, SIZE, THREE.RGBAFormat);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.anisotropy = 8;
  texture.colorSpace = mapType === "color" ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  texture.needsUpdate = true;
  texture.name = kind + "-" + mapType;
  return texture;
}

function createMaps(kind, seed) {
  const colorData = new Uint8Array(SIZE * SIZE * 4);
  const roughnessData = new Uint8Array(SIZE * SIZE * 4);
  const heightData = new Uint8Array(SIZE * SIZE * 4);
  const normalData = new Uint8Array(SIZE * SIZE * 4);

  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      const index = (y * SIZE + x) * 4;
      const profile = surfaceProfile(kind, x / SIZE, y / SIZE, seed);
      const colorValue = Math.max(0, Math.min(255, Math.round(224 + profile.grain * 220)));
      const roughnessValue = Math.round(clamp01(profile.roughness + profile.grain * 0.12) * 255);
      const heightValue = Math.round(46 + profile.relief * 164);

      colorData[index] = colorData[index + 1] = colorData[index + 2] = colorValue;
      roughnessData[index] = roughnessData[index + 1] = roughnessData[index + 2] = roughnessValue;
      heightData[index] = heightData[index + 1] = heightData[index + 2] = heightValue;
      colorData[index + 3] = roughnessData[index + 3] = heightData[index + 3] = 255;
    }
  }

  // Derive a tangent-space normal map from the same height field. Sampling
  // wraps at the edges so the texture remains seamless when tiled.
  for (let y = 0; y < SIZE; y += 1) {
    const upY = (y - 1 + SIZE) % SIZE;
    const downY = (y + 1) % SIZE;
    for (let x = 0; x < SIZE; x += 1) {
      const leftX = (x - 1 + SIZE) % SIZE;
      const rightX = (x + 1) % SIZE;
      const sample = (sx, sy) => heightData[(sy * SIZE + sx) * 4] / 255;
      const dx = (sample(rightX, y) - sample(leftX, y)) * 1.65;
      const dy = (sample(x, downY) - sample(x, upY)) * 1.65;
      let nx = -dx;
      let ny = -dy;
      let nz = 1;
      const inverseLength = 1 / Math.hypot(nx, ny, nz);
      nx *= inverseLength;
      ny *= inverseLength;
      nz *= inverseLength;
      const index = (y * SIZE + x) * 4;
      normalData[index] = Math.round((nx * 0.5 + 0.5) * 255);
      normalData[index + 1] = Math.round((ny * 0.5 + 0.5) * 255);
      normalData[index + 2] = Math.round((nz * 0.5 + 0.5) * 255);
      normalData[index + 3] = 255;
    }
  }

  return {
    map: createDataTexture(colorData, kind, "color"),
    roughnessMap: createDataTexture(roughnessData, kind, "roughness"),
    bumpMap: createDataTexture(heightData, kind, "height"),
    normalMap: createDataTexture(normalData, kind, "normal")
  };
}

export function getSurfaceMaps(kind, repeatU = 2, repeatV = 2) {
  const name = String(kind || "plaster");
  const u = Math.max(0.1, Number(repeatU) || 2);
  const v = Math.max(0.1, Number(repeatV) || 2);
  const variantKey = name + ":" + u + ":" + v;
  if (!textureVariantCache.has(variantKey)) {
    if (!textureCache.has(name)) {
      const seed = name.split("").reduce((value, char) => Math.imul(value ^ char.charCodeAt(0), 16777619), 2166136261) >>> 0;
      textureCache.set(name, createMaps(name, seed));
    }
    const base = textureCache.get(name);
    const variant = Object.fromEntries(Object.entries(base).map(([key, texture]) => {
      const copy = texture.clone();
      copy.repeat.set(u, v);
      copy.needsUpdate = true;
      return [key, copy];
    }));
    textureVariantCache.set(variantKey, variant);
  }
  return textureVariantCache.get(variantKey);
}

function assetKeyForSurface(kind) {
  if (kind === "laminate") return "wood";
  return kind;
}

function createExternalVariant(source, repeatU, repeatV, colorMap = false) {
  const texture = source.clone();
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatU, repeatV);
  texture.colorSpace = colorMap ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  externalVariants.add(texture);
  return texture;
}

function applyRealTextureSet(material, sources) {
  const repeat = material.userData.surfaceRepeat || [2, 2];
  const [repeatU, repeatV] = repeat;
  const variants = [];

  const assign = (property, key, colorMap = false) => {
    const source = sources[key];
    if (!source) return;
    const texture = createExternalVariant(source, repeatU, repeatV, colorMap);
    material[property] = texture;
    variants.push(texture);
  };

  assign("map", "diffuse", true);
  assign("normalMap", "normal");
  assign("roughnessMap", "roughness");
  assign("aoMap", "ao");
  assign("bumpMap", "height");

  if (material.normalMap) material.normalScale.set(0.72, 0.72);
  if (material.aoMap) material.aoMapIntensity = 0.72;
  if (material.bumpMap) material.bumpScale = Math.min(material.userData.surfaceBumpScale ?? 0.025, 0.028);
  material.userData.externalTextureVariants = variants;
  material.userData.realPbr = true;
  material.needsUpdate = true;
}

export async function loadRealPbrMaterials({
  manifestUrl = "/assets/pbr/manifest.json",
  onProgress = null
} = {}) {
  if (typeof fetch !== "function") throw new Error("Real PBR assets require browser fetch support.");
  const response = await fetch(manifestUrl, { cache: "force-cache" });
  if (!response.ok) throw new Error("PBR manifest request failed: " + response.status);
  const manifest = await response.json();
  if (!manifest?.textures || manifest.source !== "Poly Haven") {
    throw new Error("PBR manifest is missing its Poly Haven texture definitions.");
  }

  const loader = new THREE.TextureLoader();
  const loadedKinds = [];
  for (const [kind, entry] of Object.entries(manifest.textures)) {
    try {
      const sources = {};
      for (const [mapName, record] of Object.entries(entry.maps || {})) {
        if (!record?.url) continue;
        const texture = await loader.loadAsync(record.url);
        texture.colorSpace = mapName === "diffuse" ? THREE.SRGBColorSpace : THREE.NoColorSpace;
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.magFilter = THREE.LinearFilter;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.generateMipmaps = true;
        texture.anisotropy = 8;
        sources[mapName] = texture;
      }
      if (!sources.diffuse || !sources.normal || !sources.roughness) {
        throw new Error("required diffuse, normal or roughness map is missing");
      }
      realTextureSources.set(kind, sources);
      for (const material of liveSurfaceMaterials) {
        if (assetKeyForSurface(material.userData.surfaceKind) === kind) {
          applyRealTextureSet(material, sources);
        }
      }
      loadedKinds.push(kind);
      onProgress?.({ kind, status: "loaded" });
    } catch (error) {
      onProgress?.({ kind, status: "failed", error });
      console.warn("[PBR] " + kind + " could not be loaded:", error);
    }
  }

  return {
    source: manifest.source,
    license: manifest.license,
    textures: loadedKinds,
    hdri: manifest.hdri?.url || null
  };
}

export function disposeSurfaceTextures() {
  for (const maps of textureVariantCache.values()) {
    for (const texture of Object.values(maps)) texture.dispose();
  }
  for (const maps of textureCache.values()) {
    for (const texture of Object.values(maps)) texture.dispose();
  }
  for (const texture of externalVariants) texture.dispose();
  for (const sources of realTextureSources.values()) {
    for (const texture of Object.values(sources)) texture.dispose();
  }
  for (const material of liveSurfaceMaterials) {
    material.userData.externalTextureVariants = [];
  }
  externalVariants.clear();
  realTextureSources.clear();
  liveSurfaceMaterials.clear();
  textureVariantCache.clear();
  textureCache.clear();
}

export function makeSurfaceMaterial(kind, color = 0xffffff, options = {}, repeat = [2, 2]) {
  const [repeatU, repeatV] = Array.isArray(repeat) ? repeat : [2, 2];
  const maps = getSurfaceMaps(kind, repeatU, repeatV);
  const { bumpScale = 0.035, ...materialOptions } = options;
  const material = new THREE.MeshStandardMaterial({
    color,
    map: maps.map,
    roughnessMap: maps.roughnessMap,
    bumpMap: maps.bumpMap,
    normalMap: maps.normalMap,
    normalScale: new THREE.Vector2(0.58, 0.58),
    bumpScale,
    roughness: 0.88,
    ...materialOptions
  });
  material.name = String(kind) + "-surface";
  material.userData.surfaceKind = String(kind);
  material.userData.surfaceRepeat = [Math.max(0.1, Number(repeatU) || 2), Math.max(0.1, Number(repeatV) || 2)];
  material.userData.surfaceBumpScale = bumpScale;
  liveSurfaceMaterials.add(material);

  const existing = realTextureSources.get(assetKeyForSurface(kind));
  if (existing) applyRealTextureSet(material, existing);
  return material;
}
