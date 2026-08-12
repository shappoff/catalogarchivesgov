import { ARCHIVE_REGIONS } from "@/components/map/map-types";

export const HOME_NAV_ITEM = {
  id: "home",
  href: "/",
  label: "На главную",
  icon: "home",
} as const;

export type MapNavItem =
  | typeof HOME_NAV_ITEM
  | {
      id: string;
      href: string;
      label: string;
      icon?: never;
    };

export const MAP_NAV_ITEMS: MapNavItem[] = [
  HOME_NAV_ITEM,
  ...Object.values(ARCHIVE_REGIONS).map((region) => ({
    id: region.id,
    href: region.path,
    label: region.label,
  })),
];
