import * as THREE from "three";
import { addBox, addPlane, makeMaterial, makeSurfaceMaterial } from "./geometry.js";
import { createDoor } from "./interactions/door-transition.js";
import { createDoorSpawns } from "../scenes/door-spawns.js";
import { buildWindowInteriorPreview } from "./interior-preview.js";
import { createTraffic } from "./traffic.js";
import { createPedestrians } from "./pedestrians.js";
import { buildResidentialStreetDetails } from "./streetscape.js";
import { getHousePlan } from "./house-plans.js";
import { buildArchitecturalHouse } from "./architectural-house.js";
import { WORLD_PLAN, assertWorldPlan } from "./world-plan.js";

function buildHouse(group, colliders, config) {
  const {
    id, planId, seed = null, centerZ, frontSide,
    targetLocation, streetSpawnKey, onDoorInteract
  } = config;
  const plan = getHousePlan(planId, seed);
  const entry = plan.entry;
  const { depth } = plan.footprint;
  const halfD = depth / 2;
  const frontZ = centerZ + frontSide * halfD;

  buildArchitecturalHouse({
    group, colliders, id, plan, centerZ, frontSide
  });

  group.add(buildWindowInteriorPreview({
    id,
    centerZ,
    frontSide,
    wallColor: plan.finish.wallColor,
    floorColor: plan.finish.floorColor,
    planId,
    seed
  }));

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

  buildResidentialStreetDetails({ group, worldPlan, buildings, colliders });

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
