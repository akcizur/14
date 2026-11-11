import * as THREE from "three";
import { addWallWithOpenings, makeMaterial } from "./geometry.js";
import { getHousePlan } from "./house-plans.js";
import { addPlanPartitions, addRoomFurnishings } from "./house-plan-geometry.js";

/**
 * Non-interactive window view built from the exact same plan as the playable
 * interior. It intentionally has no colliders and never owns independent
 * window coordinates.
 */
export function buildWindowInteriorPreview({
  id,
  centerZ,
  frontSide,
  wallColor,
  floorColor,
  planId = id === "houseB" ? "houseB" : "houseA",
  seed = null
}) {
  const plan = getHousePlan(planId, seed);
  const { width, depth } = plan.footprint;
  const wallHeight = plan.wall.height;
  if (!id || ![centerZ, frontSide, width, depth, wallHeight].every(Number.isFinite)
    || ![-1, 1].includes(frontSide)) {
    throw new TypeError("buildWindowInteriorPreview requires a valid plan and orientation.");
  }

  const halfW = width / 2;
  const halfD = depth / 2;
  const frontZ = centerZ + frontSide * halfD;
  const rearZ = centerZ - frontSide * halfD;
  const room = new THREE.Group();
  room.name = id + "-window-preview";
  room.userData.staticWindowPreview = true;
  const wall = makeMaterial(wallColor ?? plan.finish.wallColor, {
    side: THREE.DoubleSide,
    roughness: 0.94
  });
  const floor = makeMaterial(floorColor ?? plan.finish.floorColor, { roughness: 0.98 });
  const ceiling = makeMaterial(plan.finish.ceilingColor, { side: THREE.DoubleSide, roughness: 0.96 });
  const trim = makeMaterial(plan.facade.trimColor, { roughness: 0.86 });

  const floorMesh = new THREE.Mesh(new THREE.PlaneGeometry(width - 0.42, depth - 0.42), floor);
  floorMesh.name = id + "-preview-floor";
  floorMesh.rotation.x = -Math.PI / 2;
  floorMesh.position.set(0, 0.012, centerZ);
  floorMesh.receiveShadow = true;
  room.add(floorMesh);

  const ceilingMesh = new THREE.Mesh(new THREE.PlaneGeometry(width - 0.42, depth - 0.42), ceiling);
  ceilingMesh.name = id + "-preview-ceiling";
  ceilingMesh.rotation.x = Math.PI / 2;
  ceilingMesh.position.set(0, wallHeight - 0.035, centerZ);
  room.add(ceilingMesh);

  for (const side of [-1, 1]) {
    const sideWall = new THREE.Mesh(new THREE.BoxGeometry(0.07, wallHeight, depth - 0.46), wall);
    sideWall.name = id + "-preview-side-wall-" + (side < 0 ? "left" : "right");
    sideWall.position.set(side * (halfW - plan.wall.thickness / 2 - 0.01), wallHeight / 2, centerZ);
    sideWall.receiveShadow = true;
    room.add(sideWall);

    const baseboard = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.16, depth - 0.62), trim);
    baseboard.name = id + "-preview-side-baseboard-" + (side < 0 ? "left" : "right");
    baseboard.position.set(side * (halfW - 0.34), 0.08, centerZ);
    room.add(baseboard);
  }

  const rearWindows = plan.facade.windows.filter(item => item.side === "rear");
  const rearWallZ = rearZ + frontSide * 0.25;
  const rearGlassZ = rearZ + frontSide * 0.12;
  addWallWithOpenings(room, null, id + "-preview-rear-wall", {
    minX: -halfW,
    maxX: halfW,
    z: rearWallZ,
    thickness: 0.07,
    height: wallHeight,
    material: wall,
    openings: rearWindows.map(item => ({
      minX: item.x - item.width / 2,
      maxX: item.x + item.width / 2,
      minY: item.y - item.height / 2,
      maxY: item.y + item.height / 2
    }))
  });

  const rearGlassMaterial = makeMaterial(0x829ba0, {
    roughness: 0.3,
    metalness: 0.08,
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  for (const item of rearWindows) {
    const pane = new THREE.Mesh(
      new THREE.PlaneGeometry(Math.max(0.1, item.width - 0.08), Math.max(0.1, item.height - 0.08)),
      rearGlassMaterial
    );
    pane.name = id + "-preview-rear-glass-" + item.x;
    pane.position.set(item.x, item.y, rearGlassZ);
    pane.rotation.y = frontSide < 0 ? Math.PI : 0;
    room.add(pane);
  }

  const rearBaseboard = new THREE.Mesh(new THREE.BoxGeometry(width - 0.5, 0.16, 0.09), trim);
  rearBaseboard.name = id + "-preview-rear-baseboard";
  rearBaseboard.position.set(0, 0.08, rearZ + frontSide * 0.18);
  room.add(rearBaseboard);

  const fixtureBody = makeMaterial(0x77766f, { roughness: 0.72 });
  const fixtureGlow = makeMaterial(0xffe9c9, {
    emissive: 0xffd9a6,
    emissiveIntensity: 0.6,
    roughness: 0.36
  });
  const fixture = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.07, 0.52), fixtureBody);
  fixture.name = id + "-preview-ceiling-light-body";
  fixture.position.set(0, wallHeight - 0.12, centerZ);
  room.add(fixture);

  const diffuser = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.035, 0.36), fixtureGlow);
  diffuser.name = id + "-preview-ceiling-light-diffuser";
  diffuser.position.set(0, wallHeight - 0.17, centerZ);
  room.add(diffuser);

  const lamp = new THREE.PointLight(0xffe8c6, 5.5, 13, 2);
  lamp.name = id + "-preview-interior-light";
  lamp.position.set(0, wallHeight - 0.42, centerZ);
  room.add(lamp);

  addPlanPartitions({
    group: room,
    plan,
    centerZ,
    frontSide,
    material: wall,
    prefix: id + "-preview-partition",
    thickness: Math.max(0.08, plan.wall.thickness * 0.42),
    height: wallHeight,
    addTrim: false
  });
  addRoomFurnishings({ group: room, plan, centerZ, frontSide });

  room.userData.planId = plan.id;
  room.userData.seed = plan.seed ?? null;
  room.userData.frontZ = frontZ;
  room.userData.rearZ = rearZ;
  room.userData.bounds = {
    minX: -halfW,
    maxX: halfW,
    minZ: centerZ - halfD,
    maxZ: centerZ + halfD
  };
  return room;
}
