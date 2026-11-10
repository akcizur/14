import * as THREE from "three";
import { addBox, makeMaterial } from "../geometry.js";

const FRAME = makeMaterial(0xe1d9ca, { roughness: 0.82 });
const HANDLE = makeMaterial(0xaaa18d, { metalness: 0.48, roughness: 0.35 });

export function createDoor(group, colliders, {
  id, x = 0, z = 0, rotationY = 0, color = 0x6b5748, openAngle = 1.62
}) {
  if (!id || ![x, z, rotationY, openAngle].every(Number.isFinite)) {
    throw new TypeError("createDoor requires an id and finite position/orientation values.");
  }

  const assembly = new THREE.Group();
  assembly.name = id + "-assembly";
  assembly.position.set(x, 0, z);
  assembly.rotation.y = rotationY;
  group.add(assembly);

  addBox(assembly, null, id + "-frame-left", -0.64, 0, 0, 0.12, 2.28, 0.22, FRAME);
  addBox(assembly, null, id + "-frame-right", 0.64, 0, 0, 0.12, 2.28, 0.22, FRAME);
  addBox(assembly, null, id + "-frame-top", 0, 2.16, 0, 1.4, 0.12, 0.22, FRAME);

  const pivot = new THREE.Group();
  pivot.name = id + "-hinge-pivot";
  pivot.position.set(-0.57, 0, 0.035);
  assembly.add(pivot);

  const leafMaterial = makeMaterial(color, { roughness: 0.86 });
  const leaf = new THREE.Mesh(new THREE.BoxGeometry(1.12, 2.12, 0.13), leafMaterial);
  leaf.name = id + "-door-leaf";
  leaf.position.set(0.56, 1.06, 0);
  leaf.castShadow = true;
  leaf.receiveShadow = true;
  pivot.add(leaf);

  const inset = new THREE.Mesh(
    new THREE.BoxGeometry(0.74, 1.55, 0.035),
    makeMaterial(new THREE.Color(color).multiplyScalar(0.78))
  );
  inset.position.set(0.56, 1.08, 0.083);
  pivot.add(inset);
  const insetBack = inset.clone();
  insetBack.position.z = -0.083;
  pivot.add(insetBack);

  const handleGeometry = new THREE.SphereGeometry(0.055, 10, 8);
  const handleFront = new THREE.Mesh(handleGeometry, HANDLE);
  handleFront.position.set(0.94, 1.03, 0.105);
  const handleBack = new THREE.Mesh(handleGeometry, HANDLE);
  handleBack.position.set(0.94, 1.03, -0.105);
  pivot.add(handleFront, handleBack);

  const collider = {
    name: id + "-closed-door",
    minX: x - 0.62, maxX: x + 0.62,
    minZ: z - 0.2, maxZ: z + 0.2,
    enabled: true
  };
  colliders.push(collider);

  return {
    id, pivot, collider, openAngle,
    animateOpen(duration = 650) {
      collider.enabled = false;
      const safeDuration = Number.isFinite(duration) ? Math.max(0, duration) : 650;
      const start = pivot.rotation.y;
      if (safeDuration === 0) {
        pivot.rotation.y = openAngle;
        return Promise.resolve();
      }
      const began = performance.now();
      return new Promise(resolve => {
        const frame = now => {
          const progress = Math.min(1, (now - began) / safeDuration);
          const eased = 0.5 - Math.cos(progress * Math.PI) * 0.5;
          pivot.rotation.y = start + (openAngle - start) * eased;
          if (progress < 1) requestAnimationFrame(frame);
          else resolve();
        };
        requestAnimationFrame(frame);
      });
    },
    reset() {
      pivot.rotation.y = 0;
      collider.enabled = true;
    }
  };
}
