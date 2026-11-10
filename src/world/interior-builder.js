import * as THREE from "three";
import { addBox, addWallWithOpenings, addWindow, makeMaterial } from "./geometry.js";
import { createDoor } from "./interactions/door-transition.js";
import { createDoorSpawns } from "../scenes/door-spawns.js";

export function buildEmptyInterior({
  id, centerZ, frontSide, wallColor = 0xd0ccc0,
  floorColor = 0x8c8980, doorColor = 0x665649,
  doorOpenAngle = -1.62, streetSpawnKey, onExit = () => {}
}) {
  const group = new THREE.Group();
  group.name = "scene-" + id;
  const colliders = [], interactables = [];
  const width = 12, depth = 10, halfW = width / 2, halfD = depth / 2;
  const wallHeight = 3.05;
  const frontZ = centerZ + frontSide * halfD;
  const rearZ = centerZ - frontSide * halfD;
  const wall = makeMaterial(wallColor);
  const floor = makeMaterial(floorColor, { roughness: 0.96 });
  const ceiling = makeMaterial(0xd8d5ca);

  addBox(group, null, id + "-floor", 0, -0.18, centerZ, width, 0.18, depth, floor);
  addBox(group, null, id + "-ceiling", 0, wallHeight, centerZ, width, 0.16, depth, ceiling);
  addBox(group, colliders, id + "-left-wall", -halfW + 0.12, 0, centerZ, 0.24, wallHeight, depth, wall, true);
  addBox(group, colliders, id + "-right-wall", halfW - 0.12, 0, centerZ, 0.24, wallHeight, depth, wall, true);
  addWallWithOpenings(group, colliders, id + "-rear-wall", {
    minX: -halfW, maxX: halfW, z: rearZ,
    thickness: 0.24, height: wallHeight, material: wall,
    openings: [-3.5, 3.5].map(centerX => ({
      minX: centerX - 0.9,
      maxX: centerX + 0.9,
      minY: 1.65 - 0.575,
      maxY: 1.65 + 0.575
    }))
  });

  const doorGap = 1.32;
  const frontWindowWidth = 1.75, frontWindowHeight = 1.15, frontWindowY = 1.85;
  const frontWindowOpening = centerX => ({
    minX: centerX - frontWindowWidth / 2,
    maxX: centerX + frontWindowWidth / 2,
    minY: frontWindowY - frontWindowHeight / 2,
    maxY: frontWindowY + frontWindowHeight / 2
  });
  addWallWithOpenings(group, colliders, id + "-front-wall-left", {
    minX: -halfW, maxX: -doorGap / 2, z: frontZ,
    thickness: 0.24, height: wallHeight, material: wall,
    openings: [frontWindowOpening(-3.55)]
  });
  addWallWithOpenings(group, colliders, id + "-front-wall-right", {
    minX: doorGap / 2, maxX: halfW, z: frontZ,
    thickness: 0.24, height: wallHeight, material: wall,
    openings: [frontWindowOpening(3.55)]
  });
  addBox(group, null, id + "-front-lintel", 0, 2.2, frontZ, doorGap, 0.85, 0.24, wall);
  const frontWindowZ = frontZ - frontSide * 0.135;
  const frontWindowRotation = frontSide > 0 ? Math.PI : 0;
  addWindow(group, -3.55, frontWindowY, frontWindowZ, frontWindowWidth, frontWindowHeight, frontWindowRotation);
  addWindow(group, 3.55, frontWindowY, frontWindowZ, frontWindowWidth, frontWindowHeight, frontWindowRotation);

  const baseboard = makeMaterial(0xb5b0a4);
  addBox(group, null, id + "-baseboard-left", -halfW + 0.25, 0, centerZ, 0.09, 0.18, depth - 0.4, baseboard);
  addBox(group, null, id + "-baseboard-right", halfW - 0.25, 0, centerZ, 0.09, 0.18, depth - 0.4, baseboard);
  addBox(group, null, id + "-baseboard-front-left", -3.33, 0, frontZ - frontSide * 0.135, 5.34, 0.18, 0.09, baseboard);
  addBox(group, null, id + "-baseboard-front-right", 3.33, 0, frontZ - frontSide * 0.135, 5.34, 0.18, 0.09, baseboard);
  addBox(group, null, id + "-baseboard-rear", 0, 0, rearZ + frontSide * 0.135, width, 0.18, 0.09, baseboard);
  const rearWindowZ = rearZ + frontSide * 0.135;
  const rearWindowRotation = frontSide < 0 ? Math.PI : 0;
  addWindow(group, -3.5, 1.65, rearWindowZ, 1.8, 1.15, rearWindowRotation);
  addWindow(group, 3.5, 1.65, rearWindowZ, 1.8, 1.15, rearWindowRotation);

  const door = createDoor(group, colliders, {
    id: id + "-exit-door", x: 0, z: frontZ,
    rotationY: frontSide < 0 ? Math.PI : 0,
    color: doorColor,
    openAngle: doorOpenAngle
  });
  const doorSpawns = createDoorSpawns({ doorZ: frontZ, frontSide });

  const exitPoint = {
    x: 0,
    z: frontZ - frontSide * 1.12
  };
  interactables.push({
    id: id + "-exit",
    x: exitPoint.x,
    z: exitPoint.z,
    range: 2.35,
    requiresFacing: true,
    facingThreshold: 0.2,
    prompt: "E  /  ODEJÍT NA ULICI",
    action: () => onExit("street", "exit", streetSpawnKey)
  });

  const lamp = new THREE.PointLight(0xffe8c6, 12, 16, 2);
  lamp.position.set(0, 2.55, centerZ);
  group.add(lamp);
  group.add(new THREE.HemisphereLight(0xe8e5d9, 0x77746d, 0.42));

  return {
    id, type: "interior", group, colliders, interactables,
    doors: { exit: door },
    spawn: doorSpawns.inside,
    spawns: { entry: doorSpawns.inside },
    navigation: {
      bounds: {
        minX: -5.55, maxX: 5.55,
        minZ: centerZ - 4.55, maxZ: centerZ + 4.55
      }
    }
  };
}
