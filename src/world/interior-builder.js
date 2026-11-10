import * as THREE from "three";
import { addBox, addWindow, makeMaterial } from "./geometry.js";
import { createDoor } from "./interactions/door-transition.js";
import { createDoorSpawns } from "../scenes/door-spawns.js";

export function buildEmptyInterior({
  id, centerZ, frontSide, wallColor = 0xd0ccc0,
  floorColor = 0x8c8980, doorColor = 0x665649,
  streetSpawnKey, onExit = () => {}
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
  addBox(group, colliders, id + "-rear-wall", 0, 0, rearZ, width, wallHeight, 0.24, wall, true);

  const doorGap = 1.32;
  const segmentWidth = (width - doorGap) / 2;
  addBox(group, colliders, id + "-front-wall-left", -doorGap / 2 - segmentWidth / 2, 0, frontZ, segmentWidth, wallHeight, 0.24, wall, true);
  addBox(group, colliders, id + "-front-wall-right", doorGap / 2 + segmentWidth / 2, 0, frontZ, segmentWidth, wallHeight, 0.24, wall, true);
  addBox(group, null, id + "-front-lintel", 0, 2.2, frontZ, doorGap, 0.85, 0.24, wall);

  const baseboard = makeMaterial(0xb5b0a4);
  addBox(group, null, id + "-baseboard-left", -halfW + 0.25, 0, centerZ, 0.09, 0.18, depth - 0.4, baseboard);
  addBox(group, null, id + "-baseboard-right", halfW - 0.25, 0, centerZ, 0.09, 0.18, depth - 0.4, baseboard);
  addWindow(group, -3.5, 1.65, rearZ + frontSide * 0.14, 1.8, 1.15, frontSide > 0 ? Math.PI : 0);
  addWindow(group, 3.5, 1.65, rearZ + frontSide * 0.14, 1.8, 1.15, frontSide > 0 ? Math.PI : 0);

  const door = createDoor(group, colliders, {
    id: id + "-exit-door", x: 0, z: frontZ,
    rotationY: frontSide < 0 ? Math.PI : 0, color: doorColor
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
