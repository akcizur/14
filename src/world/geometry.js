import * as THREE from "three";

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
export function addWindow(group, x, y, z, width = 1.5, height = 1.15, rotationY = 0) {
  const windowGroup = new THREE.Group();
  windowGroup.position.set(x, y, z);
  windowGroup.rotation.y = rotationY;
  const glass = makeMaterial(0x829ba0, {
    roughness: 0.26, metalness: 0.12, emissive: 0x1a2a2d, emissiveIntensity: 0.12
  });
  const trim = makeMaterial(0xe1ded2, { roughness: 0.78 });
  const pane = new THREE.Mesh(new THREE.BoxGeometry(width, height, 0.055), glass);
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
  const mullion = new THREE.Mesh(new THREE.BoxGeometry(0.055, height, 0.11), trim);
  mullion.position.z = 0.04;
  windowGroup.add(mullion);
  group.add(windowGroup);
  return windowGroup;
}
