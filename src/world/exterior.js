import * as THREE from "three";
import { addBox, addPlane, addWallWithOpenings, addWindow, makeMaterial, makeSurfaceMaterial } from "./geometry.js";
import { createDoor } from "./interactions/door-transition.js";
import { createDoorSpawns } from "../scenes/door-spawns.js";
import { createGableRoofLayout } from "./roof-geometry.js";
import { buildWindowInteriorPreview } from "./interior-preview.js";
import { createTraffic } from "./traffic.js";
import { createPedestrians } from "./pedestrians.js";
import { getHousePlan } from "./house-plans.js";
import { WORLD_PLAN, assertWorldPlan } from "./world-plan.js";

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
  const {
    id, planId, seed = null, centerZ, frontSide,
    targetLocation, streetSpawnKey, onDoorInteract
  } = config;
  const plan = getHousePlan(planId, seed);
  const entry = plan.entry;
  const { width, depth } = plan.footprint;
  const wallHeight = plan.wall.height;
  const wallThickness = plan.wall.thickness;
  const halfW = width / 2, halfD = depth / 2;
  const frontZ = centerZ + frontSide * halfD;
  const rearZ = centerZ - frontSide * halfD;
  const facadeColor = plan.facade.wallColor;
  const roofFinish = plan.roof.color;
  const trimColor = plan.facade.trimColor;
  const wall = makeSurfaceMaterial("plaster", facadeColor, { roughness: 0.94, bumpScale: 0.022 }, [3.2, 1.25]);
  const roof = makeSurfaceMaterial("roof-tile", roofFinish, { roughness: 0.91, bumpScale: 0.06 }, [2.3, 3.4]);
  const gableWall = makeSurfaceMaterial("plaster", facadeColor, { side: THREE.DoubleSide, roughness: 0.94, bumpScale: 0.022 }, [3.2, 1.25]);
  const trim = makeSurfaceMaterial("wood", trimColor, { roughness: 0.84, bumpScale: 0.018 }, [1.8, 1.2]);
  const foundation = makeSurfaceMaterial("concrete", 0x777b75, { roughness: 0.96, bumpScale: 0.055 }, [2.8, 2.8]);

  addBox(group, colliders, id + "-foundation", 0, -0.22, centerZ, width + 0.35, 0.22, depth + 0.35, foundation);
  addBox(group, colliders, id + "-left-wall", -halfW + wallThickness / 2, 0, centerZ, wallThickness, wallHeight, depth, wall, true);
  addBox(group, colliders, id + "-right-wall", halfW - wallThickness / 2, 0, centerZ, wallThickness, wallHeight, depth, wall, true);
  const rearWindows = plan.facade.windows.filter(item => item.side === "rear");
  const rearWindowWidth = rearWindows[0]?.width ?? 1.8;
  const rearWindowHeight = rearWindows[0]?.height ?? 1.15;
  const rearWindowY = rearWindows[0]?.y ?? 1.65;
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
  const rearWindowZ = rearZ - frontSide * (wallThickness / 2 + 0.005);
  const rearWindowRotation = frontSide > 0 ? Math.PI : 0;
  rearWindows.forEach(item => addWindow(group, item.x, item.y, rearWindowZ, item.width, item.height, rearWindowRotation));

  const doorLeft = entry.x - entry.width / 2;
  const doorRight = entry.x + entry.width / 2;
  const frontWindows = plan.facade.windows.filter(item => item.side === "front");
  const windowOpening = item => ({
    minX: item.x - item.width / 2,
    maxX: item.x + item.width / 2,
    minY: item.y - item.height / 2,
    maxY: item.y + item.height / 2
  });

  addWallWithOpenings(group, colliders, id + "-front-wall-left", {
    minX: -halfW, maxX: doorLeft, z: frontZ,
    thickness: wallThickness, height: wallHeight, material: wall,
    openings: frontWindows.filter(item => item.x < doorLeft).map(windowOpening)
  });
  addWallWithOpenings(group, colliders, id + "-front-wall-right", {
    minX: doorRight, maxX: halfW, z: frontZ,
    thickness: wallThickness, height: wallHeight, material: wall,
    openings: frontWindows.filter(item => item.x > doorRight).map(windowOpening)
  });
  addBox(group, null, id + "-front-lintel", entry.x, entry.height, frontZ,
    entry.width, wallHeight - entry.height, wallThickness, wall);

  const roofLayout = createGableRoofLayout({
    centerZ,
    halfDepth: halfD,
    wallHeight,
    pitch: plan.roof.pitch,
    panelOverhang: plan.roof.overhang
  });

  for (const panel of roofLayout.panels) {
    const roofPanel = new THREE.Mesh(
      new THREE.BoxGeometry(width + plan.roof.sideOverhang * 2, 0.22, panel.depth),
      roof
    );
    roofPanel.name = id + "-roof-slope-" + (panel.side < 0 ? "negative-z" : "positive-z");
    roofPanel.position.set(0, panel.centerY, panel.centerZ);
    roofPanel.rotation.x = panel.rotationX;
    roofPanel.castShadow = true;
    roofPanel.receiveShadow = true;
    group.add(roofPanel);

    // Slim verge boards finish both sloping gable edges without crossing the ridge.
    for (const edgeX of [-1, 1]) {
      const verge = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.14, panel.depth), trim);
      verge.name = id + "-roof-verge-" + (edgeX < 0 ? "left-" : "right-") + (panel.side < 0 ? "north" : "south");
      verge.position.set(edgeX * (halfW + plan.roof.sideOverhang), panel.centerY, panel.centerZ);
      verge.rotation.x = panel.rotationX;
      verge.castShadow = true;
      verge.receiveShadow = true;
      group.add(verge);
    }
  }

  // A continuous ridge cap hides the join between the two roof planes.
  const ridgeCap = new THREE.Mesh(
    new THREE.BoxGeometry(width + plan.roof.sideOverhang * 2 + 0.2, 0.22, 0.34),
    trim
  );
  ridgeCap.name = id + "-roof-ridge-cap";
  ridgeCap.position.set(0, roofLayout.ridgeY + 0.08, centerZ);
  ridgeCap.castShadow = true;
  ridgeCap.receiveShadow = true;
  group.add(ridgeCap);

  addGableEnd(
    group, id + "-left-gable", -halfW,
    frontZ, rearZ, centerZ, wallHeight, roofLayout.ridgeY, gableWall
  );
  addGableEnd(
    group, id + "-right-gable", halfW,
    frontZ, rearZ, centerZ, wallHeight, roofLayout.ridgeY, gableWall
  );

  const eaveY = wallHeight - Math.tan(roofLayout.pitch) * plan.roof.overhang;
  const eaveBaseY = eaveY - 0.09;
  addBox(
    group, null, id + "-eaves-front",
    0, eaveBaseY, frontZ + frontSide * plan.roof.overhang,
    width + plan.roof.sideOverhang * 2, 0.18, 0.16, trim
  );
  addBox(
    group, null, id + "-eaves-rear",
    0, eaveBaseY, rearZ - frontSide * plan.roof.overhang,
    width + plan.roof.sideOverhang * 2, 0.18, 0.16, trim
  );

  const windowZ = frontZ + frontSide * (wallThickness / 2 + 0.005);
  const windowRotation = frontSide < 0 ? Math.PI : 0;
  frontWindows.forEach(item => addWindow(group, item.x, item.y, windowZ, item.width, item.height, windowRotation));

  const sillMaterial = makeMaterial(trimColor, { roughness: 0.78 });
  for (const [facadeName, facadeZ, outwardSide, windows] of [
    ["front", windowZ, frontSide, frontWindows],
    ["rear", rearWindowZ, -frontSide, rearWindows]
  ]) {
    windows.forEach((item, index) => {
      addBox(
        group, null, id + "-" + facadeName + "-window-sill-" + index,
        item.x, item.y - item.height / 2 - 0.08, facadeZ + outwardSide * 0.035,
        item.width + 0.2, 0.12, 0.22, sillMaterial
      );
    });
  }

  // Gutters and downpipes finish the roof edge and anchor its overhang visually.
  const gutterGeometry = new THREE.CylinderGeometry(0.055, 0.055, width + plan.roof.sideOverhang * 2, 8);
  const pipeBottomY = 0.05;
  const gutterY = eaveY - 0.27;
  const pipeHeight = gutterY - pipeBottomY;
  const pipeGeometry = new THREE.CylinderGeometry(0.045, 0.045, pipeHeight, 8);
  const pipeMaterial = makeSurfaceMaterial("metal", 0x626966, { metalness: 0.34, roughness: 0.56, bumpScale: 0.006 }, [1.2, 2.5]);
  for (const [facadeName, edgeZ, wallZ] of [
    ["front", frontZ + frontSide * plan.roof.overhang, frontZ + frontSide * (wallThickness / 2 + 0.03)],
    ["rear", rearZ - frontSide * plan.roof.overhang, rearZ - frontSide * (wallThickness / 2 + 0.03)]
  ]) {
    const connectorLength = Math.abs(edgeZ - wallZ);
    const connectorGeometry = new THREE.CylinderGeometry(0.04, 0.04, connectorLength, 8);
    const gutter = new THREE.Mesh(gutterGeometry, pipeMaterial);
    gutter.name = id + "-" + facadeName + "-gutter";
    gutter.rotation.z = Math.PI / 2;
    gutter.position.set(0, gutterY, edgeZ);
    gutter.castShadow = true;
    group.add(gutter);

    for (const pipeX of [-1, 1].map(side => side * (halfW - 0.35))) {
      const pipe = new THREE.Mesh(pipeGeometry, pipeMaterial);
      pipe.name = id + "-" + facadeName + "-downpipe-" + (pipeX < 0 ? "left" : "right");
      pipe.position.set(pipeX, pipeBottomY + pipeHeight / 2, wallZ);
      pipe.castShadow = true;
      group.add(pipe);

      const connector = new THREE.Mesh(connectorGeometry, pipeMaterial);
      connector.name = id + "-" + facadeName + "-gutter-connector-" + (pipeX < 0 ? "left" : "right");
      connector.rotation.x = Math.PI / 2;
      connector.position.set(pipeX, gutterY, (edgeZ + wallZ) / 2);
      group.add(connector);
    }
  }

  group.add(buildWindowInteriorPreview({
    id,
    centerZ,
    frontSide,
    wallColor: plan.finish.wallColor,
    floorColor: plan.finish.floorColor,
    planId,
    seed
  }));

  if (plan.details.porch) {
    const porch = plan.details.porch;
    const porchZ = frontZ + frontSide * (entry.path.setback - 1.78);
    const porchMetal = makeSurfaceMaterial("metal", 0x565b58, { metalness: 0.25, roughness: 0.7, bumpScale: 0.008 }, [1, 3]);
    addBox(group, null, id + "-porch-canopy", entry.x, porch.height - 0.16, porchZ,
      porch.width, 0.16, porch.depth, roof);
    addBox(group, null, id + "-porch-beam", entry.x, porch.height - 0.23,
      porchZ + frontSide * porch.postOffsetZ, porch.width - 0.25, 0.16, 0.16, trim);
    for (const postX of [-1, 1].map(side => entry.x + side * porch.postOffsetX)) {
      addBox(group, colliders, id + "-porch-post", postX, 0,
        porchZ + frontSide * porch.postOffsetZ, 0.14, porch.postHeight, 0.14, porchMetal, true);
    }
  }
  if (plan.details.entryStep && plan.details.steps) {
    const steps = plan.details.steps;
    for (let stepIndex = 0; stepIndex < steps.count; stepIndex += 1) {
      addBox(group, null, id + "-entry-step-" + stepIndex, entry.x, stepIndex * steps.rise,
        frontZ + frontSide * (steps.firstOffset + stepIndex * steps.offsetStep),
        steps.width - stepIndex * 0.18, 0.12, steps.depth, foundation);
    }
  }
  if (plan.details.chimney && plan.details.chimneyPlacement) {
    const chimneyPlan = plan.details.chimneyPlacement;
    const chimneyZ = centerZ + frontSide * chimneyPlan.localZ;
    const roofBaseY = wallHeight + Math.tan(plan.roof.pitch) * (halfD - Math.abs(chimneyPlan.localZ));
    const chimney = makeSurfaceMaterial("brick", 0x77736b, { roughness: 0.96, bumpScale: 0.065 }, [1.8, 2.4]);
    addBox(group, null, id + "-chimney", chimneyPlan.x, roofBaseY, chimneyZ,
      chimneyPlan.width, chimneyPlan.height, chimneyPlan.width, chimney);
    addBox(group, null, id + "-chimney-cap", chimneyPlan.x, roofBaseY + chimneyPlan.height,
      chimneyZ, chimneyPlan.capWidth, chimneyPlan.capHeight, chimneyPlan.capWidth, trim);
  }

  const door = createDoor(group, colliders, {
    id: id + "-front-door", x: entry.x, z: frontZ,
    rotationY: frontSide < 0 ? Math.PI : 0, color: plan.facade.doorColor,
    width: entry.width,
    frameHeight: entry.frameHeight,
    leafWidth: entry.leafWidth,
    leafHeight: entry.leafHeight,
    frameDepth: entry.frameDepth,
    thresholdDepth: entry.thresholdDepth
  });
  const doorSpawns = createDoorSpawns({
    doorX: entry.x, doorZ: frontZ, frontSide,
    outsideDistance: entry.spawn.outsideDistance,
    insideDistance: entry.spawn.insideDistance
  });

  const pathMat = makeSurfaceMaterial("paving", 0xaaa79c, { roughness: 0.9, bumpScale: 0.025 }, [1.3, 4.5]);
  const lawnMat = makeSurfaceMaterial("grass", 0x77836f, { roughness: 1, bumpScale: 0.018 }, [4.8, 3.6]);
  addPlane(group, id + "-front-lawn", entry.x, frontZ + frontSide * entry.path.setback,
    entry.path.lawnWidth, entry.path.lawnDepth, lawnMat, -0.035);
  addPlane(group, id + "-entry-path", entry.x, frontZ + frontSide * entry.path.setback,
    entry.path.width, entry.path.length, pathMat, 0.008);

  return {
    door,
    spawns: doorSpawns,
    interactable: {
      id: "enter-" + id,
      x: entry.x, z: frontZ,
      range: entry.interactionRange,
      requiresFacing: true,
      facingThreshold: 0.18,
      prompt: "E  /  VSTOUPIT DO " + (id === "house-a" ? "DOMU A" : "DOMU B"),
      action: () => onDoorInteract(targetLocation, targetLocation, "entry")
    },
    streetSpawnKey,
    plan,
    frontZ,
    frontSide
  };
}

