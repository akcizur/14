import * as THREE from "three";
import { WORLD_PLAN } from "./world-plan.js";
import { makeSurfaceMaterial } from "./geometry.js";

const DEFAULT_TRAFFIC_PLAN = WORLD_PLAN.street.traffic;
const CAR_LENGTH = DEFAULT_TRAFFIC_PLAN.carLength;
const TRUCK_LENGTH = DEFAULT_TRAFFIC_PLAN.truckLength;

const CAR_COLORS = [0x87918e, 0x65737a, 0xb5ad9d, 0x747f70, 0x454e50, 0x9a9b91];
const TRUCK_COLORS = [0xb8b8ad, 0x8a9694, 0xa49a85, 0x727e80];

function unitRandom(random) {
  const value = Number(random());
  if (!Number.isFinite(value)) return 0.5;
  return Math.max(0, Math.min(0.999999, value));
}

function randomBetween(random, min, max) {
  return min + unitRandom(random) * (max - min);
}

function createMaterial(color, options = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.84,
    metalness: 0.04,
    ...options
  });
}

function addPart(parent, geometry, material, name, x, y, z, castShadow = true) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  mesh.position.set(x, y, z);
  mesh.castShadow = castShadow;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function addWheel(parent, name, x, z, radius, width, tireMaterial, hubMaterial) {
  // The assembly sits at the axle centre. Its local Z axis is the axle axis;
  // rotating this group therefore spins the tyre and hub together.
  const wheel = new THREE.Group();
  wheel.name = name + "-assembly";
  wheel.position.set(x, radius + 0.015, z);
  wheel.userData.rollRadius = radius;

  const tire = addPart(
    wheel,
    new THREE.CylinderGeometry(radius, radius, width, 12),
    tireMaterial,
    name + "-tire",
    0,
    0,
    0
  );
  tire.rotation.x = Math.PI / 2;

  const hub = addPart(
    wheel,
    new THREE.CylinderGeometry(radius * 0.44, radius * 0.44, width * 1.06, 12),
    hubMaterial,
    name + "-hub",
    0,
    0,
    0,
    false
  );
  hub.rotation.x = Math.PI / 2;

  parent.add(wheel);
  return wheel;
}

function createCarModel(color) {
  const root = new THREE.Group();
  root.name = "traffic-car";
  root.userData.trafficVehicle = "car";

  const paint = makeSurfaceMaterial("paint", color, { metalness: 0.2, roughness: 0.46, bumpScale: 0.002 }, [1.2, 1.2]);
  const darkPaint = createMaterial(0x333a3a, { roughness: 0.68 });
  const glass = createMaterial(0x35474b, {
    metalness: 0.12,
    roughness: 0.28,
    side: THREE.DoubleSide
  });
  const rubber = makeSurfaceMaterial("rubber", 0x202425, { roughness: 0.97, bumpScale: 0.012 }, [1.6, 1]);
  const hub = createMaterial(0x909793, { metalness: 0.55, roughness: 0.48 });
  const headlamp = createMaterial(0xe7dfbd, {
    emissive: 0x8c8060,
    emissiveIntensity: 0.22,
    roughness: 0.4
  });
  const tailLamp = createMaterial(0x8b3730, {
    emissive: 0x50130f,
    emissiveIntensity: 0.12
  });

  addPart(root, new THREE.BoxGeometry(4.35, 0.56, 1.72), paint, "car-body", -0.05, 0.76, 0);
  addPart(root, new THREE.BoxGeometry(1.2, 0.34, 1.68), paint, "car-hood", 1.34, 0.91, 0);
  addPart(root, new THREE.BoxGeometry(0.9, 0.3, 1.66), paint, "car-rear-deck", -1.56, 0.91, 0);
  addPart(root, new THREE.BoxGeometry(2.0, 0.13, 1.43), paint, "car-roof", -0.22, 1.62, 0);

  for (const side of [-1, 1]) {
    addPart(root, new THREE.BoxGeometry(1.53, 0.47, 0.035), glass, "car-side-window", -0.2, 1.34, side * 0.735, false);
    addPart(root, new THREE.BoxGeometry(0.045, 0.52, 0.055), darkPaint, "car-window-pillar", -0.97, 1.34, side * 0.745);
    addPart(root, new THREE.BoxGeometry(0.045, 0.52, 0.055), darkPaint, "car-window-pillar", 0.57, 1.34, side * 0.745);
    addPart(root, new THREE.BoxGeometry(0.28, 0.08, 0.055), darkPaint, "car-door-handle", -0.15, 1.02, side * 0.87, false);
  }

  addPart(root, new THREE.BoxGeometry(0.05, 0.46, 1.34), glass, "car-front-windshield", 0.79, 1.34, 0, false);
  addPart(root, new THREE.BoxGeometry(0.05, 0.42, 1.3), glass, "car-rear-window", -1.12, 1.34, 0, false);
  addPart(root, new THREE.BoxGeometry(0.14, 0.17, 1.76), darkPaint, "car-front-bumper", 2.14, 0.53, 0);
  addPart(root, new THREE.BoxGeometry(0.14, 0.17, 1.76), darkPaint, "car-rear-bumper", -2.19, 0.53, 0);

  for (const side of [-1, 1]) {
    addPart(root, new THREE.BoxGeometry(0.055, 0.17, 0.25), headlamp, "car-headlamp", 2.11, 0.78, side * 0.57, false);
    addPart(root, new THREE.BoxGeometry(0.055, 0.17, 0.24), tailLamp, "car-tail-lamp", -2.17, 0.78, side * 0.57, false);
  }

  const wheels = [];
  for (const x of [-1.35, 1.35]) {
    for (const side of [-1, 1]) {
      wheels.push(addWheel(root, "car-wheel", x, side * 0.87, 0.36, 0.22, rubber, hub));
    }
  }

  return { root, wheels, length: CAR_LENGTH, width: 1.86, wheelRadius: 0.36 };
}

