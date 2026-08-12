"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import {
  BELARUS_BOUNDS,
  CLUSTER_COUNT_LAYER_ID,
  CLUSTER_LAYER_ID,
  OPEN_FREE_MAP_STYLE,
  POINTS_SOURCE_ID,
  UNCLUSTERED_LAYER_ID,
  type PointProperties,
} from "./map-types";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function parseUrls(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.filter((url): url is string => typeof url === "string");
  }

  if (typeof raw === "string" && raw.length > 0) {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter((url): url is string => typeof url === "string");
      }
    } catch {
      return [raw];
    }
  }

  return [];
}

function buildPopupHtml(properties: PointProperties): string {
  const title = escapeHtml(properties.t || "Untitled");
  const place = properties.p ? `<p class="map-popup__place">${escapeHtml(properties.p)}</p>` : "";
  const date = properties.d
    ? `<p class="map-popup__date">${escapeHtml(properties.d)}</p>`
    : "";
  const urls = parseUrls(properties.urls);

  const links =
    urls.length > 0
      ? `<ul class="map-popup__links">${urls
          .map(
            (url, index) =>
              `<li><a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">Snapshot ${index + 1}</a></li>`,
          )
          .join("")}</ul>`
      : `<p class="map-popup__empty">No snapshots available</p>`;

  return `
    <div class="map-popup">
      <h2 class="map-popup__title">${title}</h2>
      ${place}
      ${date}
      ${links}
    </div>
  `;
}

function getBasePath(): string {
  return process.env.NEXT_PUBLIC_BASE_PATH ?? "";
}

export default function ArchiveMap() {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const map = new maplibregl.Map({
      container,
      style: OPEN_FREE_MAP_STYLE,
      bounds: BELARUS_BOUNDS,
      fitBoundsOptions: { padding: 48 },
      attributionControl: { compact: true },
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

    const popup = new maplibregl.Popup({
      closeButton: true,
      closeOnClick: true,
      maxWidth: "320px",
      offset: 12,
    });

    const interactiveLayerIds = [CLUSTER_LAYER_ID, UNCLUSTERED_LAYER_ID];

    const setPointer = () => {
      map.getCanvas().style.cursor = "pointer";
    };

    const clearPointer = () => {
      map.getCanvas().style.cursor = "";
    };

    map.on("load", () => {
      const dataUrl = `${getBasePath()}/data/belarus-points.geojson`;

      map.addSource(POINTS_SOURCE_ID, {
        type: "geojson",
        data: dataUrl,
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

      map.fitBounds(BELARUS_BOUNDS, { padding: 48, duration: 0 });
    });

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

    for (const layerId of interactiveLayerIds) {
      map.on("mouseenter", layerId, setPointer);
      map.on("mouseleave", layerId, clearPointer);
    }

    return () => {
      popup.remove();
      map.remove();
    };
  }, []);

  return <div ref={containerRef} className="h-full w-full" aria-label="Archive map" />;
}
