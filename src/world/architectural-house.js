import * as THREE from "three";
import { addBox, addWallWithOpenings, addWindow, makeSurfaceMaterial } from "./geometry.js";

function addRoofPolygon(group, name, points, material, centerZ, rotationX = 0) {
  const inverseRotation = new THREE.Matrix4().makeRotationX(-rotationX);
  const vertices = [];
  const uv = [];
  for (const point of points) {
    const transformed = new THREE.Vector3(point.x, point.y, point.z).applyMatrix4(inverseRotation);
    vertices.push(transformed.x, transformed.y, transformed.z);
    uv.push(point.x / 3.2 + 2, point.z / 3.2 + 2);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  geometry.setIndex(points.length === 3 ? [0, 1, 2] : [0, 1, 2, 0, 2, 3]);
  geometry.computeVertexNormals();

  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  mesh.position.z = centerZ;
  mesh.rotation.x = rotationX;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

function addBeam(group, name, start, end, centerZ, material, thickness = 0.14) {
  const a = new THREE.Vector3(start.x, start.y, start.z);
  const b = new THREE.Vector3(end.x, end.y, end.z);
  const direction = b.clone().sub(a);
  const length = direction.length();
  if (length < 1e-4) return null;

  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(length, thickness, thickness),
    material
  );
  mesh.name = name;
  mesh.position.set(
    (a.x + b.x) / 2,
    (a.y + b.y) / 2,
    centerZ + (a.z + b.z) / 2
  );
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), direction.normalize());
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

function buildHipRoof({
  group, id, centerZ, frontSide, width, depth, wallHeight, pitch,
  overhang, material, trim, addFinials = true
}) {
  const halfW = width / 2;
  const halfD = depth / 2;
  const outerHalfW = halfW + overhang;
  const outerHalfD = halfD + overhang;
  const eaveY = wallHeight - Math.tan(pitch) * overhang;
  const ridgeY = wallHeight + Math.tan(pitch) * halfD;
  const ridgeHalfX = Math.max(0.34, outerHalfW - outerHalfD);
  const frontZ = frontSide * outerHalfD;
  const rearZ = -frontSide * outerHalfD;
  const positiveZIsFront = frontSide > 0;
  const frontRotation = frontSide * pitch;
  const rearRotation = -frontSide * pitch;

  const frontName = positiveZIsFront ? "positive-z" : "negative-z";
  const rearName = positiveZIsFront ? "negative-z" : "positive-z";
  addRoofPolygon(group, id + "-roof-slope-" + frontName, [
    { x: -ridgeHalfX, y: ridgeY, z: 0 },
    { x: ridgeHalfX, y: ridgeY, z: 0 },
    { x: outerHalfW, y: eaveY, z: frontZ },
    { x: -outerHalfW, y: eaveY, z: frontZ }
  ], material, centerZ, frontRotation);
  addRoofPolygon(group, id + "-roof-slope-" + rearName, [
    { x: ridgeHalfX, y: ridgeY, z: 0 },
    { x: -ridgeHalfX, y: ridgeY, z: 0 },
    { x: -outerHalfW, y: eaveY, z: rearZ },
    { x: outerHalfW, y: eaveY, z: rearZ }
  ], material, centerZ, rearRotation);

  const leftFront = { x: -outerHalfW, y: eaveY, z: frontZ };
  const leftRear = { x: -outerHalfW, y: eaveY, z: rearZ };
  const rightFront = { x: outerHalfW, y: eaveY, z: frontZ };
  const rightRear = { x: outerHalfW, y: eaveY, z: rearZ };
  const leftRidge = { x: -ridgeHalfX, y: ridgeY, z: 0 };
  const rightRidge = { x: ridgeHalfX, y: ridgeY, z: 0 };

  // The end planes are true hip triangles, not vertical gable infill.
  addRoofPolygon(group, id + "-left-gable", [leftRidge, leftFront, leftRear], material, centerZ);
  addRoofPolygon(group, id + "-right-gable", [rightRidge, rightRear, rightFront], material, centerZ);

  addBeam(group, id + "-roof-ridge-cap",
    { x: -ridgeHalfX - 0.1, y: ridgeY + 0.055, z: 0 },
    { x: ridgeHalfX + 0.1, y: ridgeY + 0.055, z: 0 },
    centerZ, trim, 0.22);
  addBeam(group, id + "-roof-eaves-front",
    { x: -outerHalfW, y: eaveY - 0.025, z: frontZ },
    { x: outerHalfW, y: eaveY - 0.025, z: frontZ },
    centerZ, trim, 0.14);
  addBeam(group, id + "-roof-eaves-rear",
    { x: -outerHalfW, y: eaveY - 0.025, z: rearZ },
    { x: outerHalfW, y: eaveY - 0.025, z: rearZ },
    centerZ, trim, 0.14);

  const leftFrontName = frontSide > 0 ? "left-south" : "left-north";
  const leftRearName = frontSide > 0 ? "left-north" : "left-south";
  const rightFrontName = frontSide > 0 ? "right-south" : "right-north";
  const rightRearName = frontSide > 0 ? "right-north" : "right-south";
  addBeam(group, id + "-roof-verge-" + leftFrontName, leftRidge, leftFront, centerZ, trim, 0.16);
  addBeam(group, id + "-roof-verge-" + leftRearName, leftRidge, leftRear, centerZ, trim, 0.16);
  addBeam(group, id + "-roof-verge-" + rightFrontName, rightRidge, rightFront, centerZ, trim, 0.16);
  addBeam(group, id + "-roof-verge-" + rightRearName, rightRidge, rightRear, centerZ, trim, 0.16);

  if (addFinials) {
    const finialGeometry = new THREE.ConeGeometry(0.105, 0.48, 8);
    for (const [label, x] of [["left", -ridgeHalfX], ["right", ridgeHalfX]]) {
      const finial = new THREE.Mesh(finialGeometry, trim);
      finial.name = id + "-roof-finial-" + label;
      finial.position.set(x, ridgeY + 0.28, centerZ);
      finial.castShadow = true;
      group.add(finial);
    }
  }

  return { ridgeY, eaveY, outerHalfW, outerHalfD, ridgeHalfX, frontZ, rearZ };
}

