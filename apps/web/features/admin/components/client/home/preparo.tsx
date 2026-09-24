import { CheckIcon } from "@albora/ui-web";
import Link from "next/link";
import type { EstadoDaHome } from "@/features/admin/data/load-home-state";

function Marca({ feito }: { feito: boolean }) {
  return (
    <span
      aria-hidden
      className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border ${
        feito ? "border-transparent" : "border-linha"
      }`}
      style={feito ? { background: "var(--ev, var(--acento))" } : undefined}
    >
      {feito && (
        <span style={{ color: "var(--ev-on, var(--sobre-acento))" }}>
          <CheckIcon />
        </span>
      )}
    </span>
  );
}

/**
 * Preparação como progresso, não como burocracia: uma linha de avanço e os itens
 * em texto corrido. Cada item reflete estado real do evento — capa, recado e
 * missões saem do banco; identidade, QR e prévia são marcos gravados no evento.
 */
export function Preparo({ estado, titulo }: { estado: EstadoDaHome; titulo: string }) {
  const completo = estado.feitos === estado.total;

  return (
    <section>
      <h2 className="tipo-label m-0 mb-3 text-ink-3">{titulo}</h2>

      <div className="rounded-superficie border border-linha bg-superficie p-[clamp(1.25rem,3vw,1.75rem)]">
        <div className="flex items-baseline justify-between gap-4">
          <p className="tipo-subtitle m-0 text-ink">
            {completo ? "Tudo pronto" : `${estado.feitos} de ${estado.total} essenciais prontos`}
          </p>
          <span className="tipo-caption tabular-nums text-ink-3">{estado.pct}%</span>
        </div>

        <div
          className="mt-3 h-1.5 w-full overflow-hidden rounded-pilula bg-superficie-alta"
          role="progressbar"
          aria-valuenow={estado.feitos}
          aria-valuemin={0}
          aria-valuemax={estado.total}
          aria-label="Preparação do evento"
        >
          <div
            className="h-full rounded-pilula transition-[width] duration-[var(--tempo)] ease-[var(--curva)]"
            style={{ width: `${estado.pct}%`, background: "var(--ev, var(--acento))" }}
          />
        </div>

        <ul className="m-0 mt-5 grid list-none grid-cols-1 gap-x-6 gap-y-3 p-0 sm:grid-cols-2">
          {estado.itens.map((item) => (
            <li key={item.chave} className="flex items-start gap-2.5">
              <Marca feito={item.feito} />
              {item.feito ? (
                <span className="text-[0.95rem] text-ink-3 line-through decoration-linha">
                  {item.titulo}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="text-[0.95rem] text-ink no-underline transition-colors hover:text-acento-texto"
                >
                  {item.titulo}
                </Link>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
