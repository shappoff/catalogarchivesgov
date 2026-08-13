import type { GeoJSONSource, Map, MapLayerMouseEvent, Popup } from "maplibre-gl";

import { openSelectedArchiveItem, wrapLngToWorldCopy } from "./archive-item";
import { CAMERA_ICON_ID } from "./camera-icon";
import {
  CLUSTER_COUNT_LAYER_ID,
  CLUSTER_LAYER_ID,
  CLUSTER_MAX_ZOOM,
  CLUSTER_RADIUS,
  EMPTY_FEATURE_COLLECTION,
  POINTS_SOURCE_ID,
  UNCLUSTERED_LAYER_ID,
  type PointProperties,
} from "./map-types";

export function addArchivePointsLayers(map: Map, popup: Popup): void {
  map.addSource(POINTS_SOURCE_ID, {
    type: "geojson",
    data: EMPTY_FEATURE_COLLECTION,
    cluster: true,
    clusterMaxZoom: CLUSTER_MAX_ZOOM,
    clusterRadius: CLUSTER_RADIUS,
    maxzoom: CLUSTER_MAX_ZOOM,
  });

  map.addLayer({
    id: CLUSTER_LAYER_ID,
    type: "circle",
    source: POINTS_SOURCE_ID,
    filter: ["has", "point_count"],
    paint: {
      "circle-color": [
        "step",
        ["get", "point_count"],
        "#4c6ef5",
        25,
        "#3b5bdb",
        100,
        "#364fc7",
      ],
      "circle-radius": ["step", ["get", "point_count"], 16, 25, 22, 100, 28],
      "circle-opacity": 0.85,
    },
  });

  map.addLayer({
    id: CLUSTER_COUNT_LAYER_ID,
    type: "symbol",
    source: POINTS_SOURCE_ID,
    filter: ["has", "point_count"],
    layout: {
      "text-field": ["get", "point_count_abbreviated"],
      "text-size": 12,
      "text-font": ["Noto Sans Regular"],
    },
    paint: {
      "text-color": "#ffffff",
    },
  });

  map.addLayer({
    id: UNCLUSTERED_LAYER_ID,
    type: "symbol",
    source: POINTS_SOURCE_ID,
    filter: ["!", ["has", "point_count"]],
    layout: {
      "icon-image": CAMERA_ICON_ID,
      "icon-size": 1,
      "icon-allow-overlap": true,
      "icon-ignore-placement": true,
    },
  });

  const canvas = map.getCanvas();

  const setPointer = () => {
    canvas.style.cursor = "pointer";
  };

  const clearPointer = () => {
    canvas.style.cursor = "";
  };

  const setUnclusteredHover = (event: MapLayerMouseEvent) => {
    canvas.style.cursor = "pointer";
    const place = (event.features?.[0]?.properties as PointProperties | undefined)?.p;
    canvas.title = typeof place === "string" ? place : "";
  };

  const clearUnclusteredHover = () => {
    canvas.style.cursor = "";
    canvas.title = "";
  };

  map.on("click", CLUSTER_LAYER_ID, (event) => {
    const feature = event.features?.[0];
    if (!feature || feature.geometry.type !== "Point") {
      return;
    }

    const clusterId = feature.properties?.cluster_id;
    const source = map.getSource(POINTS_SOURCE_ID) as GeoJSONSource | undefined;
    if (typeof clusterId !== "number" || !source) {
      return;
    }

    const coordinates = feature.geometry.coordinates as [number, number];

    void source.getClusterExpansionZoom(clusterId).then((zoom) => {
      map.easeTo({
        center: coordinates,
        zoom,
      });
    });
  });

  map.on("click", UNCLUSTERED_LAYER_ID, (event) => {
    const feature = event.features?.[0];
    if (!feature || feature.geometry.type !== "Point") {
      return;
    }

    const coordinates = [...feature.geometry.coordinates] as [number, number];
    const properties = feature.properties as PointProperties | null;
    if (!properties) {
      return;
    }

    coordinates[0] = wrapLngToWorldCopy(coordinates[0], event.lngLat.lng);
    openSelectedArchiveItem(map, popup, coordinates, properties);
  });

  map.on("mouseenter", CLUSTER_LAYER_ID, setPointer);
  map.on("mouseleave", CLUSTER_LAYER_ID, clearPointer);

  map.on("mouseenter", UNCLUSTERED_LAYER_ID, setUnclusteredHover);
  map.on("mousemove", UNCLUSTERED_LAYER_ID, setUnclusteredHover);
  map.on("mouseleave", UNCLUSTERED_LAYER_ID, clearUnclusteredHover);
}
