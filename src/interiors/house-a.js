import { buildEmptyInterior } from "../world/interior-builder.js";
export function buildHouseA({ onExit } = {}) {
  return buildEmptyInterior({
    id: "houseA", centerZ: -17, frontSide: 1,
    wallColor: 0xd3cfc4, floorColor: 0x918d82,
    doorColor: 0x6a574a, streetSpawnKey: "outsideHouseA", onExit
  });
}
