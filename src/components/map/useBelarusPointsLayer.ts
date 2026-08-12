import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import type { FeatureCollection } from "geojson";
import type { Map, Popup } from "maplibre-gl";
import type { GeoJSONSource } from "maplibre-gl";

import {
  EMPTY_FEATURE_COLLECTION,
  POINTS_SOURCE_ID,
  getBelarusPointsUrl,
  isBelarusPath,
} from "./map-types";

let belarusPointsCache: FeatureCollection | null = null;

async function loadBelarusPoints(): Promise<FeatureCollection> {
  if (belarusPointsCache) {
    return belarusPointsCache;
  }

  const response = await fetch(getBelarusPointsUrl());
  if (!response.ok) {
    throw new Error(`Failed to load Belarus points: ${response.status}`);
  }

  const data = (await response.json()) as FeatureCollection;
  belarusPointsCache = data;
  return data;
}

export function useBelarusPointsLayer(
  map: Map | null,
  popup: Popup | null,
  mapReady: boolean,
): void {
  const pathname = usePathname();
  const active = isBelarusPath(pathname);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (!mapReady || !map) {
      return;
    }

    const source = map.getSource(POINTS_SOURCE_ID) as GeoJSONSource | undefined;
    if (!source) {
      return;
    }

    const requestId = ++requestIdRef.current;

    if (!active) {
      source.setData(EMPTY_FEATURE_COLLECTION);
      popup?.remove();
      return;
    }

    void loadBelarusPoints()
      .then((data) => {
        if (requestId !== requestIdRef.current) {
          return;
        }
        source.setData(data);
      })
      .catch((error: unknown) => {
        if (requestId !== requestIdRef.current) {
          return;
        }
        console.error(error);
        source.setData(EMPTY_FEATURE_COLLECTION);
      });
  }, [active, map, mapReady, popup]);
}
