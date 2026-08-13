"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { isActivePath } from "@/components/map/map-types";
import ChevronIcon from "./ChevronIcon";
import HomeIcon from "./HomeIcon";
import {
  HOME_NAV_ITEM,
  MAP_NAV_ITEMS,
  type MapNavItem,
} from "./map-nav-items";
import styles from "./MapNavigation.module.css";

const REGION_LIST_ID = "map-nav-region-list";
const REGION_NAV_ITEMS = MAP_NAV_ITEMS.filter((item) => item.id !== "home");

type MapNavLinkProps = {
  item: MapNavItem;
  className: string;
  active: boolean;
  children: ReactNode;
  onClick?: () => void;
  role?: string;
};

function itemClassName(active: boolean, extra?: string): string {
  const base = active ? `${styles.item} ${styles.itemActive}` : styles.item;
  return extra ? `${base} ${extra}` : base;
}

function MapNavLink({
  item,
  className,
  active,
  children,
  onClick,
  role,
}: MapNavLinkProps) {
  const shared = {
    role,
    className,
    onClick,
    "aria-label": item.icon ? item.label : undefined,
    "aria-current": active ? ("page" as const) : undefined,
    "aria-selected": role === "option" ? active : undefined,
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

function NavItemLabel({ item }: { item: MapNavItem }) {
  if (item.icon === "home") {
    return <HomeIcon className={styles.icon} />;
  }

  return item.label;
}

function CompactRegionNav({ pathname }: { pathname: string }) {
  const [open, setOpen] = useState(false);
  const compactRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const currentRegion = REGION_NAV_ITEMS.find((item) =>
    isActivePath(pathname, item.href),
  );
  const triggerLabel = currentRegion?.label ?? "Регион";
  const triggerActive = Boolean(currentRegion);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target;
      if (target instanceof Node && compactRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") {
        return;
      }
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div className={styles.compact} ref={compactRef}>
      <MapNavLink
        item={HOME_NAV_ITEM}
        className={itemClassName(false, styles.compactHome)}
        active={false}
      >
        <NavItemLabel item={HOME_NAV_ITEM} />
      </MapNavLink>
      <button
        ref={triggerRef}
        type="button"
        className={itemClassName(triggerActive, styles.compactTrigger)}
        aria-expanded={open}
        aria-controls={REGION_LIST_ID}
        aria-haspopup="listbox"
        onClick={() => setOpen((value) => !value)}
      >
        {triggerLabel}
        <ChevronIcon
          className={
            open ? `${styles.chevron} ${styles.chevronOpen}` : styles.chevron
          }
        />
      </button>
      <ul
        id={REGION_LIST_ID}
        className={styles.menu}
        role="listbox"
        hidden={!open}
      >
        {REGION_NAV_ITEMS.map((item) => {
          const active = isActivePath(pathname, item.href);

          return (
            <li key={item.id} role="presentation">
              <MapNavLink
                item={item}
                className={itemClassName(active, styles.menuLink)}
                active={active}
                role="option"
                onClick={() => setOpen(false)}
              >
                {item.label}
              </MapNavLink>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function MapNavigation() {
  const pathname = usePathname();

  return (
    <nav className={styles.nav} aria-label="Регионы карты">
      <div className={styles.tabs}>
        {MAP_NAV_ITEMS.map((item) => {
          const active = item.skipBasePath
            ? false
            : isActivePath(pathname, item.href);

          return (
            <MapNavLink
              key={item.id}
              item={item}
              className={itemClassName(active)}
              active={active}
            >
              <NavItemLabel item={item} />
            </MapNavLink>
          );
        })}
      </div>
      <CompactRegionNav key={pathname} pathname={pathname} />
    </nav>
  );
}
