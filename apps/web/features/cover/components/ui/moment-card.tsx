import Link from "next/link";
import Image from "next/image";
import { Badge, Frame } from "@albora/ui-web";
import type { CoverMoment } from "../../types/cover";

type MomentCardProps = {
  moment: CoverMoment;
  base: string;
  index: number;
  central: boolean;
  interactionOpen: boolean;
};

export function MomentCard({
  moment,
  base,
  index,
  central,
  interactionOpen,
}: MomentCardProps) {
  // Rota direto pra câmera da missão: o fluxo de captura é o que gera participação
  // (N5.6), não a galeria — mesma lógica de `photoPathForMission` em missions-utils.
  const hrefPhoto = moment.missionFilterId
    ? `${base}/photo?missao=${encodeURIComponent(moment.missionFilterId)}`
    : `${base}/photo`;

  return (
    <Link
      href={hrefPhoto}
      aria-label={`Fotografar ${moment.title}`}
      className={`relative aspect-[9/16] shrink-0 snap-center overflow-hidden rounded-token text-inherit no-underline transition-[opacity,transform] duration-instantaneo ease-mola hover:opacity-90 active:scale-[0.97] ${
        central ? "w-[9.25rem] shadow-alta" : "w-20 opacity-60 shadow-suave"
      }`}
    >
      {moment.thumbUrl ? (
        <Image
          src={moment.thumbUrl}
          alt=""
          fill
          sizes="(max-width: 640px) 50vw, 33vw"
          className="object-cover object-top"
        />
      ) : (
        <Frame label="" atmosphere variant={index * 6 + 2} />
      )}

      <span className="absolute inset-0 bg-gradient-moment-scrim" />

      {central && interactionOpen ? (
        <span className="absolute left-2 top-2">
          <Badge tone="accent">
            <span className="pulso size-1 rounded-full bg-current" />
            agora
          </Badge>
        </span>
      ) : null}

      <span className="absolute inset-x-2.5 bottom-2.5 block">
        <span
          className={`block font-titulo leading-tight tracking-titulo ${
            central ? "text-[0.9375rem]" : "text-[0.6875rem]"
          }`}
        >
          {moment.title}
        </span>
        {central && moment.contributorsLabel ? (
          <span className="mt-0.5 block truncate text-[0.625rem] leading-tight text-ink-2 opacity-85">
            {moment.contributorsLabel}
          </span>
        ) : null}
      </span>
    </Link>
  );
}
