import { setWorkerUrl } from "maplibre-gl";

let workerConfigured = false;

export function ensureMaplibreWorker(): void {
  if (workerConfigured || typeof window === "undefined") {
    return;
  }

  setWorkerUrl(new URL("maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url).href);
  workerConfigured = true;
}
