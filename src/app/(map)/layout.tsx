import type { ReactNode } from "react";
import ArchiveMapLoader from "@/components/map/ArchiveMapLoader";
import styles from "./layout.module.css";

export default function MapLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <div className={styles.shell}>
      <div className={styles.mapLayer}>
        <ArchiveMapLoader />
      </div>
      <div className={styles.content}>{children}</div>
    </div>
  );
}
