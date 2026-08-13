import { useEffect, useRef, type RefObject } from "react";
import type { FeatureCollection } from "geojson";
import type { Map as MapLibreMap, Popup } from "maplibre-gl";

import { findFeatureByNaId, focusArchiveItem } from "./archive-item";
import { getNaIdFromLocation, writeNaIdHash } from "./item-hash";

function closePopupQuietly(popup: Popup, skipHashSyncRef: { current: boolean }): void {
  if (!popup.isOpen()) {
    return;
  }

  skipHashSyncRef.current = true;
  popup.remove();
  skipHashSyncRef.current = false;
}

export function useArchiveItemHash(
  mapRef: RefObject<MapLibreMap | null>,
  popupRef: RefObject<Popup | null>,
  mapReady: boolean,
  points: FeatureCollection | null,
): void {
  const skipHashSyncRef = useRef(false);
  const didRestoreRef = useRef(false);

  useEffect(() => {
    const popup = popupRef.current;
    if (!popup) {
      return;
    }

    const onClose = () => {
      if (!skipHashSyncRef.current) {
        writeNaIdHash(null);
      }
    };

    popup.on("close", onClose);
    return () => {
      popup.off("close", onClose);
    };
  }, [popupRef, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    const popup = popupRef.current;
    if (!mapReady || !map || !popup) {
      return;
    }

    if (!points) {
      closePopupQuietly(popup, skipHashSyncRef);
      return;
    }

    const applyHash = () => {
      const naId = getNaIdFromLocation();
      if (!naId) {
        closePopupQuietly(popup, skipHashSyncRef);
        return;
      }

      const feature = findFeatureByNaId(points, naId);
      if (!feature) {
        closePopupQuietly(popup, skipHashSyncRef);
        return;
      }

      const animate = didRestoreRef.current;
      didRestoreRef.current = true;
      focusArchiveItem(map, popup, feature, { animate });
    };

    applyHash();
    window.addEventListener("hashchange", applyHash);
    return () => {
      window.removeEventListener("hashchange", applyHash);
    };
  }, [mapRef, popupRef, mapReady, points]);
}
