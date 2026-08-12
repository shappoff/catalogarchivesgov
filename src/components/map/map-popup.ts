import type { PointProperties } from "./map-types";

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

export function buildPopupHtml(properties: PointProperties): string {
  const title = escapeHtml(properties.t || "Untitled");
  const place = properties.p
    ? `<p class="map-popup__place">${escapeHtml(properties.p)}</p>`
    : "";
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
