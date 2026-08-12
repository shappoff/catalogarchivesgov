import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const inputPath = path.join(root, "belarus.json");
const outputDir = path.join(root, "public", "data");
const outputPath = path.join(outputDir, "belarus-points.geojson");

/**
 * @param {unknown} value
 * @returns {number | null}
 */
function toFiniteNumber(value) {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * @param {number} value
 * @returns {number}
 */
function roundCoord(value) {
  return Math.round(value * 1e5) / 1e5;
}

/**
 * @typedef {{
 *   naId?: number | string;
 *   title?: string;
 *   title2?: string;
 *   _geoloc?: { lat?: string | number; lng?: string | number };
 *   digitalObjects?: Array<{ objectUrl?: string }>;
 *   productionDates?: Array<{ logicalDate?: string }>;
 * }} ArchiveRecord
 */

const raw = await readFile(inputPath, "utf8");
/** @type {ArchiveRecord[]} */
const records = JSON.parse(raw);

if (!Array.isArray(records)) {
  throw new Error("belarus.json must contain an array of records");
}

/** @type {GeoJSON.Feature[]} */
const features = [];
let skipped = 0;

for (const record of records) {
  const lat = toFiniteNumber(record._geoloc?.lat);
  const lng = toFiniteNumber(record._geoloc?.lng);

  if (lat === null || lng === null || record.naId == null) {
    skipped += 1;
    continue;
  }

  const urls = (record.digitalObjects ?? [])
    .map((object) => object.objectUrl)
    .filter((url) => typeof url === "string" && url.length > 0);

  features.push({
    type: "Feature",
    geometry: {
      type: "Point",
      coordinates: [roundCoord(lng), roundCoord(lat)],
    },
    properties: {
      id: record.naId,
      t: record.title ?? "",
      p: record.title2 ?? "",
      d: record.productionDates?.[0]?.logicalDate ?? "",
      urls,
      n: urls.length,
    },
  });
}

/** @type {GeoJSON.FeatureCollection} */
const collection = {
  type: "FeatureCollection",
  features,
};

await mkdir(outputDir, { recursive: true });
await writeFile(outputPath, JSON.stringify(collection));

console.log(
  `Prepared ${features.length} points → ${path.relative(root, outputPath)}` +
    (skipped ? ` (skipped ${skipped})` : ""),
);
