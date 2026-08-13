import { Frame } from "@albora/ui-web";

export function OQueFicariaDeFora() {
  return (
    <span className="flex items-end gap-2">
      {[0, 1, 2].map((i) => (
        <span key={i} className="relative h-[4.5rem] aspect-[9/16]">
          <span className="absolute inset-0 overflow-hidden rounded-token">
            <Frame atmosphere variant={i * 8 + 1} />
          </span>
          <span className="absolute inset-0 grid place-items-center rounded-token bg-critico-overlay text-base text-sobre-acento">
            ✕
          </span>
        </span>
      ))}

      <span className="relative h-[4.5rem] aspect-[16/9]">
        <span className="absolute inset-0 overflow-hidden rounded-token">
          <Frame atmosphere variant={21} />
        </span>
      </span>

      <span className="max-w-[30ch] text-xs leading-snug text-ink-2">
        Três de cada quatro fotos de festa são verticais. Só a quarta subiria à parede.
      </span>
    </span>
  );
}
