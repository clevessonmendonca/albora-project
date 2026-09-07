"use client";

import { AJUSTES_NEUTROS, saoNeutros, type AjustesManuais, type Preset, type TextoComposto } from "@albora/core";
import { Button } from "@albora/ui-web";
import type { Dispatch, SetStateAction } from "react";
import type { FaixaVotada } from "./editor-musica";
import { ButtonAba } from "../editor/button-aba";
import { FiltrosTab } from "../editor/filtros-tab";
import { AjustesTab } from "../editor/ajustes-tab";
import { TextoTab } from "../editor/texto-tab";
import { PainelMusica } from "../editor/painel-musica";

type Aba = "filtros" | "ajustes" | "texto" | "musica";

const ABAS: readonly { id: Aba; rotulo: string }[] = [
  { id: "filtros", rotulo: "Filtros" },
  { id: "ajustes", rotulo: "Ajustes" },
  { id: "texto", rotulo: "Texto" },
  { id: "musica", rotulo: "Música" },
];

/** Botão de texto discreto (header/reset) — mesma física de toque (mola) dos demais alvos da tela, nunca a curva de revelação. */
const BOTAO_TEXTO =
  "tipo-label min-h-11 rounded-token uppercase text-ink-3 transition-[color,transform] duration-instantaneo ease-mola hover:text-ink-2 active:scale-95 motion-reduce:active:scale-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-acento-texto focus-visible:outline-offset-2";

export function EditorHeader({
  escolhido,
  onDescartar,
  onSemFiltro,
}: {
  escolhido: Preset | null;
  onDescartar: () => void;
  onSemFiltro: () => void;
}) {
  return (
    <header className="flex items-center justify-between px-6 pt-3">
      <button type="button" className={BOTAO_TEXTO} onClick={onDescartar}>
        Tirar outra
      </button>
      {escolhido && (
        <button type="button" className={BOTAO_TEXTO} onClick={onSemFiltro}>
          Sem filtro
        </button>
      )}
    </header>
  );
}

type EditorControlsProps = {
  aba: Aba;
  onAba: (aba: Aba) => void;
  ajustes: AjustesManuais;
  onAjustes: Dispatch<SetStateAction<AjustesManuais>>;
  escolhido: Preset | null;
  onEscolhido: (preset: Preset | null) => void;
  intensidade: number;
  onIntensidade: (valor: number) => void;
  presets: readonly Preset[];
  recomendadoId: string | null;
  tiras: Map<string, string>;
  previaPronta: boolean;
  texto: TextoComposto | null;
  onTexto: (conteudo: string) => void;
  onRemoverTexto: () => void;
  musicas: readonly FaixaVotada[];
  musicaId: string | null;
  onMusica: (id: string | null) => void;
  onEnviar: () => void;
};

/**
 * Controles do editor de foto.
 * Orquestra 4 abas: filtros, ajustes, texto, música. A foto é o palco — este
 * bloco é chrome de ofício que recua num cartão discreto (`elev-1`) abaixo
 * dela, nunca compete em peso visual.
 */
export function EditorControls({
  aba,
  onAba,
  ajustes,
  onAjustes,
  escolhido,
  onEscolhido,
  intensidade,
  onIntensidade,
  presets,
  recomendadoId,
  tiras,
  previaPronta,
  texto,
  onTexto,
  onRemoverTexto,
  musicas,
  musicaId,
  onMusica,
  onEnviar,
}: EditorControlsProps) {
  const podeZerar = !saoNeutros(ajustes);
  const indiceAba = ABAS.findIndex((a) => a.id === aba);

  return (
    <footer className="elev-1 grid gap-3 rounded-t-media px-6 pb-6 pt-4">
      {/* Barra de abas — indicador único desliza (mola) em vez de saltar de aba pra aba, no padrão editorial (T7 / EditorialTabs): uppercase, tracking-rotulo, traço embaixo da ativa. */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center">
        <span />
        <nav aria-label="Abas do editor" className="relative grid w-full max-w-80 grid-cols-4">
          {ABAS.map((item) => (
            <ButtonAba
              key={item.id}
              rotulo={item.rotulo}
              ativa={aba === item.id}
              onClick={() => onAba(item.id)}
            />
          ))}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute bottom-0 left-0 h-px w-1/4 bg-acento transition-transform duration-instantaneo ease-mola motion-reduce:transition-none"
            style={{ transform: `translateX(${indiceAba * 100}%)` }}
          />
        </nav>
        {podeZerar && aba === "ajustes" ? (
          <button
            type="button"
            className={`${BOTAO_TEXTO} justify-self-end`}
            aria-label="Zerar os ajustes"
            onClick={() => onAjustes(AJUSTES_NEUTROS)}
          >
            Zerar
          </button>
        ) : (
          <span />
        )}
      </div>

      {/* Conteúdo da aba — remonta por `key` a cada troca pra reentrar com um fade sutil (mola/rápido: é resposta direta ao toque na aba, não uma revelação de página). */}
      <div key={aba} className="editor-painel min-h-[6.5rem]">
        {aba === "filtros" && (
          <FiltrosTab
            escolhido={escolhido}
            onEscolhido={onEscolhido}
            intensidade={intensidade}
            onIntensidade={onIntensidade}
            presets={presets}
            recomendadoId={recomendadoId}
            tiras={tiras}
          />
        )}

        {aba === "ajustes" && <AjustesTab ajustes={ajustes} onAjustes={onAjustes} />}

        {aba === "texto" && (
          <TextoTab texto={texto} onTexto={onTexto} onRemoverTexto={onRemoverTexto} />
        )}

        {aba === "musica" && (
          <PainelMusica musicas={musicas} musicaId={musicaId} onMusica={onMusica} />
        )}
      </div>

      <Button variant="primary" size="lg" width="full" onClick={onEnviar} disabled={!previaPronta}>
        Enviar
      </Button>

      <style>{ESTILO_PAINEL}</style>
    </footer>
  );
}

const ESTILO_PAINEL = `
@keyframes editor-painel-entrar {
  from { opacity: 0; }
  to   { opacity: 1; }
}
.editor-painel { animation: editor-painel-entrar var(--tempo-rapido) var(--mola) both; }

@media (prefers-reduced-motion: reduce) {
  .editor-painel { animation: none; }
}
`;
