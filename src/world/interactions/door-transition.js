import * as THREE from "three";
import { addBox, makeMaterial, makeSurfaceMaterial } from "../geometry.js";

const FRAME = makeSurfaceMaterial("wood", 0xe1d9ca, { roughness: 0.84, bumpScale: 0.014 }, [1.6, 1.2]);
const HANDLE = makeSurfaceMaterial("metal", 0xaaa18d, { metalness: 0.55, roughness: 0.34, bumpScale: 0.004 }, [1, 1]);

export function createDoor(group, colliders, {
  id,
  x = 0,
  z = 0,
  rotationY = 0,
  color = 0x6b5748,
  openAngle = 1.62,
  width = 1.32,
  frameHeight = 2.28,
  leafWidth = width - 0.1,
  leafHeight = frameHeight - 0.1,
  frameDepth = 0.22,
  thresholdDepth = 0.3
}) {
  if (!id || ![x, z, rotationY, openAngle, width, frameHeight, leafWidth, leafHeight, frameDepth, thresholdDepth].every(Number.isFinite)) {
    throw new TypeError("createDoor requires an id and finite dimensions and position values.");
  }
  if (width <= 0.3 || frameHeight <= 0.5 || leafWidth <= 0 || leafWidth > width
    || leafHeight <= 0 || leafHeight > frameHeight || frameDepth <= 0 || thresholdDepth <= 0) {
    throw new RangeError("Door dimensions are outside their valid range.");
  }

  const assembly = new THREE.Group();
  assembly.name = id + "-assembly";
  assembly.position.set(x, 0, z);
  assembly.rotation.y = rotationY;
  group.add(assembly);

  const jambWidth = Math.min(0.12, width * 0.1);
  const jambOffset = width / 2 - jambWidth / 2;
  const frameTopHeight = Math.min(0.12, frameHeight * 0.08);
  const frameDepthHalf = frameDepth / 2;
  addBox(assembly, null, id + "-frame-left", -jambOffset, 0, 0, jambWidth, frameHeight, frameDepth, FRAME);
  addBox(assembly, null, id + "-frame-right", jambOffset, 0, 0, jambWidth, frameHeight, frameDepth, FRAME);
  addBox(assembly, null, id + "-frame-top", 0, frameHeight - frameTopHeight, 0,
    width + jambWidth * 0.34, frameTopHeight, frameDepth, FRAME);
  addBox(assembly, null, id + "-threshold", 0, -0.03, 0,
    width + 0.02, 0.06, thresholdDepth, FRAME);

  const hingeInset = jambWidth / 2;
  const leafCenterX = width / 2 - hingeInset;
  const pivot = new THREE.Group();
  pivot.name = id + "-hinge-pivot";
  pivot.position.set(-leafCenterX, 0, frameDepthHalf * 0.32);
  assembly.add(pivot);

  const leafMaterial = makeSurfaceMaterial("wood", color, { roughness: 0.88, bumpScale: 0.022 }, [1.3, 1.1]);
  const leaf = new THREE.Mesh(new THREE.BoxGeometry(leafWidth, leafHeight, 0.13), leafMaterial);
  leaf.name = id + "-door-leaf";
  leaf.position.set(leafCenterX, leafHeight / 2 - 0.03, 0);
  leaf.castShadow = true;
  leaf.receiveShadow = true;
  pivot.add(leaf);

  const insetWidth = Math.max(0.3, leafWidth * 0.61);
  const insetHeight = Math.max(0.5, leafHeight * 0.71);
  const inset = new THREE.Mesh(
    new THREE.BoxGeometry(insetWidth, insetHeight, 0.035),
    makeMaterial(new THREE.Color(color).multiplyScalar(0.78))
  );
  inset.position.set(leafCenterX, leafHeight / 2 - 0.01, 0.083);
  pivot.add(inset);
  const insetBack = inset.clone();
  insetBack.position.z = -0.083;
  pivot.add(insetBack);

  const handleGeometry = new THREE.SphereGeometry(0.055, 10, 8);
  const handleX = leafCenterX + leafWidth / 2 - 0.23;
  const handleFront = new THREE.Mesh(handleGeometry, HANDLE);
  handleFront.position.set(handleX, leafHeight / 2 - 0.04, 0.105);
  const handleBack = new THREE.Mesh(handleGeometry, HANDLE);
  handleBack.position.set(handleX, leafHeight / 2 - 0.04, -0.105);
  pivot.add(handleFront, handleBack);

  const colliderHalfWidth = width / 2 - jambWidth / 2;
  const collider = {
    name: id + "-closed-door",
    minX: x - colliderHalfWidth,
    maxX: x + colliderHalfWidth,
    minZ: z - frameDepthHalf - 0.09,
    maxZ: z + frameDepthHalf + 0.09,
    enabled: true
  };
  colliders.push(collider);

  return {
    id, pivot, collider, openAngle, dimensions: { width, frameHeight, leafWidth, leafHeight, frameDepth },
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
