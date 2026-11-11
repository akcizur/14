// Canonical world-space layout. All distances are metres; +Y is up, +X east, +Z south.
const freeze = value => {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) freeze(child);
  return value;
};

export const WORLD_PLAN = freeze({
  id: "two-house-residential-street",
  seed: 14,
  street: {
    ground: { centerX: 0, centerZ: 0, width: 66, depth: 52, y: -0.08 },
    road: {
      centerX: 0, centerZ: 0, width: 64, depth: 8.4, y: 0.005,
      laneOffset: 1.82, edge: 32,
      centerMarkings: { start: -29, end: 29, spacing: 8, width: 3.3, depth: 0.12, y: 0.021 }
    },
    sidewalks: [
      { id: "north", centerX: 0, centerZ: -5.25, width: 64, depth: 1.7, y: 0.025, walkZ: -4.9, curbZ: -4.35, curbHeight: 0.16, curbDepth: 0.18 },
      { id: "south", centerX: 0, centerZ: 5.25, width: 64, depth: 1.7, y: 0.025, walkZ: 4.9, curbZ: 4.35, curbHeight: 0.16, curbDepth: 0.18 }
    ],
    crossings: {
      centersX: [-24, -12, 12, 24],
      stripeCount: 9,
      stripeSpacing: 0.78,
      stripeWidth: 0.43,
      spanZ: 12.4,
      y: 0.024
    },
    traffic: {
      roadEdge: 32,
      laneOffset: 1.82,
      carLength: 4.5,
      truckLength: 7.9,
      spawnGap: 7.5,
      followingGap: 3.6,
      crossingLookAhead: 24
    },
    pedestrians: {
      roadEdge: 32,
      walkZ: 4.9,
      crosswalkXs: [-24, -12, 12, 24],
      initialWalkers: [
        { x: -26, side: -1 },
        { x: -16, side: 1 },
        { x: -5, side: -1 },
        { x: 7, side: 1 },
        { x: 17, side: -1 },
        { x: 27, side: 1 }
      ],
      benches: [
        { x: -18, z: -5.68, facingZ: 1 },
        { x: 18, z: 5.68, facingZ: -1 }
      ]
    },
    navigation: { minX: -29, maxX: 29, minZ: -23, maxZ: 23 },
    spawn: { x: 0, z: 0, yaw: 0 },
    trees: [
      { x: -8.2, z: -17 },
      { x: 8.2, z: -17 },
      { x: -8.2, z: 17 },
      { x: 8.2, z: 17 }
    ]
  },
  houses: [
    { id: "house-a", planId: "houseA", seed: 1401, centerZ: -17, frontSide: 1, targetLocation: "houseA", streetSpawnKey: "outsideHouseA" },
    { id: "house-b", planId: "houseB", seed: 1402, centerZ: 17, frontSide: -1, targetLocation: "houseB", streetSpawnKey: "outsideHouseB" }
  ]
});

export function validateWorldPlan(plan = WORLD_PLAN) {
  const errors = [];
  const street = plan?.street;
  if (!street?.ground || !street?.road || !Array.isArray(street.sidewalks)
    || !Array.isArray(street.crossings?.centersX) || !Array.isArray(plan.houses)) {
    return { valid: false, errors: ["World plan is missing required street or house data."] };
  }

  const finitePositive = (value, label) => {
    if (!Number.isFinite(value) || value <= 0) errors.push(label + " must be a positive finite number.");
  };
  finitePositive(street.ground.width, "Ground width");
  finitePositive(street.ground.depth, "Ground depth");
  finitePositive(street.road.width, "Road width");
  finitePositive(street.road.depth, "Road depth");
  finitePositive(street.traffic?.laneOffset, "Traffic lane offset");
  finitePositive(street.pedestrians?.walkZ, "Pedestrian sidewalk path");

  const roadHalfDepth = street.road.depth / 2;
  for (const sidewalk of street.sidewalks) {
    finitePositive(sidewalk.width, sidewalk.id + " sidewalk width");
    finitePositive(sidewalk.depth, sidewalk.id + " sidewalk depth");
    if (Math.abs(sidewalk.centerZ) - sidewalk.depth / 2 <= roadHalfDepth) {
      errors.push(sidewalk.id + " sidewalk overlaps the road surface.");
    }
    if (!Number.isFinite(sidewalk.walkZ) || Math.sign(sidewalk.walkZ) !== Math.sign(sidewalk.centerZ)) {
      errors.push(sidewalk.id + " pedestrian path is not aligned with its sidewalk.");
    }
  }

  if (street.traffic.laneOffset >= roadHalfDepth) errors.push("Traffic lanes must remain inside the road.");
  if (street.crossings.spanZ / 2 < Math.max(...street.sidewalks.map(side => Math.abs(side.centerZ)) )) {
    errors.push("Crossings must extend across both sidewalks.");
  }

  const houseIds = new Set();
  for (const house of plan.houses) {
    if (!house.id || houseIds.has(house.id)) errors.push("House IDs must be present and unique.");
    houseIds.add(house.id);
    if (!Number.isFinite(house.centerZ) || ![-1, 1].includes(house.frontSide)) {
      errors.push((house.id || "House") + " has an invalid site position or facade orientation.");
    }
    const frontZ = house.centerZ + house.frontSide * 5;
    if (Math.abs(frontZ) >= Math.abs(house.centerZ)) {
      errors.push(house.id + " entrance must face the street centre.");
    }
  }

  return { valid: errors.length === 0, errors };
}

export function assertWorldPlan(plan = WORLD_PLAN) {
  const result = validateWorldPlan(plan);
  if (!result.valid) throw new Error("Invalid world plan: " + result.errors.join(" "));
  return plan;
}
