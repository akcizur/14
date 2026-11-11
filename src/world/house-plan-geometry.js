import * as THREE from "three";
import { addBox, makeMaterial } from "./geometry.js";

function localToWorldZ(centerZ, frontSide, localZ) {
  return centerZ + frontSide * localZ;
}

function addPartitionPiece(group, colliders, name, partition, center, length, y, height, thickness, wallMaterial, centerZ, frontSide) {
  if (length <= 0 || height <= 0) return null;
  const z = partition.axis === "x" ? localToWorldZ(centerZ, frontSide, center) : localToWorldZ(centerZ, frontSide, partition.at);
  const x = partition.axis === "x" ? partition.at : center;
  const width = partition.axis === "x" ? thickness : length;
  const depth = partition.axis === "x" ? length : thickness;
  return addBox(group, colliders, name, x, y, z, width, height, depth, wallMaterial, Boolean(colliders));
}

export function addPlanPartitions({
  group,
  colliders = null,
  plan,
  centerZ,
  frontSide,
  material: wallMaterial,
  prefix = "plan",
  thickness = plan.wall.thickness,
  height = plan.wall.height,
  addTrim = true
}) {
  if (!group || !plan || ![-1, 1].includes(frontSide)
    || ![centerZ, thickness, height].every(Number.isFinite)) {
    throw new TypeError("addPlanPartitions requires a group, plan and valid orientation.");
  }

  const trimMaterial = makeMaterial(plan.facade.trimColor, { roughness: 0.84 });
  for (const partition of plan.partitions) {
    const start = partition.from;
    const end = partition.to;
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
      throw new RangeError("Invalid partition range: " + partition.id);
    }

    const openings = [...(partition.openings || [])]
      .map(opening => ({
        start: opening.at - opening.width / 2,
        end: opening.at + opening.width / 2,
        height: opening.height ?? plan.interiorDoor?.height ?? 2.15
      }))
      .sort((a, b) => a.start - b.start);

    let cursor = start;
    openings.forEach((opening, index) => {
      if (!Number.isFinite(opening.start) || !Number.isFinite(opening.end)
        || opening.start < cursor || opening.end <= opening.start || opening.end > end
        || opening.height <= 0 || opening.height >= height) {
        throw new RangeError("Invalid or overlapping door opening in partition: " + partition.id);
      }

      addPartitionPiece(group, colliders, prefix + "-" + partition.id + "-segment-" + index,
        partition, (cursor + opening.start) / 2, opening.start - cursor, 0, height,
        thickness, wallMaterial, centerZ, frontSide);
      // The lintel is overhead geometry. The player collider is a 2D
      // floor footprint, so adding a collider here would turn the high beam
      // into an invisible full-height wall across the entire doorway.
      addPartitionPiece(group, null, prefix + "-" + partition.id + "-lintel-" + index,
        partition, (opening.start + opening.end) / 2, opening.end - opening.start,
        opening.height, height - opening.height, thickness, wallMaterial, centerZ, frontSide);

      if (addTrim) {
        const jamb = plan.interiorDoor?.trimWidth ?? 0.065;
        addPartitionPiece(group, null, prefix + "-" + partition.id + "-jamb-" + index + "-a",
          partition, opening.start + jamb / 2, jamb, 0, opening.height,
          thickness + (plan.interiorDoor?.trimDepth ?? 0.055), trimMaterial, centerZ, frontSide);
        addPartitionPiece(group, null, prefix + "-" + partition.id + "-jamb-" + index + "-b",
          partition, opening.end - jamb / 2, jamb, 0, opening.height,
          thickness + 0.045, trimMaterial, centerZ, frontSide);
        addPartitionPiece(group, null, prefix + "-" + partition.id + "-header-" + index,
          partition, (opening.start + opening.end) / 2, opening.end - opening.start,
          opening.height - 0.045, 0.09, thickness + 0.045, trimMaterial, centerZ, frontSide);
      }
      cursor = opening.end;
    });

    addPartitionPiece(group, colliders, prefix + "-" + partition.id + "-end",
      partition, (cursor + end) / 2, end - cursor, 0, height,
      thickness, wallMaterial, centerZ, frontSide);
  }
}

