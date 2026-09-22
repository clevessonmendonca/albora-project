import type { CSSProperties } from "react";
import { VerComoConvidado } from "./acoes";

/**
 * O casamento tomando forma dentro do produto: a mesma capa, cor e tipografia
 * que o convidado vai encontrar, num aparelho. Reduz a abstração de "configurei
 * identidade" para "é assim que fica".
 */
export function PreviaDoConvidado({
  eventId,
  slug,
  nome,
  data,
  img,
  vars,
}: {
  eventId: string;
  slug: string;
  nome: string;
  data: string;
  img: string;
  vars: CSSProperties;
}) {
  return (
    <section>
      <h2 className="tipo-label m-0 mb-3 text-ink-3">A experiência dos seus convidados</h2>

      <div className="flex flex-col items-center gap-6 rounded-superficie border border-linha bg-superficie p-[clamp(1.25rem,3vw,2rem)] sm:flex-row sm:items-center sm:gap-10">
        <div
          className="w-[190px] shrink-0 rounded-[30px] border border-linha bg-bg p-1.5 shadow-alta"
          style={vars}
        >
          <div className="relative aspect-[9/19] w-full overflow-hidden rounded-[24px] bg-superficie-alta">
            <img src={img} alt="" className="absolute inset-0 h-full w-full object-cover" />
            <span aria-hidden className="scrim-foto-forte absolute inset-0" />
            <div className="absolute inset-x-3 bottom-4 flex flex-col gap-2">
              <p
                className="sobre-foto m-0 text-[1.05rem] leading-tight [overflow-wrap:anywhere]"
                style={{ fontFamily: "var(--fonte-titulo, inherit)" }}
              >
                {nome}
              </p>
              <p className="sobre-foto m-0 text-[0.6rem] font-medium uppercase tracking-[0.18em]">
                {data}
              </p>
              <span
                className="flex min-h-9 items-center justify-center rounded-pilula text-[0.8rem] font-medium"
                style={{
                  background: "var(--ev, var(--acento))",
                  color: "var(--ev-on, var(--sobre-acento))",
                }}
              >
                Entrar na festa
              </span>
            </div>
          </div>
        </div>

        <div className="min-w-0 flex-1 text-center sm:text-left">
          <p className="tipo-body m-0 max-w-[42ch] text-ink-2">
            Seus convidados apontam a câmera para o QR, entram sem baixar nada e as fotos caem
            direto aqui — e no telão.
          </p>
          <div className="mt-5 flex justify-center sm:justify-start">
            <VerComoConvidado eventId={eventId} slug={slug} rotulo="Experimentar" />
          </div>
        </div>
      </div>
    </section>
  );
}
