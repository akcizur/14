import * as THREE from "three";
import { addBox, addWallWithOpenings, addWindow, makeMaterial, makeSurfaceMaterial } from "./geometry.js";
import { createDoor } from "./interactions/door-transition.js";
import { createDoorSpawns } from "../scenes/door-spawns.js";
import { getHousePlan } from "./house-plans.js";
import { addPlanPartitions, addRoomFurnishings, addRoomFloorFinishes } from "./house-plan-geometry.js";

export function buildEmptyInterior({
  id, planId = id === "houseB" ? "houseB" : "houseA",
  seed = null,
  centerZ, frontSide, wallColor, floorColor,
  doorColor, doorOpenAngle = -1.62,
  streetSpawnKey, onExit = () => {}
}) {
  const plan = getHousePlan(planId, seed);
  const entry = plan.entry;
  const group = new THREE.Group();
  group.name = "scene-" + id;
  const colliders = [], interactables = [];
  const { width, depth } = plan.footprint;
  const halfW = width / 2, halfD = depth / 2;
  const wallHeight = plan.wall.height;
  const wallThickness = plan.wall.thickness;
  const frontZ = centerZ + frontSide * halfD;
  const rearZ = centerZ - frontSide * halfD;
  const wall = makeSurfaceMaterial("plaster", wallColor ?? plan.finish.wallColor, { roughness: 0.95, bumpScale: 0.022 }, [3.1, 1.35]);
  const floor = makeSurfaceMaterial("laminate", floorColor ?? plan.finish.floorColor, { roughness: 0.76, bumpScale: 0.014 }, [16, 2.4]);
  const ceiling = makeSurfaceMaterial("plaster", plan.finish.ceilingColor, { roughness: 0.96, bumpScale: 0.012 }, [2.4, 2.4]);

  addBox(group, null, id + "-floor", 0, -0.18, centerZ, width, 0.18, depth, floor);
  addBox(group, null, id + "-ceiling", 0, wallHeight, centerZ, width, 0.16, depth, ceiling);
  addBox(group, colliders, id + "-left-wall", -halfW + wallThickness / 2, 0, centerZ,
    wallThickness, wallHeight, depth, wall, true);
  addBox(group, colliders, id + "-right-wall", halfW - wallThickness / 2, 0, centerZ,
    wallThickness, wallHeight, depth, wall, true);

  const rearWindows = plan.facade.windows.filter(item => item.side === "rear");
  addWallWithOpenings(group, colliders, id + "-rear-wall", {
    minX: -halfW, maxX: halfW, z: rearZ,
    thickness: wallThickness, height: wallHeight, material: wall,
    openings: rearWindows.map(item => ({
      minX: item.x - item.width / 2,
      maxX: item.x + item.width / 2,
      minY: item.y - item.height / 2,
      maxY: item.y + item.height / 2
    }))
  });

  const doorLeft = entry.x - entry.width / 2;
  const doorRight = entry.x + entry.width / 2;
  const frontWindows = plan.facade.windows.filter(item => item.side === "front");
  const makeOpening = item => ({
    minX: item.x - item.width / 2,
    maxX: item.x + item.width / 2,
    minY: item.y - item.height / 2,
    maxY: item.y + item.height / 2
  });
  addWallWithOpenings(group, colliders, id + "-front-wall-left", {
    minX: -halfW, maxX: doorLeft, z: frontZ,
    thickness: wallThickness, height: wallHeight, material: wall,
    openings: frontWindows.filter(item => item.x < doorLeft).map(makeOpening)
  });
  addWallWithOpenings(group, colliders, id + "-front-wall-right", {
    minX: doorRight, maxX: halfW, z: frontZ,
    thickness: wallThickness, height: wallHeight, material: wall,
    openings: frontWindows.filter(item => item.x > doorRight).map(makeOpening)
  });
  addBox(group, null, id + "-front-lintel", entry.x, entry.height, frontZ,
    entry.width, wallHeight - entry.height, wallThickness, wall);

  const wallTrim = makeSurfaceMaterial("wood", plan.facade.trimColor, { roughness: 0.84, bumpScale: 0.014 }, [2.2, 1]);
  const baseboardHeight = 0.16;
  addBox(group, null, id + "-baseboard-left", -halfW + 0.25, 0, centerZ,
    0.09, baseboardHeight, depth - 0.4, wallTrim);
  addBox(group, null, id + "-baseboard-right", halfW - 0.25, 0, centerZ,
    0.09, baseboardHeight, depth - 0.4, wallTrim);
  const leftBaseboardWidth = doorLeft + halfW;
  const rightBaseboardWidth = halfW - doorRight;
  if (leftBaseboardWidth > 0) {
    addBox(group, null, id + "-baseboard-front-left",
      (-halfW + doorLeft) / 2, 0, frontZ - frontSide * 0.135,
      leftBaseboardWidth, baseboardHeight, 0.09, wallTrim);
  }
  if (rightBaseboardWidth > 0) {
    addBox(group, null, id + "-baseboard-front-right",
      (doorRight + halfW) / 2, 0, frontZ - frontSide * 0.135,
      rightBaseboardWidth, baseboardHeight, 0.09, wallTrim);
  }
  addBox(group, null, id + "-baseboard-rear", 0, 0, rearZ + frontSide * 0.135,
    width, baseboardHeight, 0.09, wallTrim);

  for (const item of [...frontWindows, ...rearWindows]) {
    const windowZ = item.side === "front"
      ? frontZ - frontSide * 0.135
      : rearZ + frontSide * 0.135;
    const rotation = item.side === "front"
      ? (frontSide > 0 ? Math.PI : 0)
      : (frontSide < 0 ? Math.PI : 0);
    addWindow(group, item.x, item.y, windowZ, item.width, item.height, rotation);
  }

  addPlanPartitions({
    group,
    colliders,
    plan,
    centerZ,
    frontSide,
    material: wall,
    prefix: id + "-partition"
  });
  addRoomFloorFinishes({ group, plan, centerZ, frontSide });
  addRoomFurnishings({ group, plan, centerZ, frontSide, colliders });

  const door = createDoor(group, colliders, {
    id: id + "-exit-door",
    x: entry.x,
    z: frontZ,
    rotationY: frontSide < 0 ? Math.PI : 0,
    color: doorColor ?? plan.facade.doorColor,
    openAngle: doorOpenAngle,
    width: entry.width,
    frameHeight: entry.frameHeight,
    leafWidth: entry.leafWidth,
    leafHeight: entry.leafHeight,
    frameDepth: entry.frameDepth,
    thresholdDepth: entry.thresholdDepth
  });
  const doorSpawns = createDoorSpawns({
    doorX: entry.x,
    doorZ: frontZ,
    frontSide,
    outsideDistance: entry.spawn.outsideDistance,
    insideDistance: entry.spawn.insideDistance
  });
  const exitPoint = { x: entry.x, z: frontZ - frontSide * 1.12 };
  interactables.push({
    id: id + "-exit",
    x: exitPoint.x,
    z: exitPoint.z,
    range: entry.interactionRange,
    prompt: "E  /  ODEJÍT NA ULICI",
    action: () => onExit("street", "exit", streetSpawnKey)
  });

  const fixtureBody = makeSurfaceMaterial("metal", 0x77766f, { metalness: 0.24, roughness: 0.58, bumpScale: 0.006 }, [1, 1]);
  const fixtureGlow = makeMaterial(0xffe9c9, {
    emissive: 0xffd9a6,
    emissiveIntensity: 0.72,
    roughness: 0.34
  });
  for (const room of plan.rooms) {
    const localZ = centerZ + frontSide * room.z;
    addBox(group, null, id + "-" + room.id + "-ceiling-light-body",
      room.x, wallHeight - 0.12, localZ, 0.72, 0.07, 0.42, fixtureBody);
    addBox(group, null, id + "-" + room.id + "-ceiling-light-diffuser",
      room.x, wallHeight - 0.18, localZ, 0.58, 0.035, 0.3, fixtureGlow);
    const lamp = new THREE.PointLight(0xffe8c6, 4.6, 9, 2);
    lamp.position.set(room.x, wallHeight - 0.42, localZ);
    group.add(lamp);
  }
  addBox(group, null, id + "-ceiling-light-body", 0, wallHeight - 0.12, centerZ,
    0.92, 0.07, 0.52, fixtureBody);
  addBox(group, null, id + "-ceiling-light-diffuser", 0, wallHeight - 0.18, centerZ,
    0.76, 0.035, 0.36, fixtureGlow);
  const hallLamp = new THREE.PointLight(0xffe8c6, 3.2, 9, 2);
  hallLamp.position.set(0, wallHeight - 0.4, centerZ);
  group.add(hallLamp);
  group.add(new THREE.HemisphereLight(0xe8e5d9, 0x77746d, 0.5));

  return {
    id, type: "interior", group, colliders, interactables,
    plan,
    seed: plan.seed ?? null,
    doors: { exit: door },
    spawn: doorSpawns.inside,
    spawns: { entry: doorSpawns.inside },
    navigation: {
      bounds: {
        minX: -halfW + 0.45, maxX: halfW - 0.45,
        minZ: centerZ - halfD + 0.45, maxZ: centerZ + halfD - 0.45
      }
    }
  };
}
