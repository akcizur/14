import { buildEmptyInterior } from "../world/interior-builder.js";

export function buildHouseA({ onExit, seed = null } = {}) {
  return buildEmptyInterior({
    id: "houseA",
    planId: "houseA",
    seed,
    centerZ: -17,
    frontSide: 1,
    streetSpawnKey: "outsideHouseA",
    onExit
  });
}
