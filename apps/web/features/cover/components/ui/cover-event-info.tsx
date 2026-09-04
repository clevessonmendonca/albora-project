import { formatDate } from "../../lib/cover-utils";

type CoverEventInfoProps = {
  eventName: string;
  startsAt: string;
  guests: number;
};

export function CoverEventInfo({ eventName, startsAt, guests }: CoverEventInfoProps) {
  return (
    <div className="capa-texto-anima relative -mt-13 px-6 text-center">
      <h1 className="tipo-display tipo-balance m-0">{eventName}</h1>
      <p className="mt-1.5 text-[0.8125rem] text-ink-2">
        {formatDate(startsAt)}
        {guests > 0 ? ` · ${guests} ${guests === 1 ? "pessoa" : "pessoas"} fotografando` : ""}
      </p>
    </div>
  );
}
