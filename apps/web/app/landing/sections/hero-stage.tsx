import { ALBORA_BRAND, resolveTokens, toVariables } from "@albora/tokens";
import type { Pack } from "@albora/packs";
import type { CSSProperties } from "react";
import { Frame } from "../pieces";

/**
 * O herói visual não é o celular — é a experiência: o convidado escaneia e
 * fotografa, e a foto aparece no telão da festa na hora. Telão ao vivo atrás,
 * celular do convidado na frente. Superfícies escuras (fluxo do convidado e
 * telão vivem no `noite`), então resolvemos tokens em `background: "dark"`.
 * Placeholders via `Frame` — nunca foto real de convidado (LGPD).
 */
export function HeroStage({ pack, example }: { pack: Pack; example: string }) {
  const dark = resolveTokens({
    marca: ALBORA_BRAND,
    pack: { ...pack.tokens, background: "dark" },
  });

  return (
    <div
      className="relative mx-auto w-full max-w-[24rem] select-none"
      style={{ ...(toVariables(dark) as CSSProperties), aspectRatio: "4 / 5" }}
      aria-label="Convidado escaneia o QR, fotografa e a foto aparece no telão ao vivo"
    >
      {/* Telão — ao vivo, atrás */}
      <div className="absolute right-0 top-0 w-[80%] overflow-hidden rounded-superficie border border-linha bg-bg shadow-[var(--shadow-suave)]">
        <div className="relative aspect-video">
          <Frame label="" radius="0px" atmosphere variant={2} />
          <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-pilula bg-bg-vidro-medio px-2.5 py-1 text-[0.625rem] uppercase tracking-rotulo text-ink-2">
            <span className="pulso size-1.5 rounded-full bg-acento" />
            Telão · ao vivo
          </span>
          <span className="absolute bottom-3 right-3 text-[0.625rem] uppercase tracking-rotulo text-ink-3">
            {example}
          </span>
        </div>
      </div>

      {/* Celular do convidado — na frente */}
      <div className="absolute bottom-0 left-0 w-[47%] rounded-[1.75rem] border border-linha bg-bg p-2 shadow-[var(--shadow-alta)]">
        <div
          className="relative aspect-[9/16] overflow-hidden rounded-[1.25rem] bg-superficie"
          style={{ "--escaneia-dist": "8.5rem" } as CSSProperties}
        >
          <Frame label="" radius="0px" atmosphere variant={5} />

          {/* mira do QR */}
          <span className="pointer-events-none absolute inset-[22%]">
            <i className="absolute left-0 top-0 size-4 border-l-2 border-t-2 border-ink" />
            <i className="absolute right-0 top-0 size-4 border-r-2 border-t-2 border-ink" />
            <i className="absolute bottom-0 left-0 size-4 border-b-2 border-l-2 border-ink" />
            <i className="absolute bottom-0 right-0 size-4 border-b-2 border-r-2 border-ink" />
          </span>
          {/* linha de escaneio */}
          <span className="escaneia-linha absolute inset-x-[22%] top-[22%] h-0.5 rounded-full bg-acento" />

          {/* confirmação */}
          <span className="absolute inset-x-2 bottom-2 inline-flex items-center gap-2 rounded-token bg-bg-vidro-forte px-2.5 py-2 text-[0.6875rem] leading-tight text-ink">
            <span className="grid size-4 place-items-center rounded-full bg-acento text-[0.5rem] font-bold text-sobre-acento">
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
      </div>
    </div>
  );
}