function addWallWindows(group, id, windows, facadeZ, outwardSide, rotationY, material) {
  windows.forEach((item, index) => {
    const windowGroup = addWindow(group, item.x, item.y, facadeZ, item.width, item.height, rotationY);
    windowGroup.name = id + "-facade-window-" + index;

    const shutterDepth = 0.105;
    const shutterZ = facadeZ + outwardSide * 0.07;
    const shutterHeight = item.height + 0.1;
    for (const side of [-1, 1]) {
      addBox(
        group, null, id + "-window-shutter-" + index + "-" + (side < 0 ? "left" : "right"),
        item.x + side * (item.width / 2 + 0.19),
        item.y - shutterHeight / 2,
        shutterZ,
        0.32, shutterHeight, shutterDepth, material
      );
      for (let slat = 0; slat < 4; slat += 1) {
        addBox(
          group, null, id + "-window-shutter-slat-" + index + "-" + side + "-" + slat,
          item.x + side * (item.width / 2 + 0.19),
          item.y - shutterHeight / 2 + 0.14 + slat * 0.22,
          shutterZ + outwardSide * 0.06,
          0.34, 0.055, 0.055, material
        );
      }
    }
  });
}

function buildClerestory({
  group, id, centerZ, frontSide, baseY, roofMaterial, wallMaterial, trim
}) {
  const width = 6.5;
  const depth = 4.0;
  const wallHeight = 0.78;
  const thickness = 0.16;
  const halfW = width / 2;
  const halfD = depth / 2;
  const topY = baseY + wallHeight;

  addBox(group, null, id + "-clerestory-front-wall", 0, baseY, centerZ + frontSide * (halfD - thickness / 2),
    width, wallHeight, thickness, wallMaterial);
  addBox(group, null, id + "-clerestory-rear-wall", 0, baseY, centerZ - frontSide * (halfD - thickness / 2),
    width, wallHeight, thickness, wallMaterial);
  addBox(group, null, id + "-clerestory-left-wall", -halfW + thickness / 2, baseY, centerZ,
    thickness, wallHeight, depth - thickness * 2, wallMaterial);
  addBox(group, null, id + "-clerestory-right-wall", halfW - thickness / 2, baseY, centerZ,
    thickness, wallHeight, depth - thickness * 2, wallMaterial);

  for (const side of [-1, 1]) {
    const windowZ = centerZ + side * (halfD + 0.012);
    const rotationY = side > 0 ? 0 : Math.PI;
    for (const x of [-1.55, 1.55]) {
      const ribbon = addWindow(group, x, baseY + wallHeight * 0.52, windowZ, 2.45, 0.43, rotationY);
      ribbon.name = id + "-clerestory-glazing-" + side + "-" + x;
    }
  }

  const upper = buildHipRoof({
    group,
    id: id + "-upper",
    centerZ,
    frontSide,
    width: width + 0.35,
    depth: depth + 0.35,
    wallHeight: topY,
    pitch: 0.27,
    overhang: 0.42,
    material: roofMaterial,
    trim,
    addFinials: true
  });
  return { topY, roof: upper };
}

