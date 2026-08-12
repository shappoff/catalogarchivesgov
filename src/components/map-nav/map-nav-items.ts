import { ARCHIVE_REGIONS } from "@/components/map/map-types";

export type MapNavItem = {
  id: string;
  href: string;
  label: string;
  icon?: "home";
  /**
   * Skip Next.js `basePath` (GitHub Pages project URL).
   * `next/link` always prefixes href; a native `<a>` does not.
   */
  skipBasePath?: boolean;
};

export const HOME_NAV_ITEM: MapNavItem = {
  id: "home",
  href: "/",
  label: "На главную",
  icon: "home",
  skipBasePath: true,
};

export const MAP_NAV_ITEMS: MapNavItem[] = [
  HOME_NAV_ITEM,
  ...Object.values(ARCHIVE_REGIONS).map((region) => ({
    id: region.id,
    href: region.path,
    label: region.label,
  })),
];
