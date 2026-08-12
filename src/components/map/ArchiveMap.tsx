"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import { addBelarusPointsLayers } from "./belarus-points-layers";
import { useBelarusPointsLayer } from "./useBelarusPointsLayer";
import { BELARUS_BOUNDS, OPEN_FREE_MAP_STYLE } from "./map-types";
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
      style: OPEN_FREE_MAP_STYLE,
      bounds: BELARUS_BOUNDS,
      fitBoundsOptions: { padding: 48 },
      attributionControl: { compact: true },
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

    map.on("load", () => {
      addBelarusPointsLayers(map, popup);
      map.fitBounds(BELARUS_BOUNDS, { padding: 48, duration: 0 });
      setMapReady(true);
    });

    return () => {
      setMapReady(false);
      popup.remove();
      map.remove();
      mapRef.current = null;
      popupRef.current = null;
    };
  }, []);

  useBelarusPointsLayer(mapRef.current, popupRef.current, mapReady);

  return <div ref={containerRef} className={styles.map} aria-label="Archive map" />;
}
