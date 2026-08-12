import ArchiveMapLoader from "@/components/map/ArchiveMapLoader";
import styles from "./page.module.css";

export default function Home() {
  return (
    <main className={styles.main}>
      <ArchiveMapLoader />
    </main>
  );
}
