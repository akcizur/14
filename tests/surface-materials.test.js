import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { getSurfaceMaps, makeSurfaceMaterial, disposeSurfaceTextures } from "../src/world/surface-materials.js";

test("PBR surfaces provide sRGB color, linear roughness and bump maps", () => {
  const maps = getSurfaceMaps("plaster", 3, 2);

  assert.equal(maps.map.colorSpace, THREE.SRGBColorSpace);
  assert.equal(maps.roughnessMap.colorSpace, THREE.NoColorSpace);
  assert.equal(maps.bumpMap.colorSpace, THREE.NoColorSpace);
  assert.equal(maps.map.image.width, 256);
  assert.equal(maps.map.image.height, 256);
  assert.equal(maps.map.repeat.x, 3);
  assert.equal(maps.map.repeat.y, 2);

  for (const texture of Object.values(maps)) {
    assert.equal(texture.wrapS, THREE.RepeatWrapping);
    assert.equal(texture.wrapT, THREE.RepeatWrapping);
    assert.equal(texture.image.data.length, 256 * 256 * 4);
  }
});

test("surface maps are shared for identical tiling and isolated for different tiling", () => {
  const first = getSurfaceMaps("wood", 2, 1);
  const again = getSurfaceMaps("wood", 2, 1);
  const different = getSurfaceMaps("wood", 4, 2);

  assert.equal(first.map, again.map);
  assert.notEqual(first.map, different.map);
  assert.equal(first.map.repeat.x, 2);
  assert.equal(different.map.repeat.x, 4);
  assert.equal(different.map.repeat.y, 2);
});

test("textured materials retain physically based material controls", () => {
  const material = makeSurfaceMaterial(
    "roof-tile",
    0x66605a,
    { roughness: 0.91, metalness: 0.04, bumpScale: 0.06 },
    [2.3, 3.4]
  );

  assert.ok(material instanceof THREE.MeshStandardMaterial);
  assert.ok(material.map);
  assert.ok(material.roughnessMap);
  assert.ok(material.bumpMap);
  assert.equal(material.roughness, 0.91);
  assert.equal(material.bumpScale, 0.06);
  assert.equal(material.metalness, 0.04);
  material.dispose();
});

test("generated texture pixels stay in range and contain real surface variation", () => {
  for (const kind of ["plaster", "concrete", "asphalt", "grass", "wood", "roof-tile", "paving", "ceramic", "fabric", "metal", "paint", "rubber", "brick"]) {
    const data = getSurfaceMaps(kind).map.image.data;
    let minimum = 255, maximum = 0;
    for (let index = 0; index < data.length; index += 4) {
      minimum = Math.min(minimum, data[index]);
      maximum = Math.max(maximum, data[index]);
    }
    assert.ok(minimum >= 0 && maximum <= 255, kind + " texture values must stay in byte range");
    assert.ok(maximum - minimum >= 4, kind + " must have visible tonal variation");
  }
});

test("texture cache can be released without depending on a browser canvas", () => {
  getSurfaceMaps("concrete");
  assert.doesNotThrow(() => disposeSurfaceTextures());
});
