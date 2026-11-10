import * as THREE from "three";
import { makeMaterial } from "./geometry.js";

/**
 * A static, non-interactive interior shell rendered only while the street is
 * active. Its dimensions and finishes mirror the playable interior so the
 * rooms have believable depth when seen through the exterior glazing.
 */
export function buildWindowInteriorPreview({
  id,
  centerZ,
  frontSide,
  wallColor,
  floorColor,
  width = 12,
  depth = 10,
  wallHeight = 3.05
}) {
  if (!id || ![centerZ, frontSide, width, depth, wallHeight].every(Number.isFinite)
    || ![-1, 1].includes(frontSide) || width <= 0 || depth <= 0 || wallHeight <= 0) {
    throw new TypeError("buildWindowInteriorPreview requires valid room dimensions and orientation.");
  }

  const halfW = width / 2;
  const halfD = depth / 2;
  const frontZ = centerZ + frontSide * halfD;
  const rearZ = centerZ - frontSide * halfD;
  const room = new THREE.Group();
  room.name = id + "-window-preview";
  room.userData.staticWindowPreview = true;

  const wall = makeMaterial(wallColor, { side: THREE.DoubleSide, roughness: 0.94 });
  const floor = makeMaterial(floorColor, { roughness: 0.98 });
  const ceiling = makeMaterial(0xd8d5ca, { side: THREE.DoubleSide, roughness: 0.96 });
  const trim = makeMaterial(0xb5b0a4, { roughness: 0.86 });

  const floorMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(width - 0.42, depth - 0.42),
    floor
  );
  floorMesh.name = id + "-preview-floor";
  floorMesh.rotation.x = -Math.PI / 2;
  floorMesh.position.set(0, 0.012, centerZ);
  floorMesh.receiveShadow = true;
  room.add(floorMesh);

  const ceilingMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(width - 0.42, depth - 0.42),
    ceiling
  );
  ceilingMesh.name = id + "-preview-ceiling";
  ceilingMesh.rotation.x = Math.PI / 2;
  ceilingMesh.position.set(0, wallHeight - 0.035, centerZ);
  room.add(ceilingMesh);

  // Side walls sit just inside the exterior shell, avoiding coplanar surfaces.
  for (const side of [-1, 1]) {
    const sideWall = new THREE.Mesh(
      new THREE.BoxGeometry(0.07, wallHeight, depth - 0.46),
      wall
    );
    sideWall.name = id + "-preview-side-wall-" + (side < 0 ? "left" : "right");
    sideWall.position.set(side * (halfW - 0.27), wallHeight / 2, centerZ);
    sideWall.receiveShadow = true;
    room.add(sideWall);

    const baseboard = new THREE.Mesh(
      new THREE.BoxGeometry(0.09, 0.16, depth - 0.62),
      trim
    );
    baseboard.name = id + "-preview-side-baseboard-" + (side < 0 ? "left" : "right");
    baseboard.position.set(side * (halfW - 0.34), 0.08, centerZ);
    room.add(baseboard);
  }

  // The far wall keeps both rear window openings clear, matching the playable room.
  const rearWallZ = rearZ + frontSide * 0.25;
  const rearGlassZ = rearZ + frontSide * 0.12;
  const windowWidth = 1.8;
  const windowHeight = 1.15;
  const windowY = 1.65;
  const windowMinY = windowY - windowHeight / 2;
  const windowMaxY = windowY + windowHeight / 2;
  const openingCenters = [-3.5, 3.5];

  function addRearPanel(name, minX, maxX, minY, maxY) {
    if (maxX <= minX || maxY <= minY) return;
    const panel = new THREE.Mesh(
      new THREE.BoxGeometry(maxX - minX, maxY - minY, 0.07),
      wall
    );
    panel.name = id + "-preview-rear-" + name;
    panel.position.set((minX + maxX) / 2, (minY + maxY) / 2, rearWallZ);
    panel.receiveShadow = true;
    room.add(panel);
  }

  let cursor = -halfW;
  openingCenters.forEach((centerX, index) => {
    const openingMinX = centerX - windowWidth / 2;
    const openingMaxX = centerX + windowWidth / 2;
    addRearPanel("left-" + index, cursor, openingMinX, 0, wallHeight);
    addRearPanel("sill-" + index, openingMinX, openingMaxX, 0, windowMinY);
    addRearPanel("lintel-" + index, openingMinX, openingMaxX, windowMaxY, wallHeight);
    cursor = openingMaxX;
  });
  addRearPanel("right", cursor, halfW, 0, wallHeight);

  const rearGlassMaterial = makeMaterial(0x829ba0, {
    roughness: 0.3,
    metalness: 0.08,
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  for (const centerX of openingCenters) {
    const pane = new THREE.Mesh(
      new THREE.PlaneGeometry(windowWidth - 0.08, windowHeight - 0.08),
      rearGlassMaterial
    );
    pane.name = id + "-preview-rear-glass-" + centerX;
    pane.position.set(centerX, windowY, rearGlassZ);
    pane.rotation.y = frontSide < 0 ? Math.PI : 0;
    room.add(pane);
  }

  const rearBaseboard = new THREE.Mesh(
    new THREE.BoxGeometry(width - 0.5, 0.16, 0.09),
    trim
  );
  rearBaseboard.name = id + "-preview-rear-baseboard";
  rearBaseboard.position.set(0, 0.08, rearZ + frontSide * 0.18);
  room.add(rearBaseboard);

  // A small ceiling fixture and warm point light give the empty room visible depth.
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
  lamp.position.set(0, 2.62, centerZ);
  room.add(lamp);

  // Keep the unused front boundary explicit in metadata for geometry tests.
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
