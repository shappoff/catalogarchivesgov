import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(root, "public", "data");

const DATASETS = [
  {
    input: "data/catalog-export-20260813100538.json",
    output: "belarus-points.geojson",
    useFilenames: true,
  },
  {
    input: "data/catalog-export-20260813101801.json",
    output: "smolensk-points.geojson",
    useFilenames: false,
  },
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
 *   objectUrl?: string;
 *   objectFilename?: string;
 * }} DigitalObject
 *
 * @typedef {{
 *   naId?: number | string;
 *   title?: string;
 *   title2?: string;
 *   scopeAndContentNote?: string;
 *   digitalObjects?: DigitalObject[];
 *   productionDates?: ProductionDate[];
 * }} ArchiveRecord
 *
 * @typedef {{
 *   input: string;
 *   output: string;
 *   useFilenames: boolean;
 * }} Dataset
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
 * @param {string} url
 * @returns {string | null}
 */
function filenameFromUrl(url) {
  const last = url.split("/").pop();
  return last && last.length > 0 ? last : null;
}

/**
 * @param {DigitalObject} object
 * @returns {string | null}
 */
function toFilename(object) {
  if (typeof object.objectFilename === "string" && object.objectFilename.length > 0) {
    return object.objectFilename;
  }

  if (typeof object.objectUrl === "string" && object.objectUrl.length > 0) {
    return filenameFromUrl(object.objectUrl);
  }

  return null;
}

/**
 * @param {DigitalObject} object
 * @returns {string | null}
 */
function toObjectUrl(object) {
  return typeof object.objectUrl === "string" && object.objectUrl.length > 0
    ? object.objectUrl
    : null;
}

/**
 * @param {ArchiveRecord} record
 * @param {boolean} useFilenames
 * @returns {string[]}
 */
function collectMedia(record, useFilenames) {
  return (record.digitalObjects ?? [])
    .map((object) => (useFilenames ? toFilename(object) : toObjectUrl(object)))
    .filter((value) => typeof value === "string" && value.length > 0);
}

/**
 * @param {unknown} note
 * @returns {{ lat: number; lng: number; title2: string } | null}
 */
function parseScopeAndContentNote(note) {
  if (typeof note !== "string" || note.length === 0) {
    return null;
  }

  const separatorIndex = note.indexOf("-");
  if (separatorIndex === -1) {
    return null;
  }

  const coordsPart = note.slice(0, separatorIndex).trim();
  const title2 = note.slice(separatorIndex + 1).trim();
  const [latRaw, lngRaw] = coordsPart.split(",");
  const lat = toFiniteNumber(latRaw);
  const lng = toFiniteNumber(lngRaw);

  if (lat === null || lng === null) {
    return null;
  }

  return { lat, lng, title2 };
}

/**
 * @param {ArchiveRecord} record
 */
function logMissingCoords(record) {
  for (const object of record.digitalObjects ?? []) {
    const url = toObjectUrl(object);
    if (url) {
      console.log(url);
    }
  }
}

/**
 * @param {Dataset} dataset
 */
async function prepareDataset(dataset) {
  const inputPath = path.join(root, dataset.input);
  const outputPath = path.join(outputDir, dataset.output);

  const raw = await readFile(inputPath, "utf8");
  /** @type {ArchiveRecord[]} */
  const records = JSON.parse(raw);

  if (!Array.isArray(records)) {
    throw new Error(`${dataset.input} must contain an array of records`);
  }

  /** @type {Record<string, unknown>[]} */
  const features = [];
  let skipped = 0;

  for (const record of records) {
    const parsed = parseScopeAndContentNote(record.scopeAndContentNote);

    if (!parsed) {
      logMissingCoords(record);
      skipped += 1;
      continue;
    }

    if (record.naId == null) {
      skipped += 1;
      continue;
    }

    const media = collectMedia(record, dataset.useFilenames);
    const dates = (record.productionDates ?? [])
      .map(formatProductionDate)
      .filter((value) => value.length > 0);

    /** @type {Record<string, unknown>} */
    const point = {
      c: [roundCoord(parsed.lng), roundCoord(parsed.lat)],
      i: record.naId,
    };

    if (record.title) {
      point.t = record.title;
    }
    if (parsed.title2) {
      point.p = parsed.title2;
    }
    if (dates.length > 0) {
      point.d = dates;
    }
    if (media.length > 0) {
      if (dataset.useFilenames) {
        point.f = media;
      } else {
        point.u = media;
      }
    }

    features.push(point);
  }

  await writeFile(outputPath, JSON.stringify(features));

  console.log(
    `Prepared ${features.length} points → ${path.relative(root, outputPath)}` +
      (skipped ? ` (skipped ${skipped})` : ""),
  );
}

await mkdir(outputDir, { recursive: true });

for (const dataset of DATASETS) {
  await prepareDataset(dataset);
}
