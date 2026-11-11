import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC = path.join(ROOT, "public", "assets");
const UA = "14-Residential-World-PBR-Fetcher/1.0 (+https://github.com/akcizur/14)";
const RESOLUTION = process.env.PBR_RESOLUTION || "1k";

const TEXTURES = [
  { kind: "plaster", id: "white_stucco_02" },
  { kind: "asphalt", id: "asphalt_02" },
  { kind: "paving", id: "brick_pavement_02" },
  { kind: "concrete", id: "concrete_floor_01" },
  { kind: "roof-tile", id: "roof_tiles" },
  { kind: "wood", id: "wood_floor" }
];

async function requestJson(url) {
  const response = await fetch(url, { headers: { "User-Agent": UA } });
  if (!response.ok) throw new Error("HTTP " + response.status + " while reading " + url);
  return response.json();
}

async function download(url, destination, expectedMd5) {
  const response = await fetch(url, { headers: { "User-Agent": UA } });
  if (!response.ok) throw new Error("HTTP " + response.status + " while downloading " + url);
  const buffer = Buffer.from(await response.arrayBuffer());
  if (!buffer.length) throw new Error("Empty asset download: " + url);
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, buffer);
  return { bytes: buffer.length, md5: expectedMd5 || null };
}

function chooseResolution(variants) {
  if (!variants || typeof variants !== "object") return null;
  const preferred = [RESOLUTION, "2k", "1k", "4k", "8k", ...Object.keys(variants)];
  for (const key of preferred) if (variants[key]) return { name: key, data: variants[key] };
  return null;
}

function chooseFormat(variant) {
  if (!variant || typeof variant !== "object") return null;
  for (const format of ["jpg", "png", "exr"]) {
    if (variant[format]?.url) return { format, file: variant[format] };
  }
  return null;
}

function mapNode(files, key) {
  const aliases = {
    diffuse: ["Diffuse", "diffuse", "diff"],
    normal: ["nor_gl", "normal_gl", "Normal (GL)"],
    roughness: ["rough", "Rough", "roughness", "Roughness"],
    ao: ["ao", "AO"],
    height: ["disp", "displacement", "Displacement"]
  };
  for (const alias of aliases[key] || []) if (files?.[alias]) return files[alias];
  return null;
}

async function fetchTexture({ kind, id }) {
  console.log("  Poly Haven texture: " + id);
  const files = await requestJson("https://api.polyhaven.com/files/" + encodeURIComponent(id));
  const metadata = await requestJson("https://api.polyhaven.com/info/" + encodeURIComponent(id));
  console.log("    Available maps: " + Object.keys(files).join(", "));
  const maps = {};
  const directory = path.join(PUBLIC, "pbr", kind);

  for (const key of ["diffuse", "normal", "roughness", "ao", "height"]) {
    const node = mapNode(files, key);
    if (!node) {
      if (["diffuse", "normal", "roughness"].includes(key)) {
        throw new Error(id + " is missing required " + key + " map");
      }
      continue;
    }

    const resolution = chooseResolution(node);
    const selected = chooseFormat(resolution?.data);
    if (!selected) {
      if (["diffuse", "normal", "roughness"].includes(key)) {
        throw new Error(id + " has no supported file format for " + key);
      }
      continue;
    }

    const filename = key + "." + selected.format;
    const target = path.join(directory, filename);
    const result = await download(selected.file.url, target, selected.file.md5);
    maps[key] = {
      url: "/assets/pbr/" + kind + "/" + filename,
      resolution: resolution.name,
      bytes: result.bytes
    };
    console.log("    " + key + " " + resolution.name + " " + Math.round(result.bytes / 1024) + " KB");
  }

  return {
    id,
    name: metadata.name || id,
    author: Object.keys(metadata.authors || {}).join(", ") || "Poly Haven",
    dimensionsMm: metadata.dimensions || null,
    license: "CC0",
    source: "https://polyhaven.com/a/" + id,
    maps
  };
}

async function fetchHdri() {
  const id = "kloofendal_48d_partly_cloudy_puresky";
  console.log("  Poly Haven HDRI: " + id);
  const files = await requestJson("https://api.polyhaven.com/files/" + id);
  const variant = chooseResolution(files.hdri);
  const hdr = variant?.data?.hdr;
  if (!hdr?.url) throw new Error("No HDR file available for " + id);
  const target = path.join(PUBLIC, "lighting", id + "_" + variant.name + ".hdr");
  const result = await download(hdr.url, target, hdr.md5);
  console.log("    HDR " + variant.name + " " + Math.round(result.bytes / 1024) + " KB");

  return {
    id,
    url: "/assets/lighting/" + id + "_1k.hdr",
    resolution: variant.name,
    license: "CC0",
    author: "Greg Zaal; Jarod Guest",
    source: "https://polyhaven.com/a/" + id
  };
}

async function main() {
  const textures = {};
  for (const texture of TEXTURES) textures[texture.kind] = await fetchTexture(texture);
  const hdri = await fetchHdri();

  const manifest = {
    version: 1,
    source: "Poly Haven",
    license: "CC0",
    generatedAt: new Date().toISOString(),
    textures,
    hdri
  };

  const manifestPath = path.join(PUBLIC, "pbr", "manifest.json");
  await mkdir(path.dirname(manifestPath), { recursive: true });
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
  const totalBytes = Object.values(textures).reduce((sum, entry) =>
    sum + Object.values(entry.maps).reduce((mapSum, map) => mapSum + map.bytes, 0), 0);
  console.log("PBR assets ready: " + Object.keys(textures).length + " texture sets, "
    + Math.round(totalBytes / 1024 / 1024) + " MB textures + HDRI");
}

main().catch(error => {
  console.error("PBR asset preparation failed:", error);
  process.exitCode = 1;
});
