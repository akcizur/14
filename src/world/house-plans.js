const deepFreeze = value => {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
};

const INTERIOR_DOOR = { width: 1.24, height: 2.15, trimWidth: 0.065, trimDepth: 0.055 };

const BASE_ENTRY = {
  x: 0,
  width: 1.32,
  height: 2.22,
  frameHeight: 2.28,
  leafWidth: 1.22,
  leafHeight: 2.18,
  frameDepth: 0.22,
  thresholdDepth: 0.3,
  interactionRange: 2.45,
  spawn: { outsideDistance: 1.8, insideDistance: 1.6 },
  path: { width: 1.8, length: 5.6, lawnWidth: 15, lawnDepth: 6.2, setback: 2.7 }
};

export const HOUSE_PLANS = deepFreeze({
  houseA: {
    id: "houseA",
    label: "Rodinný dům A",
    archetype: "central-hall",
    footprint: { width: 12, depth: 10 },
    wall: { height: 3.05, thickness: 0.26 },
    entry: BASE_ENTRY,
    interiorDoor: INTERIOR_DOOR,
    roof: { type: "gable", pitch: 0.34, overhang: 0.8, sideOverhang: 0.42, color: 0x555a59 },
    facade: {
      wallColor: 0xc9c0af,
      trimColor: 0xe0dacc,
      doorColor: 0x6a574a,
      porch: "covered",
      chimney: false,
      windows: [
        { side: "front", x: -3.55, width: 1.75, height: 1.15, y: 1.85 },
        { side: "front", x: 3.55, width: 1.75, height: 1.15, y: 1.85 },
        { side: "rear", x: -3.5, width: 1.8, height: 1.15, y: 1.65 },
        { side: "rear", x: 3.5, width: 1.8, height: 1.15, y: 1.65 }
      ]
    },
    rooms: [
      { id: "living", name: "Obývací pokoj", type: "living", x: -3.62, z: 2.5, width: 4.75, depth: 5 },
      { id: "kitchen", name: "Kuchyně", type: "kitchen", x: 3.62, z: 2.5, width: 4.75, depth: 5 },
      { id: "bedroom", name: "Ložnice", type: "bedroom", x: -3.62, z: -2.5, width: 4.75, depth: 5 },
      { id: "bathroom", name: "Koupelna", type: "bathroom", x: 3.62, z: -2.5, width: 4.75, depth: 5 }
    ],
    partitions: [
      { id: "hall-left", axis: "x", at: -1.25, from: -5, to: 5, openings: [{ at: -2.5, width: 1.24 }, { at: 2.5, width: 1.24 }] },
      { id: "hall-right", axis: "x", at: 1.25, from: -5, to: 5, openings: [{ at: -2.5, width: 1.24 }, { at: 2.5, width: 1.24 }] },
      { id: "room-divider-left", axis: "z", at: 0, from: -6, to: -1.25, openings: [] },
      { id: "room-divider-right", axis: "z", at: 0, from: 1.25, to: 6, openings: [] }
    ],
    finish: { floorColor: 0x918d82, wallColor: 0xd3cfc4, ceilingColor: 0xd8d5ca },
    details: {
      entryStep: true,
      porchPosts: true,
      porch: { width: 3.7, depth: 1.75, height: 2.78, postOffsetX: 1.48, postOffsetZ: 0.68, postHeight: 2.55 },
      steps: { count: 2, width: 2.05, depth: 0.62, rise: 0.1, firstOffset: 0.42, offsetStep: 0.44 },
      chimney: false,
      chimneyPlacement: null
    }
  },
  houseB: {
    id: "houseB",
    label: "Rodinný dům B",
    archetype: "five-room",
    footprint: { width: 12, depth: 10 },
    wall: { height: 3.15, thickness: 0.26 },
    entry: BASE_ENTRY,
    interiorDoor: INTERIOR_DOOR,
    roof: { type: "gable", pitch: 0.39, overhang: 0.95, sideOverhang: 0.42, color: 0x4b5355 },
    facade: {
      wallColor: 0xb4c0bb,
      trimColor: 0xd6d8cf,
      doorColor: 0x536d69,
      porch: "stoop",
      chimney: true,
      windows: [
        { side: "front", x: -3.55, width: 1.75, height: 1.15, y: 1.85 },
        { side: "front", x: 3.55, width: 1.75, height: 1.15, y: 1.85 },
        { side: "rear", x: -3.5, width: 1.8, height: 1.15, y: 1.65 },
        { side: "rear", x: 3.5, width: 1.8, height: 1.15, y: 1.65 }
      ]
    },
    rooms: [
      { id: "living", name: "Obývací pokoj", type: "living", x: -2.75, z: 2.5, width: 6.0, depth: 5 },
      { id: "kitchen", name: "Kuchyně", type: "kitchen", x: 3.2, z: 2.5, width: 5.4, depth: 5 },
      { id: "bedroom", name: "Ložnice", type: "bedroom", x: -3.775, z: -2.5, width: 4.45, depth: 5 },
      { id: "bathroom", name: "Koupelna", type: "bathroom", x: 0.575, z: -2.5, width: 4.25, depth: 5 },
      { id: "office", name: "Pracovna", type: "office", x: 4.35, z: -2.5, width: 3.3, depth: 5 }
    ],
    partitions: [
      { id: "rear-divider-left", axis: "z", at: 0, from: -6, to: -1.55, openings: [{ at: -3.8, width: 1.24 }] },
      { id: "rear-divider-right", axis: "z", at: 0, from: -1.55, to: 6, openings: [{ at: 0.7, width: 1.24 }, { at: 4.0, width: 1.24 }] },
      { id: "bed-bath-divider", axis: "x", at: -1.55, from: -5, to: 0, openings: [{ at: -2.5, width: 1.24 }] },
      { id: "bath-office-divider", axis: "x", at: 2.7, from: -5, to: 0, openings: [{ at: -2.5, width: 1.24 }] }
    ],
    finish: { floorColor: 0x858c88, wallColor: 0xc6ceca, ceilingColor: 0xd9dcd6 },
    details: {
      entryStep: true,
      porchPosts: false,
      porch: null,
      steps: { count: 2, width: 2.05, depth: 0.62, rise: 0.1, firstOffset: 0.42, offsetStep: 0.44 },
      chimney: true,
      chimneyPlacement: { x: 4.55, localZ: -1.15, width: 0.82, height: 1.45, capWidth: 0.98, capHeight: 0.14 }
    }
  }
});

