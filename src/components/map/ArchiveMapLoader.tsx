"use client";

import dynamic from "next/dynamic";

const ArchiveMap = dynamic(() => import("@/components/map/ArchiveMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-zinc-100 text-sm text-zinc-600">
      Loading map…
    </div>
  ),
});

export default function ArchiveMapLoader() {
  return <ArchiveMap />;
}
