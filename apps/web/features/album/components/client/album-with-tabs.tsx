"use client";

import Link from "next/link";
import { FloatingNav } from "@albora/ui-web";
import { AlbumPage } from "./album-page";
import type { AlbumMission } from "../../hooks/use-album-filter";

export function AlbumWithTabs({
  slug,
  missions,
  initialMission = null,
  cameraPath,
}: {
  slug: string;
  missions: AlbumMission[];
  initialMission?: string | null;
  cameraPath: string;
}) {
  const base = `/e/${encodeURIComponent(slug)}`;

  return (
    <>
      <AlbumPage
        slug={slug}
        missions={missions}
        initialMission={initialMission}
        cameraPath={cameraPath}
      />
      <FloatingNav active="album" base={base} linkComponent={Link} />
    </>
  );
}
