import "../landing/landing.css";
import { CASAMENTO, problemasDaLanding, texto } from "@albora/packs";
import { MARCA_ALBORA, paraVariaveis, resolverTokens } from "@albora/tokens";
import type { CSSProperties } from "react";
import { Aparelho, Navegador } from "./pecas-de-tela";
import {
  TelaAlbum,
  TelaAntesDoGate,
  TelaCamera,
  TelaEntrada,
  TelaFeed,
  TelaPainel,
  TelaTelao,
} from "./telas";

export const metadata = {
  title: "Albora — as telas",
  robots: { index: false, follow: false },
};

/**
 * O catálogo de telas.
 *
 * Não é imagem de apresentação: cada tela roda pelo mesmo `resolverTokens` do
 * produto, dentro do mesmo pack. Trocar o pack ou a identidade redesenha o
 * catálogo inteiro, que é a única forma de um projeto de tela não mentir
 * sobre o que o código vai fazer depois.
 *
 * `noindex` porque é peça de trabalho e não porta de entrada.
 */
export default function Telas() {
  const pack = CASAMENTO;
  const problemas = problemasDaLanding(pack);
  if (problemas.length > 0) throw new Error(problemas.join("; "));

  const tokens = resolverTokens({ marca: MARCA_ALBORA, pack: { ...pack.tokens, fundo: "claro" } });

  const momentos = (pack.momentos ?? []).map((m) => texto(pack, m.chaveTitulo));
  const missao = texto(pack, pack.missoes[2]?.chaveTitulo ?? "missao.livre");

  return (
    <div
      style={{
        ...(paraVariaveis(tokens) as CSSProperties),
        backgroundColor: "var(--bg)",
        color: "var(--ink)",
        fontFamily: "var(--fonte-corpo)",
        lineHeight: 1.6,
        minHeight: "100vh",
        padding: "clamp(2rem, 5vw, 4.5rem) clamp(1.125rem, 4vw, 3rem) 6rem",
      }}
    >
      <header style={{ maxWidth: "44rem", marginBottom: "clamp(2.5rem, 5vw, 4rem)" }}>
        <p
          style={{
            margin: "0 0 1rem",
            fontSize: "0.8125rem",
            letterSpacing: "var(--tracking-rotulo)",
            textTransform: "uppercase",
            color: "var(--acento-texto)",
          }}
        >
          Projeto de telas
        </p>
        <h1
          style={{
            margin: 0,
            fontFamily: "var(--fonte-titulo)",
            fontWeight: 300,
            fontSize: "clamp(2rem, 5vw, 3.5rem)",
            lineHeight: 1.04,
            letterSpacing: "var(--tracking-titulo)",
          }}
        >
          As telas do convidado, do anfitrião e da parede.
        </h1>
        <p style={{ margin: "1.5rem 0 0", maxWidth: "52ch", color: "var(--ink-2)" }}>
          Cada tela roda pelo mesmo resolvedor de tokens do produto, dentro do mesmo pack. Trocar a
          identidade do evento redesenha todas de uma vez. As fotos são slots declarados, e entram
          por <code>src</code> quando existirem.
        </p>
      </header>

      <Grupo
        titulo="O convidado"
        nota="Chão escuro, porque ele usa isto às 23h num salão sem luz. Quatro abas e a câmera no meio, que é a forma consolidada pelo Instagram — o que muda é o conteúdo: sem aba de conversa e sem aba de planejamento."
      >
        <Aparelho
          titulo="Entrada"
          nota="Uma pergunta por tela. Nome e consentimento, e nada mais entre o QR e a câmera. Não existe senha, e-mail nem conta."
        >
          <TelaEntrada pack={pack} />
        </Aparelho>

        <Aparelho
          titulo="Câmera"
          nota="A missão vive em cima do visor, não numa aba. Quem está com uma taça na outra mão não navega até um convite. O lugar é lista fechada, nunca GPS."
        >
          <TelaCamera pack={pack} missao={missao} />
        </Aparelho>

        <Aparelho
          titulo="Feed, antes do gate"
          nota="Mesma aba, sem reação e sem comentário. Botão desabilitado contaria que existe algo trancado; não desenhar conta que ainda não é hora."
        >
          <TelaAntesDoGate pack={pack} />
        </Aparelho>

        <Aparelho
          titulo="Feed, depois do gate"
          nota="A trilha de cima são os capítulos da noite, não pessoas: o Instagram põe contas ali porque é rede entre pessoas. A reação é a estrela da marca — coração é anti-padrão listado."
        >
          <TelaFeed pack={pack} momentos={momentos} />
        </Aparelho>

        <Aparelho
          titulo="O álbum"
          nota="Grade de três, filtrada pelos capítulos que o pack define. É a tela que o convidado abre no dia seguinte."
        >
          <TelaAlbum pack={pack} momentos={momentos} />
        </Aparelho>
      </Grupo>

      <Grupo
        titulo="O anfitrião"
        nota="Web e chão claro: lido de manhã no sofá, não no salão. O gate da interação fica na primeira dobra porque é a decisão que o casal mais volta para mexer."
      >
        <Navegador
          titulo="Painel, durante a festa"
          nota="Contadores reais, as últimas fotos chegando, e o horário em que reação e comentário abrem. Sem métrica de vaidade e sem 'aumente suas memórias'."
          altura={640}
        >
          <TelaPainel pack={pack} />
        </Navegador>

        <Navegador
          titulo="A parede do salão"
          nota="URL fullscreen, sem controle. Foto em pé aparece em pé: encaixar 9:16 em 16:9 descarta o topo, que é onde estão as cabeças."
          altura={420}
          escala={0.52}
        >
          <TelaTelao pack={pack} />
        </Navegador>
      </Grupo>

      <section style={{ maxWidth: "44rem", marginTop: "clamp(2.5rem, 5vw, 4rem)" }}>
        <h2
          style={{
            margin: "0 0 1rem",
            fontFamily: "var(--fonte-titulo)",
            fontWeight: 400,
            fontSize: "1.5rem",
            letterSpacing: "var(--tracking-titulo)",
          }}
        >
          O que a referência tem e isto não
        </h2>
        <ul style={{ margin: 0, paddingLeft: "1.125rem", color: "var(--ink-2)", display: "flex", flexDirection: "column", gap: "0.625rem" }}>
          <li>
            <strong style={{ color: "var(--ink)" }}>Aba de planejamento.</strong> Cronograma, local
            e traje são fase 4, com condições de entrada explícitas. Desenhar agora seria vender o
            que não existe.
          </li>
          <li>
            <strong style={{ color: "var(--ink)" }}>Aba de conversa.</strong> Comentário mora na
            foto. Uma caixa de mensagens paralela é outro produto, com outra superfície de
            moderação.
          </li>
          <li>
            <strong style={{ color: "var(--ink)" }}>Selo de plano na tela do convidado.</strong>{" "}
            Quem paga é o anfitrião. Vender para quem não compra rouba espaço do que decide a
            participação.
          </li>
          <li>
            <strong style={{ color: "var(--ink)" }}>Notificação.</strong> Fica desligada até ter
            decisão própria, por ADR.
          </li>
        </ul>
      </section>
    </div>
  );
}

function Grupo({
  titulo,
  nota,
  children,
}: {
  titulo: string;
  nota: string;
  children: React.ReactNode;
}) {
  return (
    <section style={{ marginBottom: "clamp(3rem, 7vw, 5.5rem)" }}>
      <div style={{ maxWidth: "48rem", marginBottom: "clamp(1.5rem, 3vw, 2.5rem)" }}>
        <h2
          style={{
            margin: 0,
            fontFamily: "var(--fonte-titulo)",
            fontWeight: 300,
            fontSize: "clamp(1.5rem, 3vw, 2.25rem)",
            letterSpacing: "var(--tracking-titulo)",
          }}
        >
          {titulo}
        </h2>
        <p style={{ margin: "0.75rem 0 0", color: "var(--ink-2)" }}>{nota}</p>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "clamp(1.5rem, 3vw, 2.75rem)" }}>
        {children}
      </div>
    </section>
  );
}
