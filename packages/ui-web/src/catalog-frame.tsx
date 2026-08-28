import type { CSSProperties, ReactNode } from "react";

export const PHONE_HEIGHT = 844;
export const PHONE_WIDTH = 390;

export const WALL_WIDTH = 1180;
export const WALL_HEIGHT = Math.round((WALL_WIDTH * 9) / 16);

const BROWSER_WIDTH = 1180;
const BROWSER_CHROME_HEIGHT = 34;
const WALL_BEZEL = 18;

function Caption({ title, note }: { title: string; note: string }) {
  return (
    <>
      <p className="m-0 font-titulo text-[1.0625rem] tracking-titulo">{title}</p>
      <p className="mt-1.5 mb-0 text-[0.8125rem] leading-normal text-ink-2">{note}</p>
    </>
  );
}

export function PhoneFrame({
  children,
  title,
  note,
  scale = 0.78,
}: {
  children: ReactNode;
  title: string;
  note: string;
  scale?: number;
}) {
  const scaledWidth = PHONE_WIDTH * scale;
  const scaledHeight = PHONE_HEIGHT * scale;

  return (
    <figure
      className="m-0 flex flex-col gap-4"
      style={
        {
          "--catalog-w": `${scaledWidth}px`,
          "--catalog-h": `${scaledHeight}px`,
          "--catalog-scale": String(scale),
          "--catalog-width": `${PHONE_WIDTH}px`,
          "--catalog-phone-height": `${PHONE_HEIGHT}px`,
        } as CSSProperties
      }
    >
      <div className="flex-none h-[var(--catalog-h)] w-[var(--catalog-w)]">
        <div className="h-[var(--catalog-phone-height)] w-[var(--catalog-width)] origin-top-left scale-[var(--catalog-scale)] rounded-[3.25rem] bg-ink p-3 shadow-device">
          <div className="relative size-full overflow-hidden rounded-[2.625rem]">{children}</div>
        </div>
      </div>

      <figcaption className="max-w-[var(--catalog-w)]">
        <Caption title={title} note={note} />
      </figcaption>
    </figure>
  );
}

export function BrowserFrame({
  children,
  title,
  note,
  height = 700,
  scale = 0.62,
}: {
  children: ReactNode;
  title: string;
  note: string;
  height?: number;
  scale?: number;
}) {
  const scaledWidth = BROWSER_WIDTH * scale;
  const scaledHeight = (height + BROWSER_CHROME_HEIGHT) * scale;

  return (
    <figure
      className="m-0 flex flex-col gap-4"
      style={
        {
          "--catalog-w": `${scaledWidth}px`,
          "--catalog-h": `${scaledHeight}px`,
          "--catalog-scale": String(scale),
          "--catalog-height": `${height}px`,
          "--catalog-width": `${BROWSER_WIDTH}px`,
        } as CSSProperties
      }
    >
      <div className="flex-none h-[var(--catalog-h)] w-[var(--catalog-w)]">
        <div className="w-[var(--catalog-width)] origin-top-left scale-[var(--catalog-scale)] overflow-hidden rounded-[0.875rem] bg-superficie-alta shadow-device">
          <div className="flex h-[2.125rem] items-center gap-2 border-b border-linha px-3.5">
            {[0, 1, 2].map((i) => (
              <span key={i} className="size-2.5 rounded-full bg-linha" />
            ))}
          </div>
          <div className="relative h-[var(--catalog-height)] overflow-hidden">{children}</div>
        </div>
      </div>

      <figcaption className="max-w-[var(--catalog-w)]">
        <Caption title={title} note={note} />
      </figcaption>
    </figure>
  );
}

export function WallFrame({
  children,
  title,
  note,
  scale = 0.46,
}: {
  children: ReactNode;
  title: string;
  note: string;
  scale?: number;
}) {
  const outer = WALL_WIDTH + WALL_BEZEL * 2;
  const scaledWidth = outer * scale;
  const scaledHeight = (WALL_HEIGHT + WALL_BEZEL * 2) * scale;

  return (
    <figure
      className="m-0 flex flex-col gap-4"
      style={
        {
          "--catalog-w": `${scaledWidth}px`,
          "--catalog-h": `${scaledHeight}px`,
          "--catalog-scale": String(scale),
          "--catalog-outer": `${outer}px`,
          "--catalog-height": `${WALL_HEIGHT}px`,
          "--catalog-width": `${WALL_WIDTH}px`,
        } as CSSProperties
      }
    >
      <div className="flex-none h-[var(--catalog-h)] w-[var(--catalog-w)]">
        <div className="w-[var(--catalog-outer)] origin-top-left scale-[var(--catalog-scale)] rounded-[1.25rem] bg-ink p-[18px] shadow-device">
          <div className="relative h-[var(--catalog-height)] w-[var(--catalog-width)] overflow-hidden rounded-[0.5rem]">
            {children}
          </div>
        </div>
      </div>

      <figcaption className="max-w-[var(--catalog-w)]">
        <Caption title={title} note={note} />
      </figcaption>
    </figure>
  );
}
