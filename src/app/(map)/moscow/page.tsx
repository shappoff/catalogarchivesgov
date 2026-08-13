import {
  MOSCOW_DESCRIPTION,
  MOSCOW_TITLE,
  createPageMetadata,
} from "@/lib/site-metadata";

export const metadata = createPageMetadata(
  MOSCOW_TITLE,
  MOSCOW_DESCRIPTION,
  "/moscow",
);

export default function MoscowPage() {
  return null;
}
