"use client";

import { useRouter } from "next/navigation";
import { PrimaryButton } from "@albora/ui-web";
import { photoPathForMission } from "../../lib/missions-utils";

type CameraButtonProps = {
  slug: string;
  label: string;
  missionId?: string | null;
};

export function CameraButton({ slug, label, missionId = null }: CameraButtonProps) {
  const router = useRouter();
  return (
    <PrimaryButton onClick={() => router.push(photoPathForMission(slug, missionId ?? null))}>
      {label}
    </PrimaryButton>
  );
}
