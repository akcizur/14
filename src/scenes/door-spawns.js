// Shared coordinate rules for entering a house and leaving it again.
// Yaw 0 looks along -Z; yaw PI looks along +Z.
export function createDoorSpawns({
  doorX = 0,
  doorZ,
  frontSide,
  outsideDistance = 1.8,
  insideDistance = 1.6
}) {
  if (![doorX, doorZ].every(Number.isFinite) || ![-1, 1].includes(frontSide)) {
    throw new TypeError("createDoorSpawns requires a finite door position and frontSide (-1 or 1).");
  }
  if (![outsideDistance, insideDistance].every(Number.isFinite)
    || outsideDistance <= 0 || insideDistance <= 0) {
    throw new RangeError("Door spawn distances must be positive finite numbers.");
  }

  return {
    outside: {
      x: doorX,
      z: doorZ + frontSide * outsideDistance,
      yaw: frontSide > 0 ? Math.PI : 0
    },
    inside: {
      x: doorX,
      z: doorZ - frontSide * insideDistance,
      yaw: frontSide > 0 ? 0 : Math.PI
    }
  };
}