export function buildExterior({
  onDoorInteract = () => {},
  worldPlan = WORLD_PLAN,
  generatedHouses = false
} = {}) {
  assertWorldPlan(worldPlan);
  const streetPlan = worldPlan.street;
  const group = new THREE.Group();
  group.name = "scene-street";
  const colliders = [], interactables = [];
  const grass = makeSurfaceMaterial("grass", 0x77816f, { roughness: 1, bumpScale: 0.018 }, [12, 9]);
  const road = makeSurfaceMaterial("asphalt", 0x3d4445, { roughness: 1, bumpScale: 0.035 }, [16, 2.8]);
  const sidewalk = makeSurfaceMaterial("paving", 0xa5a297, { roughness: 0.92, bumpScale: 0.022 }, [12, 2.2]);
  const curb = makeSurfaceMaterial("concrete", 0xc8c3b7, { roughness: 0.95, bumpScale: 0.035 }, [10, 1.2]);
  const markings = makeMaterial(0xd0cfc2);

  const ground = streetPlan.ground;
  addPlane(group, "street-ground", ground.centerX, ground.centerZ,
    ground.width, ground.depth, grass, ground.y);

  const asphalt = streetPlan.road;
  addPlane(group, "street-asphalt", asphalt.centerX, asphalt.centerZ,
    asphalt.width, asphalt.depth, road, asphalt.y);
  for (const side of streetPlan.sidewalks) {
    addPlane(group, side.id + "-sidewalk", side.centerX, side.centerZ,
      side.width, side.depth, sidewalk, side.y);
    addBox(group, null, side.id + "-curb", 0, 0.02, side.curbZ,
      side.width, side.curbHeight, side.curbDepth, curb);
  }

  const centerMarkings = asphalt.centerMarkings;
  for (let x = centerMarkings.start; x <= centerMarkings.end; x += centerMarkings.spacing) {
    addPlane(group, "road-center-marking", x, asphalt.centerZ,
      centerMarkings.width, centerMarkings.depth, markings, centerMarkings.y);
  }
  const crossings = streetPlan.crossings;
  for (const crossingX of crossings.centersX) {
    for (let stripe = 0; stripe < crossings.stripeCount; stripe += 1) {
      const centeredStripe = stripe - (crossings.stripeCount - 1) / 2;
      addPlane(group, "zebra-crossing-marking",
        crossingX + centeredStripe * crossings.stripeSpacing,
        asphalt.centerZ,
        crossings.stripeWidth,
        crossings.spanZ,
        markings,
        crossings.y
      );
    }
  }

  const buildings = new Map();
  for (const site of worldPlan.houses) {
    const house = buildHouse(group, colliders, {
      ...site,
      seed: generatedHouses ? site.seed : null,
      onDoorInteract
    });
    buildings.set(site.planId, house);
    interactables.push(house.interactable);
  }

  const trunk = makeMaterial(0x665748);
  const foliage = makeMaterial(0x536b55);
  for (const tree of streetPlan.trees) {
    addBox(group, colliders, "garden-tree-trunk",
      tree.x, 0, tree.z, tree.trunkWidth ?? 0.34, tree.trunkHeight ?? 1.35,
      tree.trunkDepth ?? 0.34, trunk, true);
    const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(tree.crownRadius ?? 1.25, 1), foliage);
    crown.position.set(tree.x, tree.crownY ?? 2.0, tree.z);
    crown.scale.set(1, tree.crownScaleY ?? 1.08, 1);
    crown.castShadow = true;
    group.add(crown);
  }

  const traffic = createTraffic({ colliders, trafficPlan: streetPlan.traffic });
  group.add(traffic.group);
  const pedestrians = createPedestrians({
    colliders,
    traffic,
    pedestrianPlan: streetPlan.pedestrians,
    houses: worldPlan.houses.map(site => {
      const house = buildings.get(site.planId);
      return {
        id: site.id,
        door: house.door,
        interactable: house.interactable,
        frontZ: house.frontZ,
        frontSide: house.frontSide,
        sidewalkSide: -house.frontSide
      };
    })
  });
  group.add(pedestrians.group);

  const houseA = buildings.get("houseA");
  const houseB = buildings.get("houseB");
  if (!houseA || !houseB) throw new Error("The world plan must define houseA and houseB.");
  const spawn = streetPlan.spawn ?? { x: 0, z: 0, yaw: 0 };

  return {
    id: "street",
    type: "exterior",
    group,
    colliders,
    interactables,
    traffic,
    pedestrians,
    housePlans: { houseA: houseA.plan, houseB: houseB.plan },
    doors: { houseA: houseA.door, houseB: houseB.door },
    spawn,
    spawns: {
      start: spawn,
      outsideHouseA: houseA.spawns.outside,
      outsideHouseB: houseB.spawns.outside
    },
    navigation: { bounds: streetPlan.navigation }
  };
}
