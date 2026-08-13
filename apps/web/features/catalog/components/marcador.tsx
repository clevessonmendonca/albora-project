import { cn } from "@albora/ui-web";

export function Marcador({ marcado }: { marcado: boolean }) {
  return (
    <span
      className={cn(
        "grid size-5 shrink-0 place-items-center rounded-[0.375rem] border text-[0.6875rem]",
        marcado ? "border-acento bg-acento text-sobre-acento" : "border-linha text-transparent",
      )}
    >
      ✓
    </span>
  );
}

export function MarcadorDesktop({ checked }: { checked: boolean }) {
  return (
    <span
      className={cn(
        "grid size-[1.125rem] shrink-0 place-items-center rounded-[0.375rem] border text-[0.6875rem]",
        checked
          ? "border-acento bg-acento text-sobre-acento"
          : "border-linha bg-transparent text-transparent",
      )}
    >
      {checked ? "✓" : ""}
    </span>
  );
}
