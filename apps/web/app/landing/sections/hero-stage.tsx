import { ALBORA_BRAND, resolveTokens, toVariables } from "@albora/tokens";
import type { Pack } from "@albora/packs";
import type { CSSProperties } from "react";
import { Frame } from "../pieces";

/**
 * O produto aparece no hero: o celular do convidado, escaneando e fotografando
 * — escaneia → fotografa → telão. Superfícies escuras (o fluxo do convidado
 * vive no `noite`), então resolvemos tokens em `background: "dark"`. A imagem é
 * placeholder via `Frame` — nunca foto real de convidado (LGPD).
 */
export function HeroStage({ pack, example }: { pack: Pack; example: string }) {
  const dark = resolveTokens({
    marca: ALBORA_BRAND,
    pack: { ...pack.tokens, background: "dark" },
  });

  return (
    <div
      className="flex justify-center lg:justify-end"
      style={toVariables(dark) as CSSProperties}
    >
      {/* Celular do convidado */}
      <div
        className="w-[min(17rem,78vw)] rounded-[2.125rem] border border-linha bg-bg p-2.5 shadow-[var(--shadow-alta)]"
        aria-label="Tela do convidado: escaneia o QR, fotografa e a foto vai pro telão"
      >
        <div className="flex flex-col overflow-hidden rounded-[1.625rem] bg-superficie">
          {/* topo */}
          <div className="flex items-center justify-between px-4 pb-2.5 pt-3.5 text-[0.6875rem] text-ink-3">
            <span>{example}</span>
            <span className="font-titulo text-[0.8125rem] text-ink">Álbora</span>
          </div>

          {/* câmera / QR */}
          <div
            className="relative mx-3 aspect-[3/4] overflow-hidden rounded-media"
            style={{ "--escaneia-dist": "11rem" } as CSSProperties}
          >
            <Frame label="" radius="0px" atmosphere variant={5} />
            <span className="pointer-events-none absolute inset-[22%]">
              <i className="absolute left-0 top-0 size-5 border-l-2 border-t-2 border-ink" />
              <i className="absolute right-0 top-0 size-5 border-r-2 border-t-2 border-ink" />
              <i className="absolute bottom-0 left-0 size-5 border-b-2 border-l-2 border-ink" />
              <i className="absolute bottom-0 right-0 size-5 border-b-2 border-r-2 border-ink" />
            </span>
            <span className="escaneia-linha absolute inset-x-[22%] top-3 h-0.5 rounded-full bg-acento" />

            <span className="absolute inset-x-2.5 bottom-2.5 inline-flex items-center gap-2 rounded-token bg-bg-vidro-forte px-2.5 py-2 text-[0.6875rem] leading-tight text-ink">
              <span className="grid size-4 shrink-0 place-items-center rounded-full bg-acento text-[0.5rem] font-bold text-sobre-acento">
                ✓
              </span>
              <span>
                Foto enviada
                <span className="block text-[0.5625rem] uppercase tracking-rotulo text-ink-3">
                  já no telão do salão
                </span>
              </span>
            </span>
          </div>

          {/* disparo */}
          <div className="grid place-items-center py-4">
            <span className="size-11 rounded-full bg-ink shadow-[0_0_0_3px_var(--bg),0_0_0_5px_var(--ink-borda)]" />
          </div>

          {/* fluxo */}
          <div className="flex items-center justify-center gap-1.5 pb-3.5 text-[0.5625rem] uppercase tracking-rotulo text-ink-3">
            escaneia <span className="text-acento">→</span> fotografa{" "}
            <span className="text-acento">→</span> telão
          </div>
        </div>
      </div>
    </div>
  );
}
