"use client";

import { AlbumPage, type AlbumMission } from "./album-page";
import { BarraDeAbas } from "@/features/guest/components/client/guest-tab-bar";

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
  return (
    <>
      <AlbumPage
        slug={slug}
        missions={missions}
        initialMission={initialMission}
        cameraPath={cameraPath}
      />
      <BarraDeAbas slug={slug} ativa="album" />
    </>
  );
}
