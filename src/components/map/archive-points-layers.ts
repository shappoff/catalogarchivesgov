import type { Map, Popup } from "maplibre-gl";
import maplibregl from "maplibre-gl";

import { buildPopupHtml } from "./map-popup";
import {
  CLUSTER_COUNT_LAYER_ID,
  CLUSTER_LAYER_ID,
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
    clusterMaxZoom: 14,
    clusterRadius: 50,
    maxzoom: 14,
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
    type: "circle",
    source: POINTS_SOURCE_ID,
    filter: ["!", ["has", "point_count"]],
    paint: {
      "circle-color": "#e03131",
      "circle-radius": 5,
      "circle-stroke-width": 1,
      "circle-stroke-color": "#ffffff",
      "circle-opacity": 0.9,
    },
  });

  const setPointer = () => {
    map.getCanvas().style.cursor = "pointer";
  };

  const clearPointer = () => {
    map.getCanvas().style.cursor = "";
  };

  map.on("click", CLUSTER_LAYER_ID, (event) => {
    const feature = event.features?.[0];
    if (!feature || feature.geometry.type !== "Point") {
      return;
    }

    const clusterId = feature.properties?.cluster_id;
    const source = map.getSource(POINTS_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
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

    while (Math.abs(event.lngLat.lng - coordinates[0]) > 180) {
      coordinates[0] += event.lngLat.lng > coordinates[0] ? 360 : -360;
    }

    popup.setLngLat(coordinates).setHTML(buildPopupHtml(properties)).addTo(map);
  });

  for (const layerId of [CLUSTER_LAYER_ID, UNCLUSTERED_LAYER_ID]) {
    map.on("mouseenter", layerId, setPointer);
    map.on("mouseleave", layerId, clearPointer);
  }
}
