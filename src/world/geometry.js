import * as THREE from "three";
import { makeSurfaceMaterial } from "./surface-materials.js";

export { makeSurfaceMaterial };

export function makeMaterial(color, options = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.92, ...options });
}
export function addBox(group, colliders, name, x, y, z, width, height, depth, material, solid = false) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
  mesh.name = name;
  mesh.position.set(x, y + height / 2, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  if (solid && colliders) colliders.push({
    name, minX: x - width / 2, maxX: x + width / 2,
    minZ: z - depth / 2, maxZ: z + depth / 2, enabled: true
  });
  return mesh;
}
export function addPlane(group, name, x, z, width, depth, material, y = 0) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), material);
  mesh.name = name;
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, y, z);
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

/**
 * Builds a wall segment on the X/Z plane with real rectangular openings.
 * The glass itself remains a collision surface so the player cannot walk
 * through a window while the wall geometry no longer hides the glazing.
 */
export function addWallWithOpenings(group, colliders, name, {
  minX, maxX, z, thickness, height, material, openings = []
}) {
  const values = [minX, maxX, z, thickness, height];
  if (!values.every(Number.isFinite) || maxX <= minX || thickness <= 0 || height <= 0) {
    throw new TypeError("addWallWithOpenings requires valid wall dimensions.");
  }

  const sorted = [...openings].sort((a, b) => a.minX - b.minX);
  let cursor = minX;
  const addSection = (sectionName, x1, x2, y1, y2) => {
    const sectionWidth = x2 - x1, sectionHeight = y2 - y1;
    if (sectionWidth <= 0 || sectionHeight <= 0) return;
    addBox(
      group, colliders, sectionName,
      (x1 + x2) / 2, y1, z,
      sectionWidth, sectionHeight, thickness, material, true
    );
  };

  sorted.forEach((opening, index) => {
    const { minX: openingMinX, maxX: openingMaxX, minY, maxY } = opening;
    if (![openingMinX, openingMaxX, minY, maxY].every(Number.isFinite)
      || openingMinX < cursor || openingMaxX <= openingMinX
      || minY < 0 || maxY <= minY || maxY > height
      || openingMaxX > maxX) {
      throw new RangeError("Invalid or overlapping wall opening in " + name + ".");
    }

    addSection(name + "-left-" + index, cursor, openingMinX, 0, height);
    addSection(name + "-sill-" + index, openingMinX, openingMaxX, 0, minY);
    addSection(name + "-lintel-" + index, openingMinX, openingMaxX, maxY, height);

    colliders?.push({
      name: name + "-glazing-" + index,
      minX: openingMinX,
      maxX: openingMaxX,
      minZ: z - thickness / 2,
      maxZ: z + thickness / 2,
      enabled: true
    });
    cursor = openingMaxX;
  });

  addSection(name + "-right", cursor, maxX, 0, height);
}

export function addWindow(group, x, y, z, width = 1.5, height = 1.15, rotationY = 0) {
  const windowGroup = new THREE.Group();
  windowGroup.position.set(x, y, z);
  windowGroup.rotation.y = rotationY;
  const glass = makeMaterial(0x829ba0, {
    roughness: 0.26, metalness: 0.12, transparent: true, opacity: 0.78,
    depthWrite: false, emissive: 0x1a2a2d, emissiveIntensity: 0.12
  });
  const trim = makeSurfaceMaterial("metal", 0xe1ded2, { metalness: 0.18, roughness: 0.58, bumpScale: 0.004 }, [1, 1]);
  const pane = new THREE.Mesh(new THREE.BoxGeometry(width, height, 0.055), glass);
  pane.name = "window-glass-pane";
  pane.castShadow = false;
  windowGroup.add(pane);
  const frameSize = 0.09;
  const pieces = [
    [0, height / 2, width + frameSize, frameSize],
    [0, -height / 2, width + frameSize, frameSize],
    [-width / 2, 0, frameSize, height],
    [width / 2, 0, frameSize, height]
  ];
  for (const [px, py, sx, sy] of pieces) {
    const frame = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, 0.1), trim);
    frame.position.set(px, py, 0.035);
    windowGroup.add(frame);
  }
  const verticalMullion = new THREE.Mesh(new THREE.BoxGeometry(0.055, height, 0.11), trim);
  verticalMullion.name = "window-vertical-mullion";
  verticalMullion.position.z = 0.04;
  windowGroup.add(verticalMullion);

  const horizontalMullion = new THREE.Mesh(new THREE.BoxGeometry(width, 0.055, 0.11), trim);
  horizontalMullion.name = "window-horizontal-mullion";
  horizontalMullion.position.z = 0.04;
  windowGroup.add(horizontalMullion);

  group.add(windowGroup);
  return windowGroup;
}
