import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(root, "public", "data");

const DATASETS = [
  { input: "belarus.json", output: "belarus-points.geojson" },
  { input: "smolensk.json", output: "smolensk-points.geojson" },
];

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
 *   day?: string | number;
 *   month?: string | number;
 *   year?: string | number;
 *   logicalDate?: string;
 * }} ProductionDate
 *
 * @typedef {{
 *   naId?: number | string;
 *   title?: string;
 *   title2?: string;
 *   _geoloc?: { lat?: string | number; lng?: string | number };
 *   digitalObjects?: Array<{ objectUrl?: string }>;
 *   productionDates?: ProductionDate[];
 * }} ArchiveRecord
 */

/**
 * @param {ProductionDate} date
 * @returns {string}
 */
function formatProductionDate(date) {
  return [date.day, date.month, date.year]
    .filter((value) => value != null && value !== "")
    .join(".");
}

/**
 * @param {string} inputFile
 * @param {string} outputFile
 */
async function prepareDataset(inputFile, outputFile) {
  const inputPath = path.join(root, inputFile);
  const outputPath = path.join(outputDir, outputFile);

  const raw = await readFile(inputPath, "utf8");
  /** @type {ArchiveRecord[]} */
  const records = JSON.parse(raw);

  if (!Array.isArray(records)) {
    throw new Error(`${inputFile} must contain an array of records`);
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

    const dates = (record.productionDates ?? [])
      .map(formatProductionDate)
      .filter((value) => value.length > 0);

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
        d: dates,
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

  await writeFile(outputPath, JSON.stringify(collection));

  console.log(
    `Prepared ${features.length} points → ${path.relative(root, outputPath)}` +
      (skipped ? ` (skipped ${skipped})` : ""),
  );
}

await mkdir(outputDir, { recursive: true });

for (const dataset of DATASETS) {
  await prepareDataset(dataset.input, dataset.output);
}
