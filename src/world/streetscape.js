import * as THREE from "three";
import { makeSurfaceMaterial } from "./geometry.js";

function addMesh(parent, name, geometry, material, x, y, z, castShadow = true) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  mesh.position.set(x, y, z);
  mesh.castShadow = castShadow;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function addCollider(colliders, name, minX, maxX, minZ, maxZ) {
  colliders.push({ name, minX, maxX, minZ, maxZ, enabled: true });
}

function seededRandom(seed) {
  let state = (Number(seed) || 1) >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function addBranch(parent, start, end, radius, material, name) {
  const from = new THREE.Vector3(...start);
  const to = new THREE.Vector3(...end);
  const direction = new THREE.Vector3().subVectors(to, from);
  const length = direction.length();
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.48, radius, length, 7),
    material
  );
  mesh.name = name;
  mesh.position.copy(from).add(to).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function buildTree(group, colliders, tree, index) {
  const random = seededRandom(140 + index * 97 + Math.round((tree.x + tree.z) * 10));
  const root = new THREE.Group();
  root.name = "garden-tree-" + index;
  root.position.set(tree.x, 0, tree.z);
  group.add(root);

  const bark = makeSurfaceMaterial("wood", 0x655242, {
    roughness: 0.98,
    bumpScale: 0.026
  }, [1.2, 2.8]);
  const trunkHeight = Math.max(1.65, tree.trunkHeight ?? 1.8);
  const trunk = addMesh(
    root,
    "garden-tree-trunk",
    new THREE.CylinderGeometry(0.085, 0.17, trunkHeight, 9),
    bark,
    0,
    trunkHeight / 2,
    0
  );
  trunk.castShadow = true;
  addCollider(colliders, "garden-tree-trunk",
    tree.x - 0.2, tree.x + 0.2, tree.z - 0.2, tree.z + 0.2);

  const branchStarts = [
    [-0.02, trunkHeight * 0.58, 0],
    [0.02, trunkHeight * 0.72, 0],
    [0, trunkHeight * 0.66, -0.02]
  ];
  for (let branch = 0; branch < branchStarts.length; branch += 1) {
    const angle = random() * Math.PI * 2;
    const reach = 0.72 + random() * 0.34;
    const end = [
      Math.cos(angle) * reach,
      trunkHeight + 0.12 + random() * 0.36,
      Math.sin(angle) * reach
    ];
    addBranch(root, branchStarts[branch], end, 0.08, bark, "garden-tree-branch-" + branch);
  }

  const leafColors = [0x4f694b, 0x5b754f, 0x668057, 0x72885c, 0x819064];
  const leafGeometry = new THREE.SphereGeometry(0.25, 10, 8);
  const leafMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.98,
    metalness: 0,
    vertexColors: false
  });
  const crownRadius = tree.crownRadius ?? 1.25;
  const crownY = (tree.crownY ?? 2.0) + 0.6;
  const clusterCount = 82;
  const foliage = new THREE.InstancedMesh(leafGeometry, leafMaterial, clusterCount);
  foliage.name = "garden-tree-foliage-" + index;
  foliage.castShadow = true;
  foliage.receiveShadow = true;
  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();

  for (let cluster = 0; cluster < clusterCount; cluster += 1) {
    const angle = random() * Math.PI * 2;
    const radial = Math.sqrt(random()) * crownRadius * 0.94;
    const vertical = (random() * 2 - 1) * 0.78;
    const size = 0.66 + random() * 0.66;
    position.set(
      Math.cos(angle) * radial,
      crownY + vertical,
      Math.sin(angle) * radial
    );
    quaternion.setFromEuler(new THREE.Euler(
      random() * 0.55,
      random() * Math.PI * 2,
      random() * 0.55
    ));
    scale.set(size * (0.9 + random() * 0.18), size, size * (0.9 + random() * 0.18));
    matrix.compose(position, quaternion, scale);
    foliage.setMatrixAt(cluster, matrix);
    const tint = new THREE.Color(leafColors[Math.floor(random() * leafColors.length)]);
    tint.multiplyScalar(0.88 + random() * 0.22);
    foliage.setColorAt(cluster, tint);
  }
  foliage.instanceMatrix.needsUpdate = true;
  if (foliage.instanceColor) foliage.instanceColor.needsUpdate = true;
  root.add(foliage);

  return root;
}

