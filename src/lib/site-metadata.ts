import type { Metadata } from "next";

export const BELARUS_TITLE = "Карта аэрофотосъемки Беларуси времен ВОВ";
export const BELARUS_DESCRIPTION =
  "Немецкие аэрофотоснимки Беларуси времен ВОВ. С сайта catalog.archives.gov.";

export const SMOLENSK_TITLE = "Карта аэрофотосъемки Смоленской области времен ВОВ";
export const SMOLENSK_DESCRIPTION =
  "Немецкие аэрофотоснимки Смоленской области времен ВОВ. С сайта catalog.archives.gov.";

export const BRYANSK_TITLE = "Карта аэрофотосъемки Брянской области времен ВОВ";
export const BRYANSK_DESCRIPTION =
  "Немецкие аэрофотоснимки Брянской области времен ВОВ. С сайта catalog.archives.gov.";

export function getSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) {
    return explicit.replace(/\/$/, "");
  }

  const basePath = process.env.NEXT_PUBLIC_BASE_PATH?.trim() ?? "";
  return `https://shappoff.github.io${basePath}`.replace(/\/$/, "") || "https://shappoff.github.io";
}

/** Site-relative path with `basePath` and a trailing slash (`trailingSlash: true`). */
export function toPublicPath(pathname: string): string {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH?.trim() ?? "";
  const normalized =
    pathname === "/"
      ? "/"
      : `${(pathname.startsWith("/") ? pathname : `/${pathname}`).replace(/\/$/, "")}/`;

  if (normalized === "/") {
    return basePath ? `${basePath}/` : "/";
  }

  return `${basePath}${normalized}`;
}

/** Absolute URL with a trailing slash to match `trailingSlash: true`. */
export function toAbsoluteUrl(pathname: string): string {
  const origin = getSiteUrl();
  if (pathname === "/") {
    return `${origin}/`;
  }

  const withLeadingSlash = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${origin}${withLeadingSlash.replace(/\/$/, "")}/`;
}

export function getSitemapUrl(): string {
  return `${getSiteUrl()}/sitemap.xml`;
}

export function createPageMetadata(
  title: string,
  description: string,
  path: string,
): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title,
      description,
      url: path,
    },
  };
}
