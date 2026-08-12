import type { MetadataRoute } from "next";

import { ARCHIVE_REGIONS } from "@/components/map/map-types";
import { toAbsoluteUrl } from "@/lib/site-metadata";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: toAbsoluteUrl("/"),
      changeFrequency: "monthly",
      priority: 1,
    },
    ...Object.values(ARCHIVE_REGIONS).map((region) => ({
      url: toAbsoluteUrl(region.path),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ];
}
