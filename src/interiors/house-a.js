import { buildEmptyInterior } from "../world/interior-builder.js";

export function buildHouseA({ onExit } = {}) {
  return buildEmptyInterior({
    id: "houseA",
    planId: "houseA",
    centerZ: -17,
    frontSide: 1,
    streetSpawnKey: "outsideHouseA",
    onExit
  });
}
