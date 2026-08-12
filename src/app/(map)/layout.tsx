import type { ReactNode } from "react";
import ArchiveMapLoader from "@/components/map/ArchiveMapLoader";
import MapNavigation from "@/components/map-nav/MapNavigation";
import styles from "./layout.module.css";

export default function MapLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <div className={styles.shell}>
      <MapNavigation />
      <div className={styles.body}>
        <div className={styles.mapLayer}>
          <ArchiveMapLoader />
        </div>
        <div className={styles.content}>{children}</div>
      </div>
    </div>
  );
}
