import { ARCHIVE_REGIONS } from "@/components/map/map-types";
import {
  BELARUS_DESCRIPTION,
  BELARUS_TITLE,
  createPageMetadata,
  toPublicPath,
} from "@/lib/site-metadata";
import styles from "./page.module.css";

const BELARUS_PATH = ARCHIVE_REGIONS.belarus.path;
const BELARUS_PUBLIC_PATH = toPublicPath(BELARUS_PATH);

export const dynamic = "force-static";

export const metadata = createPageMetadata(
  BELARUS_TITLE,
  BELARUS_DESCRIPTION,
  BELARUS_PATH,
);

export default function Home() {
  return (
    <>
      <meta httpEquiv="refresh" content={`0;url=${BELARUS_PUBLIC_PATH}`} />
      <script
        dangerouslySetInnerHTML={{
          __html: `location.replace(${JSON.stringify(BELARUS_PUBLIC_PATH)}+location.search+location.hash)`,
        }}
      />
      <p className={styles.message}>
        Перенаправление на{" "}
        <a href={BELARUS_PUBLIC_PATH}>карту аэрофотосъемки Беларуси</a>
        …
      </p>
    </>
  );
}
