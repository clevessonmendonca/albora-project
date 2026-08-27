import { ScrollDemo } from "../interactives";
import { Section } from "../pieces";
import { SIDE_PADDING } from "../landing-data";

export function ScrollDemoSection({
  example,
  missionTitle,
}: {
  example: string;
  missionTitle: string;
}) {
  return (
    <Section
      id="demo"
      className={`pb-0 pt-[clamp(1.875rem,4vw,3.25rem)] ${SIDE_PADDING}`}
    >
      <ScrollDemo example={example} mission={missionTitle} />
    </Section>
  );
}