function createTruckModel(color) {
  const root = new THREE.Group();
  root.name = "traffic-truck";
  root.userData.trafficVehicle = "truck";

  const paint = makeSurfaceMaterial("paint", color, { roughness: 0.58, bumpScale: 0.002 }, [1.4, 1.2]);
  const cabPaint = makeSurfaceMaterial("paint", 0x777f7d, { metalness: 0.16, roughness: 0.5, bumpScale: 0.002 }, [1.2, 1.2]);
  const glass = createMaterial(0x34464a, { roughness: 0.28 });
  const rubber = createMaterial(0x202425, { roughness: 0.96 });
  const hub = createMaterial(0x909793, { metalness: 0.5, roughness: 0.5 });
  const trim = createMaterial(0x4e5858, { metalness: 0.1, roughness: 0.78 });
  const headlamp = createMaterial(0xe7dfbd, { emissive: 0x8c8060, emissiveIntensity: 0.2 });
  const tailLamp = createMaterial(0x8b3730, { emissive: 0x50130f, emissiveIntensity: 0.12 });

  addPart(root, new THREE.BoxGeometry(7.65, 0.58, 1.9), trim, "truck-chassis", -0.05, 0.75, 0);
  addPart(root, new THREE.BoxGeometry(5.2, 2.35, 1.92), paint, "truck-cargo-box", -0.9, 2.08, 0);
  addPart(root, new THREE.BoxGeometry(2.15, 1.68, 1.94), cabPaint, "truck-cab", 2.55, 1.53, 0);
  addPart(root, new THREE.BoxGeometry(0.055, 0.78, 1.52), glass, "truck-windshield", 3.64, 1.74, 0, false);

  for (const side of [-1, 1]) {
    addPart(root, new THREE.BoxGeometry(4.75, 0.055, 0.035), trim, "truck-cargo-side-stripe", -0.9, 1.4, side * 0.98, false);
    addPart(root, new THREE.BoxGeometry(0.95, 0.72, 0.035), glass, "truck-side-window", 2.55, 1.78, side * 0.985, false);
    addPart(root, new THREE.BoxGeometry(0.12, 0.18, 0.22), trim, "truck-mirror-arm", 2.95, 1.98, side * 1.08);
    addPart(root, new THREE.BoxGeometry(0.12, 0.2, 0.1), cabPaint, "truck-mirror", 3.0, 2.0, side * 1.2);
    addPart(root, new THREE.BoxGeometry(0.06, 0.2, 0.23), headlamp, "truck-headlamp", 3.67, 0.88, side * 0.64, false);
    addPart(root, new THREE.BoxGeometry(0.055, 0.23, 0.2), tailLamp, "truck-tail-lamp", -3.55, 0.88, side * 0.64, false);
  }

  addPart(root, new THREE.BoxGeometry(0.1, 0.2, 1.98), trim, "truck-front-bumper", 3.73, 0.54, 0);
  addPart(root, new THREE.BoxGeometry(0.045, 2.08, 1.72), trim, "truck-rear-doors", -3.52, 2.08, 0, false);
  addPart(root, new THREE.BoxGeometry(0.045, 2.05, 0.045), cabPaint, "truck-rear-door-seam", -3.55, 2.08, 0, false);

  const wheels = [];
  for (const x of [-2.72, -0.86, 3.0]) {
    for (const side of [-1, 1]) {
      wheels.push(addWheel(root, "truck-wheel", x, side * 1.0, 0.4, 0.24, rubber, hub));
    }
  }

  return { root, wheels, length: TRUCK_LENGTH, width: 2.14, wheelRadius: 0.4 };
}