const COLLIDABLE_FURNITURE = new Set([
  "living-sofa-base", "living-coffee-table", "living-media-console",
  "kitchen-lower-cabinets", "kitchen-fridge",
  "bedroom-bed-frame", "bedroom-wardrobe",
  "bathroom-bath", "bathroom-vanity", "bathroom-toilet-base",
  "office-desk", "office-bookshelf"
]);

function addFurnitureBox(group, name, x, y, z, width, height, depth, mat, rotationY = 0, colliders = null, collisionContext = null) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), mat);
  mesh.name = name;
  mesh.position.set(x, y + height / 2, z);
  mesh.rotation.y = rotationY;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);

  if (colliders && collisionContext && COLLIDABLE_FURNITURE.has(name)) {
    const cosine = Math.abs(Math.cos(rotationY));
    const sine = Math.abs(Math.sin(rotationY));
    const radiusX = (width * cosine + depth * sine) / 2;
    const radiusZ = (width * sine + depth * cosine) / 2;
    const worldZ = collisionContext.centerZ + collisionContext.frontSide * z;
    colliders.push({
      name: name + "-collider",
      source: name,
      minX: x - radiusX,
      maxX: x + radiusX,
      minZ: worldZ - radiusZ,
      maxZ: worldZ + radiusZ,
      enabled: true
    });
  }
  return mesh;
}

function makeRoomMaterials() {
  return {
    wood: makeMaterial(0x756b5b, { roughness: 0.93 }),
    darkWood: makeMaterial(0x494743, { roughness: 0.9 }),
    upholstery: makeMaterial(0x737b76, { roughness: 0.96 }),
    fabric: makeMaterial(0xb8b0a0, { roughness: 0.98 }),
    metal: makeMaterial(0x5c6260, { metalness: 0.34, roughness: 0.58 }),
    ceramic: makeMaterial(0xd4d3ca, { roughness: 0.36 }),
    cabinet: makeMaterial(0xa39b89, { roughness: 0.88 }),
    dark: makeMaterial(0x333a3a, { roughness: 0.8 }),
    glass: makeMaterial(0x53696b, { roughness: 0.32, metalness: 0.12 })
  };
}

