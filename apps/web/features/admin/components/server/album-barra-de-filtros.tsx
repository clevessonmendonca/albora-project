import Link from "next/link";
import type { AbaFotos, AbaFotosId } from "@/features/admin/lib/abas-fotos";

/** A barra de filtro em pílula do protótipo (§5.3) — mesmo mecanismo de URL do `abas-fotos.ts`, aparência nova. */
export function AlbumBarraDeFiltros({
  base,
  itens,
  ativa,
  contagens,
}: {
  base: string;
  itens: readonly AbaFotos[];
  ativa: AbaFotosId;
  contagens: Record<AbaFotosId, number>;
}) {
  return (
    <div className="mb-6 flex flex-wrap gap-2">
      {itens.map((item) => {
        const ativo = item.id === ativa;
        return (
          <Link
            key={item.id}
            href={`${base}${item.suffix}`}
            aria-current={ativo ? "true" : undefined}
            className={[
              "inline-flex min-h-11 items-center rounded-pilula border px-4 text-[13px] font-bold no-underline transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)]",
              ativo
                ? "border-ink bg-ink text-bg"
                : "border-linha bg-superficie text-ink-2 hover:bg-superficie-alta",
            ].join(" ")}
          >
            {item.rotulo} · {contagens[item.id]}
          </Link>
        );
      })}
    </div>
  );
}
