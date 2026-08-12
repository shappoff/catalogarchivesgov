import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import type { FeatureCollection } from "geojson";
import type { GeoJSONSource, Map as MapLibreMap, Popup } from "maplibre-gl";

import { getNaIdFromLocation } from "./item-hash";
import { useArchiveItemHash } from "./useArchiveItemHash";
import {
  EMPTY_FEATURE_COLLECTION,
  POINTS_SOURCE_ID,
  getArchivePointsUrl,
  getArchiveRegion,
  type ArchiveRegion,
  type ArchiveRegionId,
} from "./map-types";

const pointsCache: Partial<Record<ArchiveRegionId, FeatureCollection>> = {};

async function loadRegionPoints(region: ArchiveRegion): Promise<FeatureCollection> {
  const cached = pointsCache[region.id];
  if (cached) {
    return cached;
  }

  const response = await fetch(getArchivePointsUrl(region));
  if (!response.ok) {
    throw new Error(`Failed to load ${region.id} points: ${response.status}`);
  }

  const data = (await response.json()) as FeatureCollection;
  pointsCache[region.id] = data;
  return data;
}

export function useArchivePointsLayer(
  map: MapLibreMap | null,
  popup: Popup | null,
  mapReady: boolean,
): void {
  const pathname = usePathname();
  const region = getArchiveRegion(pathname);
  const requestIdRef = useRef(0);
  const [points, setPoints] = useState<FeatureCollection | null>(null);

  useEffect(() => {
    if (!mapReady || !map) {
      return;
    }

    const source = map.getSource(POINTS_SOURCE_ID) as GeoJSONSource | undefined;
    if (!source) {
      return;
    }

    const requestId = ++requestIdRef.current;
    setPoints(null);

    if (!region) {
      source.setData(EMPTY_FEATURE_COLLECTION);
      return;
    }

    if (!getNaIdFromLocation()) {
      map.fitBounds(region.bounds, { padding: 48 });
    }

    void loadRegionPoints(region)
      .then((data) => {
        if (requestId !== requestIdRef.current) {
          return;
        }
        source.setData(data);
        setPoints(data);
      })
      .catch((error: unknown) => {
        if (requestId !== requestIdRef.current) {
          return;
        }
        console.error(error);
        source.setData(EMPTY_FEATURE_COLLECTION);
        setPoints(EMPTY_FEATURE_COLLECTION);
      });
  }, [region, map, mapReady]);

  useArchiveItemHash(map, popup, mapReady, points);
}