function buildCarport({ group, colliders, id, centerZ, frontSide, halfW, roofMaterial, trim, metal, concrete }) {
  const width = 5.15;
  const depth = 8.45;
  const centerX = -(halfW + width / 2 - 0.08);
  const roofY = 2.92;
  const frontOffset = depth / 2 - 0.25;
  const postX = [centerX - width / 2 + 0.2, centerX + width / 2 - 0.2];
  const postZ = [-frontOffset, frontOffset];

  addBox(group, null, id + "-carport-foundation", centerX, -0.22, centerZ,
    width + 0.32, 0.22, depth + 0.32, concrete);
  addBox(group, null, id + "-carport-roof", centerX, roofY - 0.14, centerZ,
    width + 0.34, 0.18, depth + 0.42, roofMaterial);
  addBox(group, null, id + "-carport-fascia-front", centerX, roofY - 0.1,
    centerZ + frontSide * (depth / 2 + 0.2), width + 0.34, 0.13, 0.12, trim);
  addBox(group, null, id + "-carport-fascia-rear", centerX, roofY - 0.1,
    centerZ - frontSide * (depth / 2 + 0.2), width + 0.34, 0.13, 0.12, trim);

  for (let xIndex = 0; xIndex < postX.length; xIndex += 1) {
    for (let zIndex = 0; zIndex < postZ.length; zIndex += 1) {
      const x = postX[xIndex];
      const z = centerZ + postZ[zIndex];
      const label = (xIndex === 0 ? "outer" : "inner") + "-" + (zIndex === 0 ? "rear" : "front");
      addBox(group, colliders, id + "-carport-post-" + label, x, 0, z,
        0.16, roofY - 0.12, 0.16, metal, true);
      addBox(group, null, id + "-carport-post-base-" + label, x, 0, z,
        0.28, 0.22, 0.28, concrete);
    }
  }

  addBox(group, null, id + "-carport-beam-outer", postX[0], roofY - 0.3, centerZ,
    0.18, 0.18, depth - 0.35, metal);
  addBox(group, null, id + "-carport-beam-inner", postX[1], roofY - 0.3, centerZ,
    0.18, 0.18, depth - 0.35, metal);

  // Horizontal timber slats form the screened storage bay visible in the reference.
  const screenZ = centerZ + frontSide * (depth / 2 - 0.2);
  for (let slat = 0; slat < 10; slat += 1) {
    addBox(group, null, id + "-carport-screen-slat-" + slat, centerX, 0.62 + slat * 0.19, screenZ,
      width - 0.55, 0.09, 0.075, trim);
  }

  const light = new THREE.PointLight(0xffe8c5, 0.52, 5.5, 2);
  light.name = id + "-carport-light";
  light.position.set(centerX, roofY - 0.36, centerZ);
  group.add(light);
}

function buildEntrancePorch({ group, colliders, id, centerZ, frontSide, frontZ, entry, wallHeight, roofMaterial, trim, concrete, metal }) {
  const porchWidth = 4.25;
  const porchDepth = 2.2;
  const porchZ = frontZ + frontSide * 1.15;
  const canopyY = wallHeight - 0.06;

  addBox(group, null, id + "-porch-platform", entry.x, -0.05, porchZ,
    porchWidth, 0.16, porchDepth, concrete);
  addBox(group, null, id + "-porch-canopy", entry.x, canopyY, porchZ,
    porchWidth + 0.28, 0.17, porchDepth + 0.32, roofMaterial);
  addBox(group, null, id + "-porch-front-beam", entry.x, canopyY - 0.08,
    porchZ + frontSide * (porchDepth / 2 - 0.12), porchWidth, 0.17, 0.18, trim);

  for (const side of [-1, 1]) {
    const x = entry.x + side * 1.62;
    const z = porchZ + frontSide * (porchDepth / 2 - 0.12);
    addBox(group, colliders, id + "-porch-post-" + (side < 0 ? "left" : "right"), x, 0.04, z,
      0.19, canopyY - 0.12, 0.19, metal, true);
    addBox(group, null, id + "-porch-column-base-" + side, x, 0.04, z,
      0.34, 0.44, 0.34, concrete);
    addBox(group, null, id + "-porch-column-cap-" + side, x, canopyY - 0.34, z,
      0.34, 0.22, 0.34, trim);
  }

  for (let index = 0; index < 3; index += 1) {
    const stepDistance = porchDepth / 2 + 0.32 + (2 - index) * 0.42;
    addBox(group, null, id + "-entry-step-" + index, entry.x, index * 0.1,
      frontZ + frontSide * stepDistance,
      2.35 - index * 0.12, 0.12, 0.5, concrete);
  }

  const lantern = new THREE.PointLight(0xffdfb2, 0.42, 4.5, 2);
  lantern.name = id + "-entrance-light";
  lantern.position.set(entry.x, 2.35, frontZ + frontSide * 0.22);
  group.add(lantern);
}

