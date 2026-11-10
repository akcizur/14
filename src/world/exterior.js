import * as THREE from "three";
import { addBox, addPlane, addWindow, makeMaterial } from "./geometry.js";
import { createDoor } from "./interactions/door-transition.js";
import { createDoorSpawns } from "../scenes/door-spawns.js";
import { createGableRoofLayout } from "./roof-geometry.js";

function addGableEnd(group, name, x, frontZ, rearZ, centerZ, wallHeight, ridgeY, material) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute([
    x, wallHeight, rearZ,
    x, wallHeight, frontZ,
    x, ridgeY, centerZ
  ], 3));
  geometry.computeVertexNormals();

  const gable = new THREE.Mesh(geometry, material);
  gable.name = name;
  gable.castShadow = true;
  gable.receiveShadow = true;
  group.add(gable);
  return gable;
}

function buildHouse(group, colliders, config) {
  const { id, centerZ, frontSide, wallColor, roofColor, doorColor, targetLocation, streetSpawnKey } = config;
  const width = 12, depth = 10, wallHeight = 3.15;
  const halfW = width / 2, halfD = depth / 2;
  const frontZ = centerZ + frontSide * halfD;
  const rearZ = centerZ - frontSide * halfD;
  const wall = makeMaterial(wallColor);
  const roof = makeMaterial(roofColor, { roughness: 0.98 });
  const gableWall = makeMaterial(wallColor, { side: THREE.DoubleSide });
  const trim = makeMaterial(0xe0dacc);
  const foundation = makeMaterial(0x777b75);

  addBox(group, colliders, id + "-foundation", 0, -0.22, centerZ, width + 0.35, 0.22, depth + 0.35, foundation);
  addBox(group, colliders, id + "-left-wall", -halfW + 0.13, 0, centerZ, 0.26, wallHeight, depth, wall, true);
  addBox(group, colliders, id + "-right-wall", halfW - 0.13, 0, centerZ, 0.26, wallHeight, depth, wall, true);
  addBox(group, colliders, id + "-rear-wall", 0, 0, rearZ, width, wallHeight, 0.26, wall, true);

  const doorGap = 1.32;
  const sideWidth = (width - doorGap) / 2;
  addBox(group, colliders, id + "-front-wall-left", -doorGap / 2 - sideWidth / 2, 0, frontZ, sideWidth, wallHeight, 0.26, wall, true);
  addBox(group, colliders, id + "-front-wall-right", doorGap / 2 + sideWidth / 2, 0, frontZ, sideWidth, wallHeight, 0.26, wall, true);
  addBox(group, null, id + "-front-lintel", 0, 2.22, frontZ, doorGap, 0.92, 0.26, wall);

  const roofLayout = createGableRoofLayout({
    centerZ,
    halfDepth: halfD,
    wallHeight
  });

  for (const panel of roofLayout.panels) {
    const roofPanel = new THREE.Mesh(
      new THREE.BoxGeometry(width + 0.85, 0.22, panel.depth),
      roof
    );
    roofPanel.name = id + "-roof-slope-" + (panel.side < 0 ? "negative-z" : "positive-z");
    roofPanel.position.set(0, panel.centerY, panel.centerZ);
    roofPanel.rotation.x = panel.rotationX;
    roofPanel.castShadow = true;
    roofPanel.receiveShadow = true;
    group.add(roofPanel);
  }

  addGableEnd(
    group, id + "-left-gable", -halfW,
    frontZ, rearZ, centerZ, wallHeight, roofLayout.ridgeY, gableWall
  );
  addGableEnd(
    group, id + "-right-gable", halfW,
    frontZ, rearZ, centerZ, wallHeight, roofLayout.ridgeY, gableWall
  );

  addBox(group, null, id + "-eaves-front", 0, 3.1, frontZ + frontSide * 0.1, width + 0.5, 0.12, 0.35, trim);
  addBox(group, null, id + "-eaves-rear", 0, 3.1, rearZ - frontSide * 0.1, width + 0.5, 0.12, 0.35, trim);

  const windowZ = frontZ - frontSide * 0.035;
  addWindow(group, -3.55, 1.85, windowZ, 1.75, 1.15, frontSide < 0 ? Math.PI : 0);
  addWindow(group, 3.55, 1.85, windowZ, 1.75, 1.15, frontSide < 0 ? Math.PI : 0);

  const door = createDoor(group, colliders, {
    id: id + "-front-door", x: 0, z: frontZ,
    rotationY: frontSide < 0 ? Math.PI : 0, color: doorColor
  });
  const doorSpawns = createDoorSpawns({ doorZ: frontZ, frontSide });

  const pathMat = makeMaterial(0xaaa79c);
  const lawnMat = makeMaterial(0x77836f);
  addPlane(group, id + "-front-lawn", 0, frontZ + frontSide * 2.7, 15, 6.2, lawnMat, -0.035);
  addPlane(group, id + "-entry-path", 0, frontZ + frontSide * 2.7, 1.8, 5.6, pathMat, 0.008);

  return {
    door,
    spawns: doorSpawns,
    interactable: {
      id: "enter-" + id,
      x: 0, z: frontZ,
      range: 2.45,
      requiresFacing: true,
      facingThreshold: 0.18,
      prompt: "E  /  VSTOUPIT DO " + (id === "house-a" ? "DOMU A" : "DOMU B"),
      action: () => onDoorInteract(targetLocation, targetLocation, "entry")
    },
    streetSpawnKey
  };
}

