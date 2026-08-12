"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { isActivePath } from "@/components/map/map-types";
import HomeIcon from "./HomeIcon";
import { MAP_NAV_ITEMS, type MapNavItem } from "./map-nav-items";
import styles from "./MapNavigation.module.css";

type MapNavLinkProps = {
  item: MapNavItem;
  className: string;
  active: boolean;
  children: ReactNode;
};

function MapNavLink({ item, className, active, children }: MapNavLinkProps) {
  const shared = {
    className,
    "aria-label": item.icon ? item.label : undefined,
    "aria-current": active ? ("page" as const) : undefined,
  };

  if (item.skipBasePath) {
    return (
      <a href={item.href} {...shared}>
        {children}
      </a>
    );
  }

  return (
    <Link href={item.href} {...shared}>
      {children}
    </Link>
  );
}

export default function MapNavigation() {
  const pathname = usePathname();

  return (
    <nav className={styles.nav} aria-label="Регионы карты">
      {MAP_NAV_ITEMS.map((item) => {
        const active = item.skipBasePath
          ? false
          : isActivePath(pathname, item.href);
        const className = active
          ? `${styles.item} ${styles.itemActive}`
          : styles.item;

        return (
          <MapNavLink
            key={item.id}
            item={item}
            className={className}
            active={active}
          >
            {item.icon === "home" ? (
              <HomeIcon className={styles.icon} />
            ) : (
              item.label
            )}
          </MapNavLink>
        );
      })}
    </nav>
  );
}