const clone = value => JSON.parse(JSON.stringify(value));

function makeRandom(seed) {
  let state = 2166136261;
  for (const char of String(seed)) {
    state ^= char.charCodeAt(0);
    state = Math.imul(state, 16777619);
  }
  return () => {
    state += 0x6D2B79F5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return (((value ^ (value >>> 14)) >>> 0) / 4294967296);
  };
}

const pick = (random, values) => values[Math.floor(random() * values.length)];
const between = (random, min, max) => min + random() * (max - min);

function varyCentralHall(plan, random) {
  const halfW = plan.footprint.width / 2;
  const halfD = plan.footprint.depth / 2;
  const hallWidth = between(random, 2.25, 2.7);
  const dividerZ = between(random, -0.24, 0.24);
  const sideWidth = halfW - hallWidth / 2;
  const leftX = -(halfW + hallWidth / 2) / 2;
  const rightX = -leftX;
  const frontDepth = halfD - dividerZ;
  const rearDepth = halfD + dividerZ;
  const frontZ = (halfD + dividerZ) / 2;
  const rearZ = (-halfD + dividerZ) / 2;
  const left = -hallWidth / 2;
  const right = hallWidth / 2;

  plan.rooms = [
    { ...plan.rooms[0], x: leftX, z: frontZ, width: sideWidth, depth: frontDepth },
    { ...plan.rooms[1], x: rightX, z: frontZ, width: sideWidth, depth: frontDepth },
    { ...plan.rooms[2], x: leftX, z: rearZ, width: sideWidth, depth: rearDepth },
    { ...plan.rooms[3], x: rightX, z: rearZ, width: sideWidth, depth: rearDepth }
  ];
  plan.partitions = [
    { id: "hall-left", axis: "x", at: left, from: -halfD, to: halfD, openings: [{ at: rearZ, width: plan.interiorDoor.width }, { at: frontZ, width: plan.interiorDoor.width }] },
    { id: "hall-right", axis: "x", at: right, from: -halfD, to: halfD, openings: [{ at: rearZ, width: plan.interiorDoor.width }, { at: frontZ, width: plan.interiorDoor.width }] },
    { id: "room-divider-left", axis: "z", at: dividerZ, from: -halfW, to: left, openings: [] },
    { id: "room-divider-right", axis: "z", at: dividerZ, from: right, to: halfW, openings: [] }
  ];
  const windowWidth = Math.min(1.8, sideWidth - 2.4);
  plan.facade.windows = [
    { side: "front", x: leftX, width: windowWidth, height: 1.15, y: 1.85 },
    { side: "front", x: rightX, width: windowWidth, height: 1.15, y: 1.85 },
    { side: "rear", x: leftX, width: windowWidth, height: 1.15, y: 1.65 },
    { side: "rear", x: rightX, width: windowWidth, height: 1.15, y: 1.65 }
  ];
}

