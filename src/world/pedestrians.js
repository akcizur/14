import * as THREE from "three";
import { WORLD_PLAN } from "./world-plan.js";

const DEFAULT_PEDESTRIAN_PLAN = WORLD_PLAN.street.pedestrians;
const SHIRTS = [0x687b78, 0x9a806e, 0x68718b, 0xb4a68f, 0x566b61, 0x8c6460, 0x858a87];
const TROUSERS = [0x343d42, 0x4f5150, 0x62645c, 0x454c57, 0x69665e];
const SKIN = [0xd5ab8e, 0xb9876e, 0x9e705c, 0xe2bd9d, 0xc99778];
const HAIR = [0x292825, 0x514033, 0x8b785e, 0x5d5b55, 0xb2a17d];

function unitRandom(random) {
  const value = Number(random());
  if (!Number.isFinite(value)) return 0.5;
  return Math.max(0, Math.min(0.999999, value));
}

function randomBetween(random, min, max) {
  return min + unitRandom(random) * (max - min);
}

function choose(random, values) {
  return values[Math.floor(unitRandom(random) * values.length)];
}

function material(color, roughness = 0.88) {
  return new THREE.MeshStandardMaterial({ color, roughness });
}

function addMesh(parent, geometry, mat, name, x, y, z, castShadow = true) {
  const mesh = new THREE.Mesh(geometry, mat);
  mesh.name = name;
  mesh.position.set(x, y, z);
  mesh.castShadow = castShadow;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function addCylinder(parent, name, mat, radiusTop, radiusBottom, height, x, y, z) {
  return addMesh(
    parent,
    new THREE.CylinderGeometry(radiusTop, radiusBottom, height, 8),
    mat,
    name,
    x,
    y,
    z
  );
}

function createPersonMaterials(random) {
  return {
    shirt: material(choose(random, SHIRTS), 0.92),
    trousers: material(choose(random, TROUSERS), 0.95),
    skin: material(choose(random, SKIN), 0.9),
    hair: material(choose(random, HAIR), 0.98),
    shoes: material(0x292d2d, 0.96),
    detail: material(0x414745, 0.8)
  };
}

function createWalkerModel(random) {
  const root = new THREE.Group();
  root.name = "pedestrian-walker";
  root.userData.pedestrian = "walker";

  const mats = createPersonMaterials(random);
  const body = new THREE.Group();
  body.name = "pedestrian-upper-body";
  root.add(body);

  addMesh(body, new THREE.BoxGeometry(0.43, 0.59, 0.29), mats.shirt, "pedestrian-torso", 0, 1.09, 0);
  addMesh(body, new THREE.BoxGeometry(0.37, 0.22, 0.27), mats.trousers, "pedestrian-pelvis", 0, 0.75, 0);
  addMesh(body, new THREE.SphereGeometry(0.16, 12, 10), mats.skin, "pedestrian-head", 0, 1.57, 0.015);
  addMesh(body, new THREE.SphereGeometry(0.165, 10, 7, 0, Math.PI * 2, 0, Math.PI * 0.48), mats.hair, "pedestrian-hair", 0, 1.65, -0.005);
  addMesh(body, new THREE.SphereGeometry(0.018, 7, 6), mats.detail, "pedestrian-eye-left", -0.055, 1.58, 0.16, false);
  addMesh(body, new THREE.SphereGeometry(0.018, 7, 6), mats.detail, "pedestrian-eye-right", 0.055, 1.58, 0.16, false);

  const arms = [];
  for (const side of [-1, 1]) {
    const shoulder = new THREE.Group();
    shoulder.name = side < 0 ? "pedestrian-arm-left" : "pedestrian-arm-right";
    shoulder.position.set(side * 0.255, 1.34, 0);
    body.add(shoulder);
    addCylinder(shoulder, "pedestrian-upper-arm", mats.shirt, 0.075, 0.09, 0.34, 0, -0.17, 0);
    const elbow = new THREE.Group();
    elbow.position.y = -0.34;
    shoulder.add(elbow);
    addCylinder(elbow, "pedestrian-forearm", mats.shirt, 0.055, 0.067, 0.29, 0, -0.145, 0);
    addMesh(elbow, new THREE.SphereGeometry(0.065, 8, 7), mats.skin, "pedestrian-hand", 0, -0.3, 0);
    arms.push(shoulder);

    const leg = new THREE.Group();
    leg.name = side < 0 ? "pedestrian-leg-left" : "pedestrian-leg-right";
    leg.position.set(side * 0.12, 0.78, 0);
    root.add(leg);
    addCylinder(leg, "pedestrian-thigh", mats.trousers, 0.09, 0.105, 0.38, 0, -0.19, 0);
    const knee = new THREE.Group();
    knee.position.y = -0.38;
    leg.add(knee);
    addCylinder(knee, "pedestrian-shin", mats.trousers, 0.065, 0.075, 0.34, 0, -0.17, 0);
    addMesh(knee, new THREE.BoxGeometry(0.15, 0.1, 0.27), mats.shoes, "pedestrian-shoe", 0, -0.34, 0.075);
    leg.userData.knee = knee;
    root.userData.legs = [...(root.userData.legs || []), leg];
  }

  if (unitRandom(random) < 0.28) {
    const bag = material(choose(random, [0x454d4c, 0x766b58, 0x4d5968]), 0.95);
    addMesh(body, new THREE.BoxGeometry(0.3, 0.38, 0.13), bag, "pedestrian-backpack", 0, 1.03, -0.2);
  }
  if (unitRandom(random) < 0.18) {
    addMesh(body, new THREE.BoxGeometry(0.34, 0.08, 0.34), mats.hair, "pedestrian-cap", 0, 1.72, 0.015);
  }

  root.userData.arms = arms;
  root.userData.body = body;
  return root;
}

function createSeatedPerson(random) {
  const root = new THREE.Group();
  root.name = "pedestrian-seated";
  root.userData.pedestrian = "seated";
  const mats = createPersonMaterials(random);

  addMesh(root, new THREE.BoxGeometry(0.43, 0.58, 0.29), mats.shirt, "seated-torso", 0, 1.03, -0.025);
  addMesh(root, new THREE.BoxGeometry(0.36, 0.2, 0.28), mats.trousers, "seated-pelvis", 0, 0.59, 0.02);
  addMesh(root, new THREE.SphereGeometry(0.16, 12, 10), mats.skin, "seated-head", 0, 1.5, 0.02);
  addMesh(root, new THREE.SphereGeometry(0.165, 10, 7, 0, Math.PI * 2, 0, Math.PI * 0.48), mats.hair, "seated-hair", 0, 1.58, 0);
  addMesh(root, new THREE.BoxGeometry(0.18, 0.16, 0.46), mats.trousers, "seated-thigh-left", -0.11, 0.5, 0.23);
  addMesh(root, new THREE.BoxGeometry(0.18, 0.16, 0.46), mats.trousers, "seated-thigh-right", 0.11, 0.5, 0.23);
  addMesh(root, new THREE.BoxGeometry(0.14, 0.4, 0.15), mats.trousers, "seated-shin-left", -0.11, 0.27, 0.44);
  addMesh(root, new THREE.BoxGeometry(0.14, 0.4, 0.15), mats.trousers, "seated-shin-right", 0.11, 0.27, 0.44);
  addMesh(root, new THREE.BoxGeometry(0.15, 0.1, 0.27), mats.shoes, "seated-shoe-left", -0.11, 0.065, 0.52);
  addMesh(root, new THREE.BoxGeometry(0.15, 0.1, 0.27), mats.shoes, "seated-shoe-right", 0.11, 0.065, 0.52);

  for (const side of [-1, 1]) {
    const arm = new THREE.Group();
    arm.position.set(side * 0.25, 1.27, 0.015);
    root.add(arm);
    arm.rotation.x = -0.28;
    addCylinder(arm, "seated-arm", mats.shirt, 0.07, 0.085, 0.34, 0, -0.17, 0);
    addMesh(arm, new THREE.SphereGeometry(0.06, 8, 7), mats.skin, "seated-hand", 0, -0.33, 0.02);
  }
  return root;
}

function createBench(group, colliders, x, z, facingZ) {
  const bench = new THREE.Group();
  bench.name = "street-bench";
  bench.position.set(x, 0, z);
  bench.rotation.y = facingZ > 0 ? 0 : Math.PI;
  group.add(bench);

  const wood = material(0x746c5d, 0.95);
  const darkWood = material(0x4d504b, 0.92);
  const metal = material(0x464d4b, 0.78);

  addMesh(bench, new THREE.BoxGeometry(2.0, 0.13, 0.57), wood, "bench-seat", 0, 0.55, 0);
  addMesh(bench, new THREE.BoxGeometry(2.0, 0.48, 0.11), wood, "bench-backrest", 0, 0.91, -0.24);
  addMesh(bench, new THREE.BoxGeometry(1.9, 0.045, 0.07), darkWood, "bench-back-detail", 0, 0.91, -0.175);

  for (const side of [-1, 1]) {
    addMesh(bench, new THREE.BoxGeometry(0.09, 0.51, 0.09), metal, "bench-leg", side * 0.72, 0.27, 0);
    addMesh(bench, new THREE.BoxGeometry(0.11, 0.08, 0.72), metal, "bench-foot", side * 0.72, 0.055, 0);
    addMesh(bench, new THREE.BoxGeometry(0.08, 0.57, 0.08), metal, "bench-back-support", side * 0.78, 0.78, -0.22);
  }

  const collider = {
    name: "street-bench-collider",
    minX: x - 1.05,
    maxX: x + 1.05,
    minZ: z - 0.4,
    maxZ: z + 0.4,
    enabled: true
  };
  colliders.push(collider);
  return { group: bench, collider, x, z, facingZ };
}

function updateCollider(agent) {
  const x = agent.root.position.x;
  const z = agent.root.position.z;
  agent.collider.minX = x - 0.22;
  agent.collider.maxX = x + 0.22;
  agent.collider.minZ = z - 0.22;
  agent.collider.maxZ = z + 0.22;
}

export function createPedestrians({
  colliders = [],
  traffic = null,
  houses = [],
  random = Math.random,
  pedestrianPlan = DEFAULT_PEDESTRIAN_PLAN
} = {}) {
  if (!Array.isArray(colliders) || !Array.isArray(houses) || typeof random !== "function") {
    throw new TypeError("createPedestrians requires collider and house arrays and a random function.");
  }

  const roadEdge = pedestrianPlan.roadEdge;
  const sidewalkWalkZ = pedestrianPlan.walkZ;
  const crosswalks = pedestrianPlan.crosswalkXs;
  const group = new THREE.Group();
  group.name = "street-pedestrians";
  const walkers = [];
  const crossingReservations = traffic?.crossingReservations ?? [];
  const sitters = [];
  const benches = [];
  let disposed = false;

  for (const { x, z, facingZ } of pedestrianPlan.benches) {
    const bench = createBench(group, colliders, x, z, facingZ);
    benches.push(bench);
    const sitter = createSeatedPerson(random);
    sitter.position.set(x, 0, z);
    sitter.rotation.y = facingZ > 0 ? 0 : Math.PI;
    sitter.userData.bench = bench.group.name;
    group.add(sitter);
    sitters.push(sitter);
  }

  function setPath(agent, points, onComplete = null) {
    agent.path = points.map(point => ({ x: point.x, z: point.z }));
    agent.pathIndex = 0;
    agent.onPathComplete = onComplete;
    agent.phase = agent.path.length ? "walking" : "idle";
    if (!agent.path.length) onComplete?.();
  }

  function scheduleIdle(agent) {
    agent.phase = "idle";
    agent.wait = randomBetween(random, 0.8, 2.8);
    agent.onPathComplete = null;
  }

  function startHouseEntry(agent, house) {
    if (disposed || house.reservedBy !== agent) {
      scheduleIdle(agent);
      return;
    }

    house.busy = true;
    house.interactable.enabled = false;
    agent.house = house;
    agent.phase = "door-enter-opening";
    house.door.animateOpen(430).then(() => {
      if (disposed) {
        house.door.reset();
        house.interactable.enabled = true;
        house.busy = false;
        return;
      }

      agent.root.visible = false;
      agent.collider.enabled = false;
      house.door.reset();
      agent.phase = "inside";
      agent.insideTimer = randomBetween(random, 7, 15);
    }).catch(() => {
      house.door.reset();
      house.interactable.enabled = true;
      house.busy = false;
      house.reservedBy = null;
      agent.house = null;
      scheduleIdle(agent);
    });
  }

  function startHouseExit(agent, house) {
    agent.phase = "door-exit-opening";
    house.door.animateOpen(430).then(() => {
      if (disposed) {
        house.door.reset();
        house.interactable.enabled = true;
        house.busy = false;
        return;
      }

      agent.root.position.set(0, 0.005, house.frontZ - house.frontSide * 0.62);
      agent.root.visible = true;
      agent.collider.enabled = true;
      updateCollider(agent);
      setPath(agent, [
        { x: 0, z: house.frontZ + house.frontSide * 0.95 }
      ], () => {
        house.door.reset();
        house.interactable.enabled = true;
        house.busy = false;
        house.reservedBy = null;
        agent.house = null;
        const sidewalkZ = house.sidewalkSide * sidewalkWalkZ;
        setPath(agent, [{ x: 0, z: sidewalkZ }], () => scheduleIdle(agent));
      });
    }).catch(() => {
      house.door.reset();
      house.interactable.enabled = true;
      house.busy = false;
      house.reservedBy = null;
      agent.house = null;
      scheduleIdle(agent);
    });
  }

  function isCrossingSafe(x, speed = 1.35) {
    const vehicles = traffic?.vehicles ?? [];
    for (const vehicle of vehicles) {
      const direction = vehicle.lane?.direction ?? 0;
      if (!direction) continue;
      const vehicleX = vehicle.root?.position?.x;
      if (!Number.isFinite(vehicleX)) continue;
      const distanceAhead = (x - vehicleX) * direction;
      const vehicleSpeed = Math.max(1, vehicle.speed || vehicle.baseSpeed || 7);
      const approachBuffer = Math.max(10, vehicleSpeed * 1.35 + vehicle.length / 2 + 2);
      const close = Math.abs(distanceAhead) <= vehicle.length / 2 + 2.5;
      if (close || (distanceAhead >= 0 && distanceAhead < approachBuffer)) return false;
    }

    return true;
  }

  function planWalk(agent) {
    if (disposed || agent.house || agent.phase === "inside") return;

    const roll = unitRandom(random);
    const house = houses.find(item => item.sidewalkSide === agent.side);

    if (roll < 0.15 && house && !house.busy) {
      house.busy = true;
      house.reservedBy = agent;
      agent.house = house;
      const sidewalkZ = agent.side * sidewalkWalkZ;
      const doorApproachZ = house.frontZ + house.frontSide * 0.95;
      setPath(agent, [
        { x: 0, z: sidewalkZ },
        { x: 0, z: doorApproachZ }
      ], () => startHouseEntry(agent, house));
      return;
    }

    if (roll < 0.31) {
      const crossingX = choose(random, crosswalks);
      const sidewalkZ = agent.side * sidewalkWalkZ;
      agent.crossingX = crossingX;
      setPath(agent, [
        { x: crossingX, z: sidewalkZ }
      ], () => {
        agent.phase = "crossing-wait";
        agent.wait = 0;
      });
      return;
    }

    const direction = unitRandom(random) < 0.5 ? -1 : 1;
    const distance = randomBetween(random, 8, 21);
    const targetX = Math.max(-roadEdge + 2, Math.min(roadEdge - 2, agent.root.position.x + direction * distance));
    setPath(agent, [
      { x: targetX, z: agent.side * sidewalkWalkZ }
    ], () => {
      agent.lastDirection = direction;
      scheduleIdle(agent);
    });
  }

  function makeWalker(x, side) {
    const root = createWalkerModel(random);
    root.position.set(x, 0.005, side * sidewalkWalkZ);
    root.rotation.y = unitRandom(random) < 0.5 ? Math.PI / 2 : -Math.PI / 2;
    group.add(root);

    const collider = {
      name: "pedestrian-collider",
      minX: x - 0.22,
      maxX: x + 0.22,
      minZ: side * sidewalkWalkZ - 0.22,
      maxZ: side * sidewalkWalkZ + 0.22,
      enabled: true
    };
    colliders.push(collider);

    const agent = {
      root,
      collider,
      side,
      speed: randomBetween(random, 1.05, 1.55),
      walkPhase: randomBetween(random, 0, Math.PI * 2),
      phase: "idle",
      wait: 0,
      path: [],
      pathIndex: 0,
      onPathComplete: null,
      house: null,
      insideTimer: 0,
      crossingX: null,
      lastDirection: 1
    };
    walkers.push(agent);
    planWalk(agent);
    return agent;
  }

  for (const walker of pedestrianPlan.initialWalkers) makeWalker(walker.x, walker.side);

  function animateWalker(agent, deltaTime, moving) {
    agent.walkPhase += deltaTime * (moving ? 8.2 : 1.2);
    const stride = moving ? Math.sin(agent.walkPhase) * 0.56 : Math.sin(agent.walkPhase) * 0.025;
    const opposite = -stride;
    agent.root.userData.body.position.y = Math.abs(stride) * 0.018;
    const arms = agent.root.userData.arms;
    const legs = agent.root.userData.legs;
    arms[0].rotation.x = -stride * 0.72;
    arms[1].rotation.x = -opposite * 0.72;
    legs[0].rotation.x = stride;
    legs[1].rotation.x = opposite;
  }

  function advancePath(agent, deltaTime) {
    const target = agent.path[agent.pathIndex];
    if (!target) {
      const done = agent.onPathComplete;
      agent.onPathComplete = null;
      done?.();
      return;
    }

    const x = agent.root.position.x;
    const z = agent.root.position.z;
    const dx = target.x - x;
    const dz = target.z - z;
    const distance = Math.hypot(dx, dz);
    if (distance > 0.001) {
      agent.root.rotation.y = Math.atan2(dx, dz);
      const step = agent.speed * deltaTime;
      const amount = Math.min(1, step / distance);
      agent.root.position.x = x + dx * amount;
      agent.root.position.z = z + dz * amount;
    }

    if (distance <= agent.speed * deltaTime + 0.001) {
      agent.root.position.x = target.x;
      agent.root.position.z = target.z;
      agent.pathIndex += 1;
      if (agent.pathIndex >= agent.path.length) {
        const done = agent.onPathComplete;
        agent.onPathComplete = null;
        done?.();
      }
    }
    updateCollider(agent);
  }

  function update(deltaTime, active = true) {
    if (disposed || !active) return;
    const dt = Math.max(0, Math.min(Number(deltaTime) || 0, 0.05));
    if (dt <= 0) return;

    for (const agent of walkers) {
      let moving = false;
      if (agent.phase === "inside") {
        agent.insideTimer -= dt;
        if (agent.insideTimer <= 0 && agent.house) startHouseExit(agent, agent.house);
      } else if (agent.phase === "crossing-wait") {
        if (isCrossingSafe(agent.crossingX, agent.speed)) {
          const nextSide = -agent.side;
          const reservation = { x: agent.crossingX, pedestrian: agent };
          crossingReservations.push(reservation);
          agent.crossingReservation = reservation;
          setPath(agent, [
            { x: agent.crossingX, z: nextSide * sidewalkWalkZ }
          ], () => {
            const reservationIndex = crossingReservations.indexOf(reservation);
            if (reservationIndex >= 0) crossingReservations.splice(reservationIndex, 1);
            agent.crossingReservation = null;
            agent.side = nextSide;
            agent.crossingX = null;
            planWalk(agent);
          });
        }
      } else if (agent.phase === "walking") {
        moving = true;
        advancePath(agent, dt);
      } else if (agent.phase === "idle") {
        agent.wait -= dt;
        if (agent.wait <= 0) planWalk(agent);
      }
      animateWalker(agent, dt, moving);
    }
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    for (const agent of walkers) {
      const index = colliders.indexOf(agent.collider);
      if (index >= 0) colliders.splice(index, 1);
      if (agent.crossingReservation) {
        const reservationIndex = crossingReservations.indexOf(agent.crossingReservation);
        if (reservationIndex >= 0) crossingReservations.splice(reservationIndex, 1);
        agent.crossingReservation = null;
      }
      if (agent.house) {
        agent.house.door.reset();
        agent.house.interactable.enabled = true;
        agent.house.busy = false;
        agent.house.reservedBy = null;
      }
    }
    for (const bench of benches) {
      const index = colliders.indexOf(bench.collider);
      if (index >= 0) colliders.splice(index, 1);
    }
    walkers.length = 0;
  }

  return {
    group,
    walkers,
    sitters,
    benches,
    update,
    dispose,
    isCrossingSafe
  };
}
