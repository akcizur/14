export const HOUSE_PLANS = Object.freeze({
  houseA: Object.freeze({
    id: "houseA",
    label: "Rodinný dům A",
    footprint: Object.freeze({ width: 12, depth: 10 }),
    wall: Object.freeze({ height: 3.05, thickness: 0.26 }),
    roof: Object.freeze({ type: "gable", pitch: 0.34, overhang: 0.8, color: 0x555a59 }),
    facade: Object.freeze({
      wallColor: 0xc9c0af,
      trimColor: 0xe0dacc,
      doorColor: 0x6a574a,
      porch: "covered",
      chimney: false,
      windows: Object.freeze([
        { side: "front", x: -3.55, width: 1.75, height: 1.15, y: 1.85 },
        { side: "front", x: 3.55, width: 1.75, height: 1.15, y: 1.85 },
        { side: "rear", x: -3.5, width: 1.8, height: 1.15, y: 1.65 },
        { side: "rear", x: 3.5, width: 1.8, height: 1.15, y: 1.65 }
      ])
    }),
    rooms: Object.freeze([
      { id: "living", name: "Obývací pokoj", type: "living", x: -3.62, z: 2.5, width: 4.75, depth: 5 },
      { id: "kitchen", name: "Kuchyně", type: "kitchen", x: 3.62, z: 2.5, width: 4.75, depth: 5 },
      { id: "bedroom", name: "Ložnice", type: "bedroom", x: -3.62, z: -2.5, width: 4.75, depth: 5 },
      { id: "bathroom", name: "Koupelna", type: "bathroom", x: 3.62, z: -2.5, width: 4.75, depth: 5 }
    ]),
    partitions: Object.freeze([
      { id: "hall-left", axis: "x", at: -1.25, from: -5, to: 5, openings: [{ at: -2.5, width: 0.94 }, { at: 2.5, width: 0.94 }] },
      { id: "hall-right", axis: "x", at: 1.25, from: -5, to: 5, openings: [{ at: -2.5, width: 0.94 }, { at: 2.5, width: 0.94 }] },
      { id: "room-divider-left", axis: "z", at: 0, from: -6, to: -1.25, openings: [] },
      { id: "room-divider-right", axis: "z", at: 0, from: 1.25, to: 6, openings: [] }
    ]),
    finish: Object.freeze({ floorColor: 0x918d82, wallColor: 0xd3cfc4, ceilingColor: 0xd8d5ca }),
    details: Object.freeze({ entryStep: true, porchPosts: true, chimney: false })
  }),
  houseB: Object.freeze({
    id: "houseB",
    label: "Rodinný dům B",
    footprint: Object.freeze({ width: 12, depth: 10 }),
    wall: Object.freeze({ height: 3.15, thickness: 0.26 }),
    roof: Object.freeze({ type: "gable", pitch: 0.39, overhang: 0.95, color: 0x4b5355 }),
    facade: Object.freeze({
      wallColor: 0xb4c0bb,
      trimColor: 0xd6d8cf,
      doorColor: 0x536d69,
      porch: "stoop",
      chimney: true,
      windows: Object.freeze([
        { side: "front", x: -3.55, width: 1.75, height: 1.15, y: 1.85 },
        { side: "front", x: 3.55, width: 1.75, height: 1.15, y: 1.85 },
        { side: "rear", x: -3.5, width: 1.8, height: 1.15, y: 1.65 },
        { side: "rear", x: 3.5, width: 1.8, height: 1.15, y: 1.65 }
      ])
    }),
    rooms: Object.freeze([
      { id: "living", name: "Obývací pokoj", type: "living", x: -2.75, z: 2.5, width: 6.0, depth: 5 },
      { id: "kitchen", name: "Kuchyně", type: "kitchen", x: 3.2, z: 2.5, width: 5.4, depth: 5 },
      { id: "bedroom", name: "Ložnice", type: "bedroom", x: -3.775, z: -2.5, width: 4.45, depth: 5 },
      { id: "bathroom", name: "Koupelna", type: "bathroom", x: 0.575, z: -2.5, width: 4.25, depth: 5 },
      { id: "office", name: "Pracovna", type: "office", x: 4.35, z: -2.5, width: 3.3, depth: 5 }
    ]),
    partitions: Object.freeze([
      { id: "rear-divider-left", axis: "z", at: 0, from: -6, to: -1.55, openings: [{ at: -3.8, width: 0.94 }] },
      { id: "rear-divider-right", axis: "z", at: 0, from: -1.55, to: 6, openings: [{ at: 0.7, width: 0.9 }, { at: 4.0, width: 0.9 }] },
      { id: "bed-bath-divider", axis: "x", at: -1.55, from: -5, to: 0, openings: [{ at: -2.5, width: 0.9 }] },
      { id: "bath-office-divider", axis: "x", at: 2.7, from: -5, to: 0, openings: [{ at: -2.5, width: 0.9 }] }
    ]),
    finish: Object.freeze({ floorColor: 0x858c88, wallColor: 0xc6ceca, ceilingColor: 0xd9dcd6 }),
    details: Object.freeze({ entryStep: true, porchPosts: false, chimney: true })
  })
});

export function getHousePlan(id) {
  const plan = HOUSE_PLANS[id];
  if (!plan) throw new Error("Unknown house plan: " + id);
  return plan;
}
