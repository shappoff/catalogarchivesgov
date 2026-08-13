import { CATALOG_RECORD_URL, parseStringList, type PointProperties } from "./map-types";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildCatalogLink(id: PointProperties["id"]): string {
  if (id === undefined || id === null || id === "") {
    return "";
  }

  const catalogUrl = `${CATALOG_RECORD_URL}/${id}`;
  const safeUrl = escapeHtml(catalogUrl);

  return `<div class="map-popup__catalog"><a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${safeUrl}</a></div>`;
}

function buildDatesFooter(dates: string[]): string {
  if (dates.length === 0) {
    return "";
  }

  return `<footer class="map-popup__dates">${dates
    .map((date) => `<div class="map-popup__date">${escapeHtml(date)}</div>`)
    .join("")}</footer>`;
}

export function buildPopupHtml(properties: PointProperties): string {
  const place = properties.p
    ? `<p class="map-popup__place">${escapeHtml(properties.p)}</p>`
    : "";
  const title = properties.t
    ? `<p class="map-popup__title">${escapeHtml(properties.t)}</p>`
    : "";
  const catalogLink = buildCatalogLink(properties.id);
  const urls = parseStringList(properties.urls);
  const dates = parseStringList(properties.d);

  const links =
    urls.length > 0
      ? `<ul class="map-popup__links">${urls
          .map(
            (url, index) =>
              `<li><a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">Снимок ${index + 1}</a></li>`,
          )
          .join("")}</ul>`
      : `<p class="map-popup__empty">No snapshots available</p>`;

  return `
    <div class="map-popup">
      ${place}
      ${title}
      ${catalogLink}
      ${links}
      ${buildDatesFooter(dates)}
    </div>
  `;
}