export function buildExterior({ onDoorInteract = () => {} } = {}) {
  const group = new THREE.Group();
  group.name = "scene-street";
  const colliders = [], interactables = [];
  const grass = makeMaterial(0x77816f);
  const road = makeMaterial(0x3d4445, { roughness: 1 });
  const sidewalk = makeMaterial(0xa5a297);
  const curb = makeMaterial(0xc8c3b7);
  const markings = makeMaterial(0xd0cfc2);

  addPlane(group, "street-ground", 0, 0, 66, 52, grass, -0.08);
  addPlane(group, "street-asphalt", 0, 0, 64, 8.4, road, 0.005);
  addPlane(group, "north-sidewalk", 0, -5.25, 64, 1.7, sidewalk, 0.025);
  addPlane(group, "south-sidewalk", 0, 5.25, 64, 1.7, sidewalk, 0.025);
  addBox(group, null, "north-curb", 0, 0.02, -4.35, 64, 0.16, 0.18, curb);
  addBox(group, null, "south-curb", 0, 0.02, 4.35, 64, 0.16, 0.18, curb);
  for (let x = -29; x <= 29; x += 8) addPlane(group, "road-center-marking", x, 0, 3.3, 0.12, markings, 0.021);

  const houseA = buildHouse(group, colliders, {
    id: "house-a", centerZ: -17, frontSide: 1,
    wallColor: 0xc9c0af, roofColor: 0x555a59, doorColor: 0x6a574a,
    targetLocation: "houseA", streetSpawnKey: "outsideHouseA"
  });
  const houseB = buildHouse(group, colliders, {
    id: "house-b", centerZ: 17, frontSide: -1,
    wallColor: 0xb4c0bb, roofColor: 0x4b5355, doorColor: 0x536d69,
    targetLocation: "houseB", streetSpawnKey: "outsideHouseB"
  });

  const trunk = makeMaterial(0x665748);
  const foliage = makeMaterial(0x536b55);
  for (const [x, z] of [[-8.2, -17], [8.2, -17], [-8.2, 17], [8.2, 17]]) {
    addBox(group, null, "garden-tree-trunk", x, 0, z, 0.34, 1.35, 0.34, trunk);
    const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(1.25, 1), foliage);
    crown.position.set(x, 2.0, z);
    crown.scale.set(1, 1.08, 1);
    crown.castShadow = true;
    group.add(crown);
  }

  interactables.push(houseA.interactable, houseB.interactable);

  return {
    id: "street", type: "exterior", group, colliders, interactables,
    doors: { houseA: houseA.door, houseB: houseB.door },
    spawn: { x: 0, z: 0, yaw: 0 },
    spawns: {
      start: { x: 0, z: 0, yaw: 0 },
      outsideHouseA: houseA.spawns.outside,
      outsideHouseB: houseB.spawns.outside
    },
    navigation: { bounds: { minX: -29, maxX: 29, minZ: -23, maxZ: 23 } }
  };
}