function disposeVehicle(root) {
  const geometries = new Set();
  const materials = new Set();
  root.traverse(object => {
    if (!object.isMesh) return;
    if (object.geometry) geometries.add(object.geometry);
    const list = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of list) if (material) materials.add(material);
  });
  for (const geometry of geometries) geometry.dispose();
  for (const material of materials) material.dispose();
}

/**
 * Two opposing traffic lanes with randomized, low-poly cars and delivery trucks.
 * Dynamic collider objects are added to the street collider array by reference,
 * so the first-person controller sees their current world-space positions.
 */
export function createTraffic({
  colliders = [],
  random = Math.random,
  trafficPlan = DEFAULT_TRAFFIC_PLAN
} = {}) {
  if (!Array.isArray(colliders) || typeof random !== "function") {
    throw new TypeError("createTraffic requires a collider array and a random function.");
  }

  const roadEdge = trafficPlan.roadEdge;
  const laneOffset = trafficPlan.laneOffset;
  const group = new THREE.Group();
  group.name = "street-traffic";
  const vehicles = [];
  const crossingReservations = [];
  const lanes = [
    { id: "northbound", z: -laneOffset, direction: 1, nextSpawn: randomBetween(random, 2.1, 3.7) },
    { id: "southbound", z: laneOffset, direction: -1, nextSpawn: randomBetween(random, 2.4, 4.0) }
  ];
  let disposed = false;

  function buildVehicle(lane, type, x) {
    const truck = type === "truck";
    const colors = truck ? TRUCK_COLORS : CAR_COLORS;
    const color = colors[Math.floor(unitRandom(random) * colors.length)];
    const model = truck ? createTruckModel(color) : createCarModel(color);
    const root = model.root;
    root.position.set(x, 0.005, lane.z);
    root.rotation.y = lane.direction > 0 ? 0 : Math.PI;
    root.userData.traffic = { type, lane: lane.id, direction: lane.direction };
    group.add(root);

    const collider = {
      name: "traffic-" + type + "-" + lane.id,
      minX: x - model.length / 2,
      maxX: x + model.length / 2,
      minZ: lane.z - model.width / 2,
      maxZ: lane.z + model.width / 2,
      enabled: true
    };
    colliders.push(collider);

    const vehicle = {
      root,
      wheels: model.wheels,
      type,
      lane,
      length: model.length,
      width: model.width,
      wheelRadius: model.wheelRadius,
      collider,
      baseSpeed: truck
        ? randomBetween(random, 5.2, 6.8)
        : randomBetween(random, 7.5, 10.2),
      targetSpeed: 0,
      speed: 0
    };
    vehicle.speed = vehicle.baseSpeed;
    vehicle.targetSpeed = vehicle.baseSpeed;
    vehicles.push(vehicle);
    return vehicle;
  }

  // A small opening traffic pattern gives the street life immediately after load.
  buildVehicle(lanes[0], "car", -25 + randomBetween(random, 0, 2));
  buildVehicle(lanes[0], "truck", 7 + randomBetween(random, 0, 2));
  buildVehicle(lanes[1], "car", 25 - randomBetween(random, 0, 2));
  buildVehicle(lanes[1], "truck", -7 - randomBetween(random, 0, 2));

  function scheduleNext(lane, min = 2.4, max = 4.0) {
    lane.nextSpawn = randomBetween(random, min, max);
  }

  function trySpawn(lane) {
    const type = unitRandom(random) < 0.22 ? "truck" : "car";
    const halfLength = (type === "truck" ? TRUCK_LENGTH : CAR_LENGTH) / 2;
    const x = lane.direction > 0
      ? -roadEdge - halfLength - 3
      : roadEdge + halfLength + 3;
    const sameLane = vehicles.filter(vehicle => vehicle.lane === lane);

    if (sameLane.length) {
      const nearest = sameLane.reduce((selected, vehicle) => {
        if (!selected) return vehicle;
        return lane.direction > 0
          ? (vehicle.root.position.x < selected.root.position.x ? vehicle : selected)
          : (vehicle.root.position.x > selected.root.position.x ? vehicle : selected);
      }, null);
      const gap = lane.direction > 0
        ? nearest.root.position.x - nearest.length / 2 - (x + halfLength)
        : (x - halfLength) - (nearest.root.position.x + nearest.length / 2);

      if (gap < trafficPlan.spawnGap) {
        scheduleNext(lane, 0.65, 1.15);
        return false;
      }
    }

    buildVehicle(lane, type, x);
    scheduleNext(lane, 2.4, 4.1);
    return true;
  }

  function updateCollider(vehicle) {
    const x = vehicle.root.position.x;
    const z = vehicle.lane.z;
    vehicle.collider.minX = x - vehicle.length / 2;
    vehicle.collider.maxX = x + vehicle.length / 2;
    vehicle.collider.minZ = z - vehicle.width / 2;
    vehicle.collider.maxZ = z + vehicle.width / 2;
  }

  function removeVehicle(index) {
    const vehicle = vehicles[index];
    group.remove(vehicle.root);
    const colliderIndex = colliders.indexOf(vehicle.collider);
    if (colliderIndex >= 0) colliders.splice(colliderIndex, 1);
    disposeVehicle(vehicle.root);
    vehicles.splice(index, 1);
  }

  function applyFollowingGaps(lane) {
    const laneVehicles = vehicles
      .filter(vehicle => vehicle.lane === lane)
      .sort((a, b) => lane.direction > 0
        ? b.root.position.x - a.root.position.x
        : a.root.position.x - b.root.position.x);

    for (const vehicle of laneVehicles) vehicle.targetSpeed = vehicle.baseSpeed;

    for (let index = 1; index < laneVehicles.length; index += 1) {
      const leader = laneVehicles[index - 1];
      const follower = laneVehicles[index];
      const gap = lane.direction > 0
        ? leader.root.position.x - leader.length / 2 - (follower.root.position.x + follower.length / 2)
        : (follower.root.position.x - follower.length / 2) - (leader.root.position.x + leader.length / 2);
      const requiredGap = (leader.length + follower.length) / 2 + trafficPlan.followingGap;

      if (gap < requiredGap + 5) {
        const safeSpeed = leader.speed + (gap - requiredGap) * 0.82;
        follower.targetSpeed = Math.min(follower.targetSpeed, Math.max(1.8, safeSpeed));
      }
    }
  }

  function update(deltaTime, active = true) {
    if (disposed || !active) return;
    const dt = Math.max(0, Math.min(Number(deltaTime) || 0, 0.05));
    if (dt <= 0) return;

    for (const lane of lanes) {
      lane.nextSpawn -= dt;
      if (lane.nextSpawn <= 0) trySpawn(lane);
      applyFollowingGaps(lane);
    }

    for (let index = vehicles.length - 1; index >= 0; index -= 1) {
      const vehicle = vehicles[index];
      let targetSpeed = vehicle.targetSpeed;
      for (const crossing of crossingReservations) {
        const distanceToStopLine =
          (crossing.x - vehicle.root.position.x) * vehicle.lane.direction
          - vehicle.length / 2 - 1.5;
        if (distanceToStopLine >= 0 && distanceToStopLine < trafficPlan.crossingLookAhead) {
          const safeSpeed = Math.sqrt(2 * 4.8 * Math.max(0, distanceToStopLine - 1));
          targetSpeed = Math.min(targetSpeed, safeSpeed);
        }
      }
      const response = targetSpeed < vehicle.speed ? 10 : 2.4;
      vehicle.speed += (targetSpeed - vehicle.speed) * (1 - Math.exp(-response * dt));
      vehicle.speed = Math.max(0, vehicle.speed);
      vehicle.root.position.x += vehicle.lane.direction * vehicle.speed * dt;
      // Vehicle models face their local +X direction. The whole vehicle
      // is turned for the opposite lane, so local wheel spin stays positive.
      // Spin the axle group (not the cylinder mesh's world Z Euler component).
      for (const wheel of vehicle.wheels) {
        wheel.rotation.z += vehicle.speed * dt / vehicle.wheelRadius;
      }
      updateCollider(vehicle);

      const x = vehicle.root.position.x;
      const cleared = vehicle.lane.direction > 0
        ? x - vehicle.length / 2 > roadEdge + 2
        : x + vehicle.length / 2 < -roadEdge - 2;
      if (cleared) removeVehicle(index);
    }
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    for (let index = vehicles.length - 1; index >= 0; index -= 1) removeVehicle(index);
    crossingReservations.length = 0;
    group.clear();
  }

  return { group, vehicles, lanes, crossingReservations, update, dispose };
}
