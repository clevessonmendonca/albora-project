import "../landing/landing.css";
import { MODELOS_DE_TELAO } from "@albora/core";
import { CASAMENTO, problemasDaLanding, texto } from "@albora/packs";
import { MARCA_ALBORA, paraVariaveis, resolverTokens } from "@albora/tokens";
import type { CSSProperties } from "react";
import { Aparelho, Navegador, Parede } from "./pecas-de-tela";
import {
  nomeDoModelo,
  notaDoModelo,
  TelaAlbum,
  TelaAntesDoGate,
  TelaCamera,
  TelaComentar,
  TelaDenuncia,
  TelaEntrada,
  TelaFila,
  TelaModelosDaParede,
  TelaMusica,
  TelaPainel,
  TelaScanner,
  TelaTelao,
} from "./telas";
import { TelaCapa, TelaFeed, TelaFotoAberta, TelaMinhas, TelaMissoes } from "./telas-convidado";

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
          titulo="Capa do evento"
          nota="Foto grande, o nome, quatro atalhos e o carrossel dos momentos. O card do meio é 9:16 porque é a proporção em que a festa foi fotografada, e o vizinho espiando é o que convida a arrastar."
        >
          <TelaCapa pack={pack} momentos={momentos} fundo="escuro" />
        </Aparelho>

        <Aparelho
          titulo="A mesma capa, no claro"
          nota="O chão é escolha do convidado, não imposição nossa. Um resolvedor, dois chãos: nenhum componente sabe qual está valendo, e a cor do casal manda nos dois."
        >
          <TelaCapa pack={pack} momentos={momentos} fundo="claro" />
        </Aparelho>

        <Aparelho
          titulo="Entrada"
          nota="Uma pergunta por tela. Nome e consentimento, e nada mais entre o QR e a câmera. Não existe senha, e-mail nem conta."
        >
          <TelaEntrada pack={pack} />
        </Aparelho>

        <Aparelho
          titulo="Scanner de QR"
          nota="Primeira superfície antes do evento: visor ao vivo, moldura-alvo e fallback 'Já tenho o link'. Sem barra de abas."
        >
          <TelaScanner pack={pack} />
        </Aparelho>

        <Aparelho
          titulo="Câmera"
          nota="A missão vive em cima do visor, não numa aba. Quem está com uma taça na outra mão não navega até um convite. O lugar é lista fechada, nunca GPS."
        >
          <TelaCamera pack={pack} missao={missao} />
        </Aparelho>

        <Aparelho
          titulo="Fila de envio"
          nota="Caminho crítico offline: pílula no cabeçalho abre sheet com miniatura, estado e banner de sem sinal. Persiste entre recargas; retry com backoff."
        >
          <TelaFila pack={pack} />
        </Aparelho>

        <Aparelho
          titulo="Missões"
          nota="Card da missão de agora e trilha do progresso. A câmera continua no meio da barra; esta aba só torna visível o que falta, sem placar entre pessoas."
        >
          <TelaMissoes pack={pack} />
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

        <Aparelho
          titulo="Minhas"
          nota="O que este convidado enviou, a cota de vídeo e o remover da própria foto — sem cabeçalho de perfil. Grade de miniaturas arredondadas, uma com selo de vídeo."
        >
          <TelaMinhas pack={pack} />
        </Aparelho>

        <Aparelho
          titulo="Foto aberta"
          nota="Tela cheia com reação, comentário e compartilhar só na foto do próprio autor. O ✕ remove quando a foto é dela."
        >
          <TelaFotoAberta pack={pack} />
        </Aparelho>

        <Aparelho
          titulo="Comentar"
          nota="Sheet por baixo da foto aberta: thread + compositor fixo. Só depois do gate."
        >
          <TelaComentar pack={pack} />
        </Aparelho>

        <Aparelho
          titulo="Denúncia"
          nota="Sheet de sinalização: confirma, motivo opcional, bloquear autor. Moderação degrada — nunca trava o upload."
        >
          <TelaDenuncia pack={pack} />
        </Aparelho>

        <Aparelho
          titulo="Música da festa"
          nota="Trilha escolhida pelos anfitriões — capa, onda decorativa e link pro app. Sem fila colaborativa."
        >
          <TelaMusica pack={pack} />
        </Aparelho>
      </Grupo>

      <Grupo
        titulo="O anfitrião"
        nota="Web e chão claro: lido de manhã no sofá, não no salão. O gate da interação fica na primeira dobra porque é a decisão que o anfitrião mais volta para mexer."
      >
        <Navegador
          titulo="Painel, durante a festa"
          nota="Contadores reais, as últimas fotos chegando, e o horário em que reação e comentário abrem. Sem métrica de vaidade e sem 'aumente suas memórias'."
          altura={760}
          escala={0.58}
        >
          <TelaPainel pack={pack} />
        </Navegador>

        <Navegador
          titulo="O mesmo painel, com menores na festa"
          nota="Um interruptor por evento, e nenhuma pergunta de idade — em lugar nenhum do produto. Ligado, ele desliga o compartilhamento para fora, deixa o gate começar fechado e faz uma denúncia segurar em vez de duas. É controle de evento, não de pessoa: ninguém é marcado."
          altura={760}
          escala={0.58}
        >
          <TelaPainel pack={pack} haMenores />
        </Navegador>

        <Navegador
          titulo="Os modelos da parede"
          nota="Oito modelos, e o anfitrião marca quais entram no rodízio. Sete aceitam foto em pé; Cheio sangra até a borda e por isso só aceita deitada."
          altura={600}
          escala={0.58}
        >
          <TelaModelosDaParede pack={pack} escolhidos={["polaroide", "mural", "dump", "cheio"]} />
        </Navegador>

        <Navegador
          titulo="A mesma escolha, recusada"
          nota="Só Cheio marcado. Nenhum modelo restante aceita foto em pé, e três de cada quatro fotos de festa são verticais — a parede rodaria a noite inteira mostrando o quarto deitado do acervo. Quem recusa é problemasDaEscolha, no núcleo: a tela mostra o veredito, não uma cópia da regra."
          altura={790}
          escala={0.58}
        >
          <TelaModelosDaParede pack={pack} escolhidos={["cheio"]} />
        </Navegador>
      </Grupo>

      <Grupo
        titulo="A parede"
        nota="URL fullscreen, sem cromo e sem cursor. Oito modelos que se alternam a noite inteira, e o único deles que recusa foto em pé é Cheio — a fila filtra as verticais antes de sortear, em vez de escolher uma foto e depois descobrir que ela não cabe."
      >
        {MODELOS_DE_TELAO.map((modelo) => (
          <Parede key={modelo} titulo={nomeDoModelo(modelo)} nota={notaDoModelo(modelo)}>
            <TelaTelao pack={pack} modelo={modelo} />
          </Parede>
        ))}
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
