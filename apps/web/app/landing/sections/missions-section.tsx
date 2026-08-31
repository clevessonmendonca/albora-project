import { Missions } from "../interactives";
import { Section } from "../pieces";

export function MissionsSection({
  missions,
  t,
}: {
  missions: { id: string; title: string }[];
  t: (key: string) => string;
}) {
  return (
    <Section reveal>
      <Missions
        missions={missions}
        title={t("landing.missoes.titulo")}
        highlight={t("landing.missoes.destaque")}
        lede={t("landing.missoes.lede")}
      />
    </Section>
  );
}
