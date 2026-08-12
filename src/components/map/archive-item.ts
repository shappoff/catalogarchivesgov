import type { Feature, FeatureCollection, Point } from "geojson";
import type { Map, Popup } from "maplibre-gl";

import { writeNaIdHash } from "./item-hash";
import { buildPopupHtml } from "./map-popup";
import type { PointProperties } from "./map-types";

export type ArchivePointFeature = Feature<Point, PointProperties>;

const ITEM_FOCUS_ZOOM = 10;

let focusRequestId = 0;

export function wrapLngToWorldCopy(lng: number, aroundLng: number): number {
  let wrapped = lng;
  while (Math.abs(aroundLng - wrapped) > 180) {
    wrapped += aroundLng > wrapped ? 360 : -360;
  }
  return wrapped;
}

export function findFeatureByNaId(
  collection: FeatureCollection,
  naId: string,
): ArchivePointFeature | null {
  for (const feature of collection.features) {
    if (feature.geometry?.type !== "Point") {
      continue;
    }

    const id = (feature.properties as PointProperties | null)?.id;
    if (id != null && String(id) === naId) {
      return feature as ArchivePointFeature;
    }
  }

  return null;
}

export function openSelectedArchiveItem(
  map: Map,
  popup: Popup,
  coordinates: [number, number],
  properties: PointProperties,
): void {
  popup.setLngLat(coordinates).setHTML(buildPopupHtml(properties)).addTo(map);
  writeNaIdHash(properties.id);
}

function isCameraOnTarget(map: Map, coordinates: [number, number], zoom: number): boolean {
  const center = map.getCenter();
  const distance = Math.hypot(center.lng - coordinates[0], center.lat - coordinates[1]);
  return distance < 1e-5 && Math.abs(map.getZoom() - zoom) < 0.05;
}

export function focusArchiveItem(
  map: Map,
  popup: Popup,
  feature: ArchivePointFeature,
  options?: { animate?: boolean },
): void {
  const requestId = ++focusRequestId;
  const [lng, lat] = feature.geometry.coordinates;
  const coordinates: [number, number] = [
    wrapLngToWorldCopy(lng, map.getCenter().lng),
    lat,
  ];
  const zoom = ITEM_FOCUS_ZOOM;
  const properties = feature.properties;

  const open = () => {
    if (requestId !== focusRequestId || !properties) {
      return;
    }
    openSelectedArchiveItem(map, popup, coordinates, properties);
  };

  if (options?.animate === false || isCameraOnTarget(map, coordinates, zoom)) {
    map.jumpTo({ center: coordinates, zoom });
    open();
    return;
  }

  map.flyTo({
    center: coordinates,
    zoom,
    essential: true,
  });
  map.once("moveend", open);
}
