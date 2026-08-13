"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import { addArchivePointsLayers } from "./archive-points-layers";
import { addCameraIcon } from "./camera-icon";
import { getNaIdFromLocation } from "./item-hash";
import { sanitizeMapStyle } from "./sanitize-map-style";
import { useArchivePointsLayer } from "./useArchivePointsLayer";
import { BELARUS_BOUNDS, MAP_ATTRIBUTION, OPEN_FREE_MAP_STYLE, POINTS_SOURCE_ID } from "./map-types";
import styles from "./ArchiveMap.module.css";

export default function ArchiveMap() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const map = new maplibregl.Map({
      container,
      bounds: BELARUS_BOUNDS,
      fitBoundsOptions: { padding: 48 },
      attributionControl: { compact: true, customAttribution: MAP_ATTRIBUTION },
    });

    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

    const popup = new maplibregl.Popup({
      closeButton: true,
      closeOnClick: true,
      maxWidth: "320px",
      offset: 12,
    });
    popupRef.current = popup;

    const fitInitialBounds = () => {
      if (!getNaIdFromLocation()) {
        map.fitBounds(BELARUS_BOUNDS, { padding: 48, duration: 0 });
      }
    };

    map.once("style.load", () => {
      fitInitialBounds();

      void (async () => {
        try {
          await addCameraIcon(map);
        } catch (error) {
          console.error(error);
        }

        if (mapRef.current !== map) {
          return;
        }

        if (!map.getSource(POINTS_SOURCE_ID)) {
          addArchivePointsLayers(map, popup);
        }

        setMapReady(true);
      })();
    });

    map.setStyle(OPEN_FREE_MAP_STYLE, {
      transformStyle: (_previous, next) => sanitizeMapStyle(next),
    });

    return () => {
      setMapReady(false);
      popup.remove();
      map.remove();
      mapRef.current = null;
      popupRef.current = null;
    };
  }, []);

  useArchivePointsLayer(mapRef, popupRef, mapReady);

  return <div ref={containerRef} className={styles.map} aria-label="Карта архивных снимков" />;
}
