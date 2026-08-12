export type PointProperties = {
  id: number | string;
  t: string;
  p: string;
  d: string;
  urls: string[];
  n: number;
};

export const POINTS_SOURCE_ID = "archive-points";
export const CLUSTER_LAYER_ID = "archive-clusters";
export const CLUSTER_COUNT_LAYER_ID = "archive-cluster-count";
export const UNCLUSTERED_LAYER_ID = "archive-unclustered";

/** Bounding box covering all Belarus archive points [west, south, east, north]. */
export const BELARUS_BOUNDS: [[number, number], [number, number]] = [
  [23.2, 51.5],
  [32.8, 56.2],
];

export const OPEN_FREE_MAP_STYLE =
  "https://tiles.openfreemap.org/styles/liberty";
