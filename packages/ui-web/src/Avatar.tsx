import { cn } from "./variantes";

/**
 * O avatar do convidado é a inicial do primeiro nome, não uma foto de perfil.
 *
 * A Albora não é rede entre pessoas: não há conta, não há retrato de perfil. O
 * autor é primeiro nome, e a inicial basta para distinguir sem prometer um
 * perfil que não existe.
 */
export function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  if (partes.length === 1) return partes[0]!.slice(0, 2).toUpperCase();
  return `${partes[0]![0] ?? ""}${partes[1]![0] ?? ""}`.toUpperCase();
}

export function Avatar({ nome, className }: { nome: string; className?: string }) {
  return (
    <span
      className={cn(
        "grid size-8 shrink-0 place-items-center rounded-full bg-superficie-alta text-xs text-ink",
        className,
      )}
    >
      {iniciais(nome)}
    </span>
  );
}
