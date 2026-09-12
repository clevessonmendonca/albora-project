import { formatDate } from "../../lib/cover-utils";

type CoverEventInfoProps = {
  eventName: string;
  startsAt: string;
  guests: number;
};

export function CoverEventInfo({ eventName, startsAt, guests }: CoverEventInfoProps) {
  return (
    <div className="relative -mt-13 px-6 text-center">
      <p className="m-0 font-titulo text-[1.875rem] font-light leading-tight tracking-titulo">
        {eventName}
      </p>
      <p className="mt-1.5 text-[0.8125rem] text-ink-2">
        {formatDate(startsAt)}
        {guests > 0 ? ` · ${guests} ${guests === 1 ? "pessoa" : "pessoas"} fotografando` : ""}
      </p>
    </div>
  );
}
