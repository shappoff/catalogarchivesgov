"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { isActivePath } from "@/components/map/map-types";
import HomeIcon from "./HomeIcon";
import { MAP_NAV_ITEMS } from "./map-nav-items";
import styles from "./MapNavigation.module.css";

export default function MapNavigation() {
  const pathname = usePathname();

  return (
    <nav className={styles.nav} aria-label="Регионы карты">
      {MAP_NAV_ITEMS.map((item) => {
        const active = isActivePath(pathname, item.href);
        const className = active
          ? `${styles.item} ${styles.itemActive}`
          : styles.item;

        return (
          <Link
            key={item.id}
            href={item.href}
            className={className}
            aria-label={item.icon ? item.label : undefined}
            aria-current={active ? "page" : undefined}
          >
            {item.icon === "home" ? (
              <HomeIcon className={styles.icon} />
            ) : (
              item.label
            )}
          </Link>
        );
      })}
    </nav>
  );
}
