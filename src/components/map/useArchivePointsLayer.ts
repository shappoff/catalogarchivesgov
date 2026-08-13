import { useEffect, useRef, useState, type RefObject } from "react";
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
  hydrateArchivePoints,
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

  const data: unknown = await response.json();
  const hydrated = hydrateArchivePoints(data, region);
  pointsCache[region.id] = hydrated;
  return hydrated;
}

export function useArchivePointsLayer(
  mapRef: RefObject<MapLibreMap | null>,
  popupRef: RefObject<Popup | null>,
  mapReady: boolean,
): void {
  const pathname = usePathname();
  const region = getArchiveRegion(pathname);
  const requestIdRef = useRef(0);
  const [loaded, setLoaded] = useState<{
    regionId: ArchiveRegionId;
    points: FeatureCollection;
  } | null>(null);

  const points = region && loaded?.regionId === region.id ? loaded.points : null;

  useEffect(() => {
    if (!mapReady) {
      return;
    }

    const map = mapRef.current;
    if (!map) {
      return;
    }

    const source = map.getSource(POINTS_SOURCE_ID) as GeoJSONSource | undefined;
    if (!source) {
      return;
    }

    const requestId = ++requestIdRef.current;

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
        setLoaded({ regionId: region.id, points: data });
      })
      .catch((error: unknown) => {
        if (requestId !== requestIdRef.current) {
          return;
        }
        console.error(error);
        source.setData(EMPTY_FEATURE_COLLECTION);
        setLoaded({ regionId: region.id, points: EMPTY_FEATURE_COLLECTION });
      });
  }, [region, mapReady, mapRef]);

  useArchiveItemHash(mapRef, popupRef, mapReady, points);
}
