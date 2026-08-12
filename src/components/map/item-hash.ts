export const ITEM_HASH_PARAM = "naId";

function hashQuery(hash: string): string {
  return hash.replace(/^#\/?/, "");
}

export function parseNaIdFromHash(hash: string): string | null {
  const naId = new URLSearchParams(hashQuery(hash)).get(ITEM_HASH_PARAM);
  if (!naId) {
    return null;
  }

  return naId;
}

export function getNaIdFromLocation(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return parseNaIdFromHash(window.location.hash);
}

export function writeNaIdHash(naId: string | number | null): void {
  if (typeof window === "undefined") {
    return;
  }

  const nextHash =
    naId == null || naId === "" ? "" : `#${ITEM_HASH_PARAM}=${encodeURIComponent(String(naId))}`;

  if (window.location.hash === nextHash) {
    return;
  }

  const path = `${window.location.pathname}${window.location.search}${nextHash}`;
  window.history.replaceState(null, "", path);
}