function varyFiveRoomPlan(plan, random) {
  const leftDivider = between(random, -1.72, -1.38);
  const rightDivider = between(random, 2.48, 2.92);
  const bedroomX = (-6 + leftDivider) / 2;
  const bedroomWidth = leftDivider + 6;
  const bathroomX = (leftDivider + rightDivider) / 2;
  const bathroomWidth = rightDivider - leftDivider;
  const officeX = (rightDivider + 6) / 2;
  const officeWidth = 6 - rightDivider;

  plan.rooms = [
    { ...plan.rooms[0] },
    { ...plan.rooms[1] },
    { ...plan.rooms[2], x: bedroomX, width: bedroomWidth },
    { ...plan.rooms[3], x: bathroomX, width: bathroomWidth },
    { ...plan.rooms[4], x: officeX, width: officeWidth }
  ];
  plan.partitions = [
    { id: "rear-divider-left", axis: "z", at: 0, from: -6, to: leftDivider, openings: [{ at: bedroomX, width: plan.interiorDoor.width }] },
    { id: "rear-divider-right", axis: "z", at: 0, from: leftDivider, to: 6, openings: [{ at: bathroomX, width: plan.interiorDoor.width }, { at: officeX, width: plan.interiorDoor.width }] },
    { id: "bed-bath-divider", axis: "x", at: leftDivider, from: -5, to: 0, openings: [{ at: -2.5, width: plan.interiorDoor.width }] },
    { id: "bath-office-divider", axis: "x", at: rightDivider, from: -5, to: 0, openings: [{ at: -2.5, width: plan.interiorDoor.width }] }
  ];
  plan.facade.windows = [
    { side: "front", x: -3.55, width: 1.75, height: 1.15, y: 1.85 },
    { side: "front", x: 3.55, width: 1.75, height: 1.15, y: 1.85 },
    { side: "rear", x: bedroomX, width: Math.min(1.8, bedroomWidth - 1.7), height: 1.15, y: 1.65 },
    { side: "rear", x: officeX, width: Math.min(1.65, officeWidth - 1.2), height: 1.15, y: 1.65 }
  ];
}

const WALL_PALETTES = [0xc9c0af, 0xb9c2bb, 0xc4b9a8, 0xc7c8bd, 0xb7b4a7, 0xd0c7b8];
const ROOF_PALETTES = [0x555a59, 0x4b5355, 0x55504a, 0x626565, 0x4e5550];
const DOOR_PALETTES = [0x6a574a, 0x536d69, 0x66564c, 0x5e6258, 0x63574f];

export function generateHousePlan(seed, archetype = "houseA") {
  if (seed === undefined || seed === null || (typeof seed !== "string" && !Number.isFinite(seed))) {
    throw new TypeError("generateHousePlan requires a stable string or numeric seed.");
  }
  const template = HOUSE_PLANS[archetype];
  if (!template) throw new Error("Unknown house archetype: " + archetype);

  const random = makeRandom(seed);
  const plan = clone(template);
  plan.seed = seed;
  if (archetype === "houseA") varyCentralHall(plan, random);
  else varyFiveRoomPlan(plan, random);

  plan.wall.height = between(random, template.wall.height - 0.035, template.wall.height + 0.055);
  plan.roof.pitch = between(random, template.roof.pitch - 0.025, template.roof.pitch + 0.025);
  plan.roof.overhang = between(random, template.roof.overhang - 0.06, template.roof.overhang + 0.08);
  plan.facade.wallColor = pick(random, WALL_PALETTES);
  plan.facade.doorColor = pick(random, DOOR_PALETTES);
  plan.roof.color = pick(random, ROOF_PALETTES);
  plan.label = template.label + " / " + String(seed);

  const validation = validateHousePlan(plan);
  if (!validation.valid) {
    throw new Error("Generated house plan is invalid: " + validation.errors.join(" "));
  }
  return deepFreeze(plan);
}

