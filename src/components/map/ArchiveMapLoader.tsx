"use client";

import dynamic from "next/dynamic";
import styles from "./ArchiveMapLoader.module.css";

const ArchiveMap = dynamic(() => import("@/components/map/ArchiveMap"), {
  ssr: false,
  loading: () => (
    <div className={styles.loading}>Loading map…</div>
  ),
});

export default function ArchiveMapLoader() {
  return <ArchiveMap />;
}