export function addRoomFurnishings({ group, plan, centerZ, frontSide, colliders = null }) {
  if (!group || !plan || ![-1, 1].includes(frontSide) || !Number.isFinite(centerZ)) {
    throw new TypeError("addRoomFurnishings requires a group, plan and orientation.");
  }
  const root = new THREE.Group();
  root.name = plan.id + "-procedural-furnishings";
  root.position.set(0, 0, centerZ);
  // Mirror only the depth axis so rooms stay on their planned left/right side
  // when the entrance facade faces the opposite street direction.
  root.scale.z = frontSide;
  group.add(root);
  const m = makeRoomMaterials();
  const addFurniture = (...args) => {
    const rotationY = typeof args[8] === "number" ? args[8] : 0;
    return addFurnitureBox(root, ...args.slice(0, 8), rotationY, colliders, { centerZ, frontSide });
  };

  for (const room of plan.rooms) {
    const x = room.x;
    const z = room.z;

    if (room.type === "living") {
      addFurniture(room.id + "-sofa-base", x, 0.32, z - 0.7, 2.25, 0.42, 0.86, m.upholstery);
      addFurniture(room.id + "-sofa-back", x, 0.65, z - 1.07, 2.25, 0.75, 0.16, m.upholstery);
      for (const side of [-1, 1]) {
        addFurniture(room.id + "-sofa-arm", x + side * 1.04, 0.56, z - 0.7, 0.16, 0.58, 0.86, m.upholstery);
      }
      addFurniture(room.id + "-coffee-table", x, 0.39, z + 0.72, 1.1, 0.12, 0.64, m.wood);
      for (const legX of [-0.43, 0.43]) for (const legZ of [-0.22, 0.22]) {
        addFurniture(room.id + "-coffee-table-leg", x + legX, 0, z + 0.72 + legZ, 0.055, 0.38, 0.055, m.darkWood);
      }
      addFurniture(room.id + "-media-console", x, 0.28, z - room.depth * 0.42, 1.8, 0.5, 0.34, m.wood);
      addFurniture(room.id + "-television", x, 1.05, z - room.depth * 0.42 + 0.19, 1.35, 0.82, 0.07, m.dark);
    }

    if (room.type === "kitchen") {
      const counterX = x + room.width * 0.27;
      const counterLength = Math.min(3.1, room.depth * 0.7);
      addFurniture(room.id + "-lower-cabinets", counterX, 0, z - 0.1, 0.62, 0.88, counterLength, m.cabinet);
      addFurniture(room.id + "-countertop", counterX, 0.88, z - 0.1, 0.72, 0.08, counterLength + 0.08, m.darkWood);
      addFurniture(room.id + "-upper-cabinets", counterX, 1.48, z - 0.1, 0.43, 0.72, counterLength, m.cabinet);
      addFurniture(room.id + "-fridge", x - room.width * 0.28, 0, z - 1.45, 0.78, 1.95, 0.78, m.ceramic);
      addFurniture(room.id + "-sink", counterX, 0.97, z + 0.6, 0.42, 0.035, 0.52, m.metal);
      addFurniture(room.id + "-stove", counterX, 0.98, z - 0.9, 0.52, 0.035, 0.62, m.dark);
    }

    if (room.type === "bedroom") {
      const bedX = x + room.width * 0.1;
      addFurniture(room.id + "-bed-frame", bedX, 0.18, z, 1.75, 0.36, 2.25, m.darkWood);
      addFurniture(room.id + "-mattress", bedX, 0.39, z, 1.64, 0.18, 2.12, m.fabric);
      addFurniture(room.id + "-pillow-left", bedX - 0.42, 0.51, z + 0.72, 0.66, 0.13, 0.42, m.ceramic);
      addFurniture(room.id + "-pillow-right", bedX + 0.42, 0.51, z + 0.72, 0.66, 0.13, 0.42, m.ceramic);
      addFurniture(room.id + "-headboard", bedX, 0.58, z + 1.18, 1.85, 0.9, 0.12, m.wood);
      addFurniture(room.id + "-wardrobe", x - room.width * 0.32, 0, z - 1.45, 1.35, 2.2, 0.62, m.wood);
      addFurniture(room.id + "-nightstand", bedX + 1.2, 0, z + 0.72, 0.48, 0.58, 0.48, m.wood);
    }

    if (room.type === "bathroom") {
      addFurniture(room.id + "-bath", x + room.width * 0.28, 0.08, z - 1.25, 1.15, 0.38, 1.95, m.ceramic);
      addFurniture(room.id + "-vanity", x - room.width * 0.25, 0, z - 1.15, 0.9, 0.82, 0.52, m.wood);
      addFurniture(room.id + "-washbasin", x - room.width * 0.25, 0.84, z - 1.15, 0.88, 0.08, 0.56, m.ceramic);
      addFurniture(room.id + "-mirror", x - room.width * 0.25, 1.15, z - 1.43, 0.65, 0.72, 0.045, m.glass);
      addFurniture(room.id + "-toilet-base", x + room.width * 0.25, 0, z + 1.25, 0.48, 0.42, 0.64, m.ceramic);
      addFurniture(room.id + "-toilet-tank", x + room.width * 0.25, 0.42, z + 0.98, 0.44, 0.72, 0.22, m.ceramic);
    }

    if (room.type === "office") {
      addFurniture(room.id + "-desk", x, 0.73, z - 1.45, 1.9, 0.12, 0.72, m.wood);
      addFurniture(room.id + "-desk-side", x - 0.72, 0, z - 1.45, 0.1, 0.72, 0.1, m.darkWood);
      addFurniture(room.id + "-desk-side", x + 0.72, 0, z - 1.45, 0.1, 0.72, 0.1, m.darkWood);
      addFurniture(room.id + "-chair-seat", x, 0.48, z - 0.45, 0.58, 0.1, 0.58, m.upholstery);
      addFurniture(room.id + "-chair-back", x, 0.9, z - 0.7, 0.58, 0.78, 0.12, m.upholstery);
      addFurniture(room.id + "-bookshelf", x + room.width * 0.34, 0, z + 1.3, 0.42, 1.9, 1.25, m.wood);
    }
  }
  return root;
}
