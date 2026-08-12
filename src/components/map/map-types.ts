import type { FeatureCollection } from "geojson";

export type PointProperties = {
  id: number | string;
  t: string;
  p: string;
  d: string | string[];
  urls: string[];
  n: number;
};

export const MAP_ATTRIBUTION =
  'Немецкие аэрофотоснимки Беларуси времен ВОВ. С сайта <a target="_blank" rel="noopener noreferrer" href="https://catalog.archives.gov/">catalog.archives.gov</a>.';

export const CATALOG_RECORD_URL = "https://catalog.archives.gov/id";

export type ArchiveRegionId = "belarus" | "smolensk";

export type ArchiveRegion = {
  id: ArchiveRegionId;
  path: string;
  label: string;
  dataFile: string;
  bounds: [[number, number], [number, number]];
};

export const POINTS_SOURCE_ID = "archive-points";
export const CLUSTER_LAYER_ID = "archive-clusters";
export const CLUSTER_COUNT_LAYER_ID = "archive-cluster-count";
export const UNCLUSTERED_LAYER_ID = "archive-unclustered";
export const CLUSTER_MAX_ZOOM = 14;
export const CLUSTER_RADIUS = 50;

/** Bounding box covering all Belarus archive points [west, south, east, north]. */
export const BELARUS_BOUNDS: [[number, number], [number, number]] = [
  [23.2, 51.5],
  [32.8, 56.2],
];

/** Bounding box covering all Smolensk archive points [west, south, east, north]. */
export const SMOLENSK_BOUNDS: [[number, number], [number, number]] = [
  [30.79, 53.45],
  [35.14, 56.06],
];

export const OPEN_FREE_MAP_STYLE =
  "https://tiles.openfreemap.org/styles/liberty";

export const EMPTY_FEATURE_COLLECTION: FeatureCollection = {
  type: "FeatureCollection",
  features: [],
};

export const ARCHIVE_REGIONS: Record<ArchiveRegionId, ArchiveRegion> = {
  belarus: {
    id: "belarus",
    path: "/belarus",
    label: "Беларусь",
    dataFile: "belarus-points.geojson",
    bounds: BELARUS_BOUNDS,
  },
  smolensk: {
    id: "smolensk",
    path: "/smolensk",
    label: "Смоленск",
    dataFile: "smolensk-points.geojson",
    bounds: SMOLENSK_BOUNDS,
  },
};

function normalizePath(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

export function isActivePath(pathname: string, href: string): boolean {
  return normalizePath(pathname) === normalizePath(href);
}

/** Pathname has no basePath. Matches `/region` and `/region/`. */
export function getArchiveRegion(pathname: string): ArchiveRegion | null {
  for (const region of Object.values(ARCHIVE_REGIONS)) {
    if (isActivePath(pathname, region.path)) {
      return region;
    }
  }

  return null;
}

export function getArchivePointsUrl(region: ArchiveRegion): string {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  return `${basePath}/data/${region.dataFile}`;
}