export function validateHousePlan(plan) {
  const errors = [];
  const fail = message => errors.push(message);
  if (!plan || !plan.footprint || !plan.wall || !plan.entry || !plan.interiorDoor) {
    return { valid: false, errors: ["House plan is missing its footprint, wall or entrance."] };
  }

  const { width, depth } = plan.footprint;
  const halfW = width / 2;
  const halfD = depth / 2;
  if (![width, depth, plan.wall.height, plan.wall.thickness].every(Number.isFinite)
    || width <= 0 || depth <= 0 || plan.wall.height <= 0 || plan.wall.thickness <= 0) {
    fail("Footprint and wall dimensions must be positive finite numbers.");
  }
  if (![plan.entry.x, plan.entry.width, plan.entry.height, plan.entry.frameHeight, plan.entry.leafWidth, plan.entry.leafHeight].every(Number.isFinite)
    || plan.entry.width <= 0 || plan.entry.height <= 0 || plan.entry.height >= plan.wall.height
    || plan.entry.frameHeight < plan.entry.height || plan.entry.frameHeight > plan.wall.height
    || plan.entry.leafWidth <= 0 || plan.entry.leafWidth > plan.entry.width
    || plan.entry.leafHeight <= 0 || plan.entry.leafHeight > plan.entry.height) {
    fail("Entrance dimensions are invalid.");
  }
  if (plan.entry.x - plan.entry.width / 2 < -halfW || plan.entry.x + plan.entry.width / 2 > halfW) {
    fail("Entrance extends outside the footprint.");
  }

  if (![plan.interiorDoor.width, plan.interiorDoor.height].every(Number.isFinite)
    || plan.interiorDoor.width < 1.2 || plan.interiorDoor.height < 2
    || plan.interiorDoor.height >= plan.wall.height) {
    fail("Interior doorways must provide at least 1.2m width and valid head clearance.");
  }

  const roomIds = new Set();
  for (const room of plan.rooms ?? []) {
    if (!room.id || roomIds.has(room.id)) fail("Room IDs must be present and unique.");
    roomIds.add(room.id);
    if (![room.x, room.z, room.width, room.depth].every(Number.isFinite)
      || room.width <= 0 || room.depth <= 0) {
      fail((room.id || "Room") + " has invalid dimensions.");
      continue;
    }
    if (room.x - room.width / 2 < -halfW - 1e-8 || room.x + room.width / 2 > halfW + 1e-8
      || room.z - room.depth / 2 < -halfD - 1e-8 || room.z + room.depth / 2 > halfD + 1e-8) {
      fail(room.id + " extends outside the footprint.");
    }
  }
  for (let left = 0; left < (plan.rooms ?? []).length; left += 1) {
    for (let right = left + 1; right < plan.rooms.length; right += 1) {
      const a = plan.rooms[left], b = plan.rooms[right];
      const overlapX = Math.min(a.x + a.width / 2, b.x + b.width / 2) - Math.max(a.x - a.width / 2, b.x - b.width / 2);
      const overlapZ = Math.min(a.z + a.depth / 2, b.z + b.depth / 2) - Math.max(a.z - a.depth / 2, b.z - b.depth / 2);
      if (overlapX > 1e-7 && overlapZ > 1e-7) fail(a.id + " overlaps " + b.id + ".");
    }
  }

  for (const partition of plan.partitions ?? []) {
    const axis = partition.axis;
    const limit = axis === "x" ? halfW : axis === "z" ? halfD : 0;
    const rangeLimit = axis === "x" ? halfD : halfW;
    if (!limit || ![partition.at, partition.from, partition.to].every(Number.isFinite)
      || Math.abs(partition.at) > limit + 1e-8
      || partition.from < -rangeLimit - 1e-8 || partition.to > rangeLimit + 1e-8
      || partition.to <= partition.from) {
      fail((partition.id || "Partition") + " lies outside the footprint.");
      continue;
    }
    const openings = [...(partition.openings ?? [])].sort((a, b) => a.at - b.at);
    let previousEnd = partition.from;
    for (const opening of openings) {
      const start = opening.at - opening.width / 2;
      const end = opening.at + opening.width / 2;
      if (![opening.at, opening.width].every(Number.isFinite) || opening.width <= 0
        || start < previousEnd - 1e-8 || end > partition.to + 1e-8
        || opening.width < plan.interiorDoor.width - 1e-8) {
        fail((partition.id || "Partition") + " has invalid or overlapping openings.");
      }
      previousEnd = end;
    }
  }

  for (const window of plan.facade?.windows ?? []) {
    if (!["front", "rear"].includes(window.side)
      || ![window.x, window.y, window.width, window.height].every(Number.isFinite)
      || window.width <= 0 || window.height <= 0
      || Math.abs(window.x) + window.width / 2 > halfW
      || window.y - window.height / 2 < 0 || window.y + window.height / 2 > plan.wall.height) {
      fail("A facade window is invalid or outside the wall.");
    }
    if (window.side === "front" && Math.abs(window.x - plan.entry.x) < (window.width + plan.entry.width) / 2) {
      fail("A front window overlaps the entrance opening.");
    }
  }

  if (!Array.isArray(plan.rooms) || plan.rooms.length < 2 || !Array.isArray(plan.partitions)
    || !Array.isArray(plan.facade?.windows) || !plan.roof) {
    fail("A house plan needs rooms, partitions, facade windows and a roof.");
  }
  return { valid: errors.length === 0, errors };
}

export function getHousePlan(id, seed = null) {
  if (seed !== null && seed !== undefined) return generateHousePlan(seed, id);
  const plan = HOUSE_PLANS[id];
  if (!plan) throw new Error("Unknown house plan: " + id);
  const validation = validateHousePlan(plan);
  if (!validation.valid) throw new Error("Invalid house plan '" + id + "': " + validation.errors.join(" "));
  return plan;
}