function addFencePanel(group, colliders, start, end, name, style, materials) {
  const dx = end.x - start.x;
  const dz = end.z - start.z;
  const length = Math.hypot(dx, dz);
  if (length < 0.4) return;
  const alongX = Math.abs(dx) >= Math.abs(dz);
  const centerX = (start.x + end.x) / 2;
  const centerZ = (start.z + end.z) / 2;
  const rotationY = alongX ? 0 : Math.PI / 2;

  const dimensions = (run, height, depth) => alongX
    ? [run, height, depth]
    : [depth, height, run];
  const addRun = (part, y, height, depth, material) => {
    const [width, partHeight, partDepth] = dimensions(length, height, depth);
    return addMesh(
      group,
      name + "-" + part,
      new THREE.BoxGeometry(width, partHeight, partDepth),
      material,
      centerX,
      y,
      centerZ
    );
  };

  addRun("stone-plinth", 0.16, 0.32, 0.2, materials.stone);
  addRun("lower-rail", 0.43, 0.07, 0.075, materials.metal);
  addRun("upper-rail", 0.98, 0.07, 0.075, materials.metal);

  const barGeometry = style === "wood"
    ? new THREE.BoxGeometry(0.07, 0.57, 0.055)
    : new THREE.BoxGeometry(0.034, 0.62, 0.034);
  const barMaterial = style === "wood" ? materials.wood : materials.metal;
  const count = Math.max(2, Math.floor(length / (style === "wood" ? 0.25 : 0.17)));
  const bars = new THREE.InstancedMesh(barGeometry, barMaterial, count);
  bars.name = name + "-vertical-pickets";
  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3(1, 1, 1);

  for (let index = 0; index < count; index += 1) {
    const t = (index + 0.5) / count;
    position.set(
      start.x + dx * t,
      style === "wood" ? 0.73 : 0.72,
      start.z + dz * t
    );
    matrix.compose(position, quaternion, scale);
    bars.setMatrixAt(index, matrix);
  }
  bars.instanceMatrix.needsUpdate = true;
  bars.castShadow = true;
  bars.receiveShadow = true;
  group.add(bars);

  for (const [postIndex, point] of [[0, start], [1, end]]) {
    addMesh(
      group,
      name + "-post-" + postIndex,
      new THREE.BoxGeometry(0.18, 1.18, 0.18),
      materials.stone,
      point.x,
      0.59,
      point.z
    );
  }

  const pad = 0.11;
  addCollider(
    colliders,
    "garden-fence",
    Math.min(start.x, end.x) - (alongX ? 0 : pad),
    Math.max(start.x, end.x) + (alongX ? 0 : pad),
    Math.min(start.z, end.z) - (alongX ? pad : 0),
    Math.max(start.z, end.z) + (alongX ? pad : 0)
  );
}