export function buildArchitecturalHouse({
  group, colliders, id, plan, centerZ, frontSide
}) {
  const { width, depth } = plan.footprint;
  const halfW = width / 2;
  const halfD = depth / 2;
  const wallHeight = plan.wall.height;
  const wallThickness = plan.wall.thickness;
  const frontZ = centerZ + frontSide * halfD;
  const rearZ = centerZ - frontSide * halfD;
  const entry = plan.entry;

  const wall = makeSurfaceMaterial("plaster", plan.facade.wallColor, {
    roughness: 0.94, bumpScale: 0.022
  }, [3.2, 1.25]);
  const roof = makeSurfaceMaterial("roof-tile", plan.roof.color, {
    roughness: 0.91, bumpScale: 0.06, side: THREE.DoubleSide
  }, [2.3, 3.4]);
  const trim = makeSurfaceMaterial("wood", plan.facade.trimColor, {
    roughness: 0.84, bumpScale: 0.018
  }, [1.8, 1.2]);
  const metal = makeSurfaceMaterial("metal", 0x555d5b, {
    metalness: 0.36, roughness: 0.55, bumpScale: 0.006
  }, [1.2, 2.5]);
  const concrete = makeSurfaceMaterial("concrete", 0x777b75, {
    roughness: 0.96, bumpScale: 0.055
  }, [2.8, 2.8]);

  addBox(group, null, id + "-foundation", 0, -0.24, centerZ,
    width + 0.42, 0.24, depth + 0.42, concrete);
  addBox(group, colliders, id + "-left-wall", -halfW + wallThickness / 2, 0, centerZ,
    wallThickness, wallHeight, depth, wall, true);
  addBox(group, colliders, id + "-right-wall", halfW - wallThickness / 2, 0, centerZ,
    wallThickness, wallHeight, depth, wall, true);

  const rearWindows = plan.facade.windows.filter(item => item.side === "rear");
  const frontWindows = plan.facade.windows.filter(item => item.side === "front");
  const toOpening = item => ({
    minX: item.x - item.width / 2,
    maxX: item.x + item.width / 2,
    minY: item.y - item.height / 2,
    maxY: item.y + item.height / 2
  });

  addWallWithOpenings(group, colliders, id + "-rear-wall", {
    minX: -halfW, maxX: halfW, z: rearZ,
    thickness: wallThickness, height: wallHeight, material: wall,
    openings: rearWindows.map(toOpening)
  });

  const doorLeft = entry.x - entry.width / 2;
  const doorRight = entry.x + entry.width / 2;
  addWallWithOpenings(group, colliders, id + "-front-wall-left", {
    minX: -halfW, maxX: doorLeft, z: frontZ,
    thickness: wallThickness, height: wallHeight, material: wall,
    openings: frontWindows.filter(item => item.x < doorLeft).map(toOpening)
  });
  addWallWithOpenings(group, colliders, id + "-front-wall-right", {
    minX: doorRight, maxX: halfW, z: frontZ,
    thickness: wallThickness, height: wallHeight, material: wall,
    openings: frontWindows.filter(item => item.x > doorRight).map(toOpening)
  });
  addBox(group, null, id + "-front-lintel", entry.x, entry.height, frontZ,
    entry.width, wallHeight - entry.height, wallThickness, wall);

  const frontWindowZ = frontZ + frontSide * (wallThickness / 2 + 0.008);
  const rearWindowZ = rearZ - frontSide * (wallThickness / 2 + 0.008);
  addWallWindows(group, id + "-front", frontWindows, frontWindowZ, frontSide, frontSide < 0 ? Math.PI : 0, trim);
  addWallWindows(group, id + "-rear", rearWindows, rearWindowZ, -frontSide, frontSide > 0 ? Math.PI : 0, trim);

  const sill = makeSurfaceMaterial("concrete", plan.facade.trimColor, {
    roughness: 0.84, bumpScale: 0.018
  }, [1.2, 1]);
  for (const [facade, facadeZ, side, windows] of [
    ["front", frontWindowZ, frontSide, frontWindows],
    ["rear", rearWindowZ, -frontSide, rearWindows]
  ]) {
    windows.forEach((item, index) => {
      addBox(group, null, id + "-" + facade + "-window-sill-" + index,
        item.x, item.y - item.height / 2 - 0.08, facadeZ + side * 0.12,
        item.width + 0.2, 0.12, 0.22, sill);
    });
  }

  // Continuous low plinth and clean facade corner trims.
  addBox(group, null, id + "-left-plinth", -halfW + 0.04, 0, centerZ,
    0.1, 0.42, depth - 0.08, concrete);
  addBox(group, null, id + "-right-plinth", halfW - 0.04, 0, centerZ,
    0.1, 0.42, depth - 0.08, concrete);
  addBox(group, null, id + "-rear-plinth", 0, 0, rearZ - frontSide * 0.04,
    width - 0.08, 0.42, 0.1, concrete);
  addBox(group, null, id + "-front-plinth-left", ( -halfW + entry.x - entry.width / 2) / 2, 0,
    frontZ + frontSide * 0.04, Math.abs(-halfW + entry.x - entry.width / 2), 0.42, 0.1, concrete);
  addBox(group, null, id + "-front-plinth-right", (halfW + entry.x + entry.width / 2) / 2, 0,
    frontZ + frontSide * 0.04, Math.abs(halfW - entry.x - entry.width / 2), 0.42, 0.1, concrete);

  const mainRoof = buildHipRoof({
    group, id, centerZ, frontSide, width, depth,
    wallHeight, pitch: plan.roof.pitch,
    overhang: plan.roof.overhang, material: roof, trim
  });

  buildClerestory({
    group, id, centerZ, frontSide,
    baseY: mainRoof.ridgeY - 0.77,
    roofMaterial: roof, wallMaterial: wall, trim
  });

  buildCarport({
    group, colliders, id, centerZ, frontSide, halfW,
    roofMaterial: metal, trim, metal, concrete
  });
  buildEntrancePorch({
    group, colliders, id, centerZ, frontSide,
    frontZ, entry, wallHeight, roofMaterial: roof, trim, concrete, metal
  });

  // Gutters follow the true eaves; downpipes and elbows meet without gaps.
  const gutterY = mainRoof.eaveY - 0.2;
  const pipeBottomY = 0.05;
  const pipeHeight = gutterY - pipeBottomY;
  const pipeGeometry = new THREE.CylinderGeometry(0.045, 0.045, pipeHeight, 8);
  const gutterGeometry = new THREE.CylinderGeometry(0.055, 0.055, width + plan.roof.overhang * 2, 8);
  const pipeMaterial = metal;
  for (const [facade, edgeZ, wallZ] of [
    ["front", mainRoof.frontZ, frontSide * (halfD + wallThickness / 2 + 0.03)],
    ["rear", mainRoof.rearZ, -frontSide * (halfD + wallThickness / 2 + 0.03)]
  ]) {
    const gutter = new THREE.Mesh(gutterGeometry, pipeMaterial);
    gutter.name = id + "-" + facade + "-gutter";
    gutter.rotation.z = Math.PI / 2;
    gutter.position.set(0, gutterY, centerZ + edgeZ);
    gutter.castShadow = true;
    group.add(gutter);

    const connectorLength = Math.abs(edgeZ - wallZ);
    const connectorGeometry = new THREE.CylinderGeometry(0.04, 0.04, connectorLength, 8);
    for (const pipeX of [-1, 1].map(side => side * (halfW - 0.35))) {
      const pipe = new THREE.Mesh(pipeGeometry, pipeMaterial);
      pipe.name = id + "-" + facade + "-downpipe-" + (pipeX < 0 ? "left" : "right");
      pipe.position.set(pipeX, pipeBottomY + pipeHeight / 2, centerZ + wallZ);
      pipe.castShadow = true;
      group.add(pipe);

      const connector = new THREE.Mesh(connectorGeometry, pipeMaterial);
      connector.name = id + "-" + facade + "-gutter-connector-" + (pipeX < 0 ? "left" : "right");
      connector.rotation.x = Math.PI / 2;
      connector.position.set(pipeX, gutterY, centerZ + (edgeZ + wallZ) / 2);
      group.add(connector);
    }
  }

  return { frontZ, rearZ, mainRoof };
}
