import type { CSSProperties, ReactNode } from "react";
import { raio } from "../landing/pecas";

/**
 * As molduras do catálogo e os átomos que as telas repetem.
 *
 * O aparelho e o navegador existem só aqui: são a régua que faz duas telas
 * lado a lado serem comparáveis. Nada dentro deles sabe que está num catálogo,
 * e é por isso que cada tela pode sair daqui para uma rota sem reescrita.
 */

export const ALTURA_APARELHO = 844;
export const LARGURA_APARELHO = 390;

export function Aparelho({
  children,
  titulo,
  nota,
  escala = 0.78,
}: {
  children: ReactNode;
  titulo: string;
  nota: string;
  escala?: number;
}) {
  return (
    <figure style={{ margin: 0, display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div
        style={{
          width: LARGURA_APARELHO * escala,
          height: ALTURA_APARELHO * escala,
          flex: "none",
        }}
      >
        <div
          style={{
            width: LARGURA_APARELHO,
            height: ALTURA_APARELHO,
            transform: `scale(${escala})`,
            transformOrigin: "top left",
            padding: "0.75rem",
            ...raio("3.25rem"),
            backgroundColor: "var(--ink)",
            boxShadow:
              "0 2px 4px color-mix(in srgb, var(--ink) 8%, transparent), 0 24px 48px -16px color-mix(in srgb, var(--ink) 34%, transparent)",
          }}
        >
          <div
            style={{
              position: "relative",
              width: "100%",
              height: "100%",
              ...raio("2.625rem"),
              overflow: "hidden",
            }}
          >
            {children}
          </div>
        </div>
      </div>

      <figcaption style={{ maxWidth: LARGURA_APARELHO * escala }}>
        <p
          style={{
            margin: 0,
            fontFamily: "var(--fonte-titulo)",
            fontSize: "1.0625rem",
            letterSpacing: "var(--tracking-titulo)",
          }}
        >
          {titulo}
        </p>
        <p style={{ margin: "0.375rem 0 0", fontSize: "0.8125rem", lineHeight: 1.5, color: "var(--ink-2)" }}>
          {nota}
        </p>
      </figcaption>
    </figure>
  );
}

export function Navegador({
  children,
  titulo,
  nota,
  altura = 700,
  escala = 0.62,
}: {
  children: ReactNode;
  titulo: string;
  nota: string;
  altura?: number;
  escala?: number;
}) {
  const largura = 1180;

  return (
    <figure style={{ margin: 0, display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div style={{ width: largura * escala, height: (altura + 34) * escala, flex: "none" }}>
        <div
          style={{
            width: largura,
            transform: `scale(${escala})`,
            transformOrigin: "top left",
            ...raio("0.875rem"),
            overflow: "hidden",
            backgroundColor: "var(--superficie-alta)",
            boxShadow:
              "0 2px 4px color-mix(in srgb, var(--ink) 8%, transparent), 0 24px 48px -16px color-mix(in srgb, var(--ink) 30%, transparent)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              height: "2.125rem",
              padding: "0 0.875rem",
              borderBottomWidth: "1px",
              borderBottomStyle: "solid",
              borderBottomColor: "var(--linha)",
            }}
          >
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                style={{
                  width: "0.625rem",
                  height: "0.625rem",
                  borderRadius: "50%",
                  backgroundColor: "var(--linha)",
                }}
              />
            ))}
          </div>
          <div style={{ position: "relative", height: altura, overflow: "hidden" }}>{children}</div>
        </div>
      </div>

      <figcaption style={{ maxWidth: largura * escala }}>
        <p
          style={{
            margin: 0,
            fontFamily: "var(--fonte-titulo)",
            fontSize: "1.0625rem",
            letterSpacing: "var(--tracking-titulo)",
          }}
        >
          {titulo}
        </p>
        <p style={{ margin: "0.375rem 0 0", fontSize: "0.8125rem", lineHeight: 1.5, color: "var(--ink-2)" }}>
          {nota}
        </p>
      </figcaption>
    </figure>
  );
}

export const LARGURA_PAREDE = 1180;
/** 16:9 exato sobre `LARGURA_PAREDE` — é a proporção da TV do salão. */
export const ALTURA_PAREDE = Math.round((LARGURA_PAREDE * 9) / 16);

/**
 * A moldura da parede: uma TV, não uma janela de navegador.
 *
 * O `Navegador` empresta abas e botões que a parede não tem — ela é URL
 * fullscreen, sem cromo e sem cursor (spec 010). Desenhá-la dentro de um
 * navegador contaria que existe barra de endereço para alguém tocar durante a
 * festa, e não existe.
 */
export function Parede({
  children,
  titulo,
  nota,
  escala = 0.46,
}: {
  children: ReactNode;
  titulo: string;
  nota: string;
  escala?: number;
}) {
  const moldura = 18;
  const externa = LARGURA_PAREDE + moldura * 2;

  return (
    <figure style={{ margin: 0, display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div style={{ width: externa * escala, height: (ALTURA_PAREDE + moldura * 2) * escala, flex: "none" }}>
        <div
          style={{
            width: externa,
            transform: `scale(${escala})`,
            transformOrigin: "top left",
            padding: moldura,
            ...raio("1.25rem"),
            backgroundColor: "var(--ink)",
            boxShadow:
              "0 2px 4px color-mix(in srgb, var(--ink) 8%, transparent), 0 24px 48px -16px color-mix(in srgb, var(--ink) 30%, transparent)",
          }}
        >
          <div
            style={{
              position: "relative",
              width: LARGURA_PAREDE,
              height: ALTURA_PAREDE,
              ...raio("0.5rem"),
              overflow: "hidden",
            }}
          >
            {children}
          </div>
        </div>
      </div>

      <figcaption style={{ maxWidth: externa * escala }}>
        <p
          style={{
            margin: 0,
            fontFamily: "var(--fonte-titulo)",
            fontSize: "1.0625rem",
            letterSpacing: "var(--tracking-titulo)",
          }}
        >
          {titulo}
        </p>
        <p style={{ margin: "0.375rem 0 0", fontSize: "0.8125rem", lineHeight: 1.5, color: "var(--ink-2)" }}>
          {nota}
        </p>
      </figcaption>
    </figure>
  );
}

export {
  BarraDeAbas,
  BarraDeStatus,
  BotaoFlutuante,
  Estrela,
  IconeCamera,
  IconeComentario,
  IconeCompartilhar,
  IconeGrade,
  IconeMais,
  IconePessoa,
  IconePilha,
  IconeVoltar,
} from "@albora/ui-web";
export { Pilula } from "@/features/guest/components/client/guest-ui-parts";