function buildGardenBoundary(group, colliders, site, building, index) {
  const plan = building.plan;
  const entry = plan.entry;
  const frontZ = building.frontZ;
  const frontSide = building.frontSide;
  const halfWidth = entry.path.lawnWidth / 2;
  const boundaryZ = frontZ + frontSide * (entry.path.setback + entry.path.lawnDepth / 2 - 0.04);
  const houseLineZ = frontZ + frontSide * 0.24;
  const gateHalfWidth = Math.max(1.25, entry.path.width / 2 + 0.24);
  const style = index === 0 ? "metal" : "wood";

  const materials = {
    stone: makeSurfaceMaterial("concrete", index === 0 ? 0xaaa69c : 0x9eaaa7, {
      roughness: 0.95,
      bumpScale: 0.035
    }, [1.3, 1.2]),
    metal: makeSurfaceMaterial("metal", 0x333b3a, {
      metalness: 0.38,
      roughness: 0.62,
      bumpScale: 0.004
    }, [1.2, 1.2]),
    wood: makeSurfaceMaterial("wood", 0x625a4d, {
      roughness: 0.91,
      bumpScale: 0.015
    }, [1.4, 1])
  };

  addFencePanel(group, colliders,
    { x: -halfWidth, z: boundaryZ }, { x: -gateHalfWidth, z: boundaryZ },
    site.id + "-front-fence-left", style, materials);
  addFencePanel(group, colliders,
    { x: gateHalfWidth, z: boundaryZ }, { x: halfWidth, z: boundaryZ },
    site.id + "-front-fence-right", style, materials);

  for (const side of [-1, 1]) {
    addFencePanel(group, colliders,
      { x: side * halfWidth, z: boundaryZ },
      { x: side * halfWidth, z: houseLineZ },
      site.id + "-side-fence-" + (side < 0 ? "left" : "right"),
      style,
      materials
    );
  }

  const roadFacingZ = boundaryZ + frontSide * 0.105;
  const mailbox = new THREE.Group();
  mailbox.name = site.id + "-mailbox";
  mailbox.position.set(-gateHalfWidth + 0.15, 0.96, roadFacingZ);
  const box = addMesh(
    mailbox,
    "mailbox-body",
    new THREE.BoxGeometry(0.38, 0.27, 0.18),
    materials.metal,
    0,
    0,
    0
  );
  box.castShadow = true;
  addMesh(
    mailbox,
    "mailbox-lid",
    new THREE.BoxGeometry(0.42, 0.055, 0.2),
    materials.stone,
    0,
    0.16,
    0
  );
  group.add(mailbox);

  const hedgeMaterial = new THREE.MeshStandardMaterial({
    color: index === 0 ? 0x536c4d : 0x5d7252,
    roughness: 0.98,
    flatShading: true
  });
  const hedgeGeometry = new THREE.IcosahedronGeometry(0.58, 1);
  for (const side of [-1, 1]) {
    for (let bush = 0; bush < 3; bush += 1) {
      const x = side * (2.45 + bush * 0.92);
      const z = frontZ + frontSide * (3.45 + (bush % 2) * 0.22);
      const shrub = addMesh(
        group,
        site.id + "-front-hedge-" + side + "-" + bush,
        hedgeGeometry,
        hedgeMaterial,
        x,
        0.44,
        z
      );
      shrub.scale.set(0.95, 0.72 + (bush % 2) * 0.12, 0.72);
      shrub.rotation.y = bush * 0.7;
    }
  }

  const sconceBase = makeSurfaceMaterial("metal", 0x555b59, {
    metalness: 0.3,
    roughness: 0.56
  }, [1, 1]);
  const glow = new THREE.MeshStandardMaterial({
    color: 0xffedcf,
    emissive: 0xffdba2,
    emissiveIntensity: 0.24,
    roughness: 0.4
  });
  const facadeZ = frontZ + frontSide * (plan.wall.thickness / 2 + 0.045);
  const sconce = new THREE.Group();
  sconce.name = site.id + "-entrance-sconce";
  sconce.position.set(-1.0, 2.18, facadeZ);
  sconce.rotation.y = frontSide < 0 ? Math.PI : 0;
  addMesh(sconce, "sconce-backplate", new THREE.BoxGeometry(0.17, 0.29, 0.055), sconceBase, 0, 0, 0);
  addMesh(sconce, "sconce-diffuser", new THREE.BoxGeometry(0.105, 0.17, 0.09), glow, 0, -0.01, 0.058, false);
  group.add(sconce);
  const entranceLight = new THREE.PointLight(0xffdcae, 0.28, 4.2, 2);
  entranceLight.name = site.id + "-entrance-light";
  entranceLight.position.set(-1.0, 2.18, facadeZ + frontSide * 0.18);
  group.add(entranceLight);
}

function addStreetLamp(group, colliders, x, z, index) {
  const root = new THREE.Group();
  root.name = "street-lamp-" + index;
  root.position.set(x, 0, z);
  group.add(root);

  const poleMaterial = new THREE.MeshStandardMaterial({
    color: 0x505856,
    metalness: 0.56,
    roughness: 0.48
  });
  const housingMaterial = new THREE.MeshStandardMaterial({
    color: 0x303937,
    metalness: 0.38,
    roughness: 0.58
  });
  const diffuserMaterial = new THREE.MeshStandardMaterial({
    color: 0xe4e0d2,
    emissive: 0xffe6bb,
    emissiveIntensity: 0.16,
    roughness: 0.4
  });

  addMesh(root, "lamp-foot", new THREE.CylinderGeometry(0.15, 0.18, 0.22, 12),
    poleMaterial, 0, 0.11, 0);
  addMesh(root, "lamp-pole", new THREE.CylinderGeometry(0.045, 0.085, 4.45, 10),
    poleMaterial, 0, 2.42, 0);

  const roadDirection = z > 0 ? -1 : 1;
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 4.58, 0),
    new THREE.Vector3(0, 4.88, roadDirection * 0.2),
    new THREE.Vector3(0, 4.88, roadDirection * 0.74)
  ]);
  addMesh(root, "lamp-arm", new THREE.TubeGeometry(curve, 12, 0.035, 7, false),
    poleMaterial, 0, 0, 0);
  addMesh(root, "lamp-head", new THREE.BoxGeometry(0.47, 0.11, 0.2),
    housingMaterial, 0, 4.84, roadDirection * 0.76);
  addMesh(root, "lamp-diffuser", new THREE.BoxGeometry(0.36, 0.018, 0.145),
    diffuserMaterial, 0, 4.78, roadDirection * 0.76, false);

  addCollider(colliders, "street-lamp-post",
    x - 0.12, x + 0.12, z - 0.12, z + 0.12);
}

function addRoadHardware(group) {
  const metal = new THREE.MeshStandardMaterial({
    color: 0x515957,
    metalness: 0.48,
    roughness: 0.7
  });
  const dark = new THREE.MeshStandardMaterial({ color: 0x252c2b, roughness: 0.96 });

  const manhole = new THREE.Group();
  manhole.name = "street-manhole";
  manhole.position.set(0, 0.014, 0);
  addMesh(manhole, "manhole-rim", new THREE.CylinderGeometry(0.43, 0.43, 0.035, 28), metal, 0, 0, 0);
  addMesh(manhole, "manhole-cover", new THREE.CylinderGeometry(0.365, 0.365, 0.018, 28), dark, 0, 0.025, 0);
  for (let line = -2; line <= 2; line += 1) {
    addMesh(manhole, "manhole-rib-" + line,
      new THREE.BoxGeometry(0.49, 0.012, 0.018), metal, 0, 0.038, line * 0.105);
  }
  group.add(manhole);

  for (const side of [-1, 1]) {
    for (const x of [-16, 0, 16]) {
      const drain = new THREE.Group();
      drain.name = "road-storm-drain-" + side + "-" + x;
      drain.position.set(x, 0.018, side * 4.02);
      addMesh(drain, "drain-frame", new THREE.BoxGeometry(0.72, 0.035, 0.27), metal, 0, 0, 0);
      for (let slot = -3; slot <= 3; slot += 1) {
        addMesh(drain, "drain-slot-" + slot,
          new THREE.BoxGeometry(0.018, 0.012, 0.22), dark, slot * 0.095, 0.022, 0);
      }
      group.add(drain);
    }
  }
}

/**
 * Adds the small-scale built environment missing from the broad street layout:
 * fenced front gardens, hedges, wall fixtures, natural tree crowns, lamps and
 * the drainage hardware normally visible at street level.
 */
export function buildResidentialStreetDetails({
  group,
  worldPlan,
  buildings,
  colliders = []
} = {}) {
  if (!group?.add || !worldPlan?.street || !Array.isArray(worldPlan.houses) || !buildings) {
    throw new TypeError("buildResidentialStreetDetails requires a world group, plan and building map.");
  }

  worldPlan.street.trees.forEach((tree, index) => buildTree(group, colliders, tree, index));
  worldPlan.houses.forEach((site, index) => {
    const building = buildings.get(site.planId);
    if (building) buildGardenBoundary(group, colliders, site, building, index);
  });

  const lamps = [];
  for (const side of [-1, 1]) {
    for (const x of [-27.5, 27.5]) {
      const z = side * 5.72;
      lamps.push({ x, z });
      addStreetLamp(group, colliders, x, z, (side > 0 ? 2 : 0) + (x > 0 ? 1 : 0));
    }
  }
  addRoadHardware(group);

  return { treeCount: worldPlan.street.trees.length, lampCount: lamps.length, lamps };
}
