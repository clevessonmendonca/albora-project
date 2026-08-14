import "../landing/landing.css";
import { MODELOS_DE_TELAO } from "@albora/core";
import { CASAMENTO, problemasDaLanding, texto } from "@albora/packs";
import { MARCA_ALBORA, paraVariaveis, resolverTokens } from "@albora/tokens";
import type { CSSProperties } from "react";
import { Aparelho, Navegador, Parede } from "./pecas-de-tela";
import { CatalogGroup } from "@/features/catalog/components/catalog-group";
import {
  AlbumScreen,
  BeforeGateScreen,
  CameraScreen,
  CoverScreen,
  CommentScreen,
  ReportScreen,
  EntryScreen,
  FeedScreen,
  QueueScreen,
  PhotoDetailScreen,
  MyPhotosScreen,
  MissionsScreen,
  MusicScreen,
  ScannerScreen,
} from "./guest-screens";
import {
  HostAlbumScreen,
  HostCreateEventScreen,
  HostIdentityScreen,
  HostLoginScreen,
  WallModelsScreen,
  HostPanelScreen,
  HostPiecesScreen,
} from "./host-desktop-screens";
import { modelName, modelNote, PanicScreen, WallScreen } from "./wall-screens";

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
      className="min-h-screen bg-bg px-[clamp(1.125rem,4vw,3rem)] pt-[clamp(2rem,5vw,4.5rem)] pb-24 font-corpo text-ink leading-relaxed"
      style={paraVariaveis(tokens) as CSSProperties}
    >
      <header className="mb-[clamp(2.5rem,5vw,4rem)] max-w-[44rem]">
        <p className="mb-4 text-[0.8125rem] uppercase tracking-rotulo text-acento-texto">
          Projeto de telas
        </p>
        <h1 className="font-titulo text-[clamp(2rem,5vw,3.5rem)] font-light leading-[1.04] tracking-titulo">
          As telas do convidado, do anfitrião e da parede.
        </h1>
        <p className="mt-6 max-w-[52ch] text-ink-2">
          Cada tela roda pelo mesmo resolvedor de tokens do produto, dentro do mesmo pack. Trocar a
          identidade do evento redesenha todas de uma vez. As fotos são slots declarados, e entram
          por <code>src</code> quando existirem.{" "}
          <a href="/telas-admin" className="text-acento">
            Ver o anfitrião no app (mobile-first)
          </a>
          .
        </p>
      </header>

      <CatalogGroup
        titulo="O convidado"
        nota="Chão escuro, porque ele usa isto às 23h num salão sem luz. Quatro abas e a câmera no meio, que é a forma consolidada pelo Instagram — o que muda é o conteúdo: sem aba de conversa e sem aba de planejamento."
      >
        <Aparelho
          titulo="Capa do evento"
          nota="Foto grande, o nome, quatro atalhos e o carrossel dos momentos. O card do meio é 9:16 porque é a proporção em que a festa foi fotografada, e o vizinho espiando é o que convida a arrastar."
        >
          <CoverScreen pack={pack} momentos={momentos} fundo="escuro" />
        </Aparelho>

        <Aparelho
          titulo="A mesma capa, no claro"
          nota="O chão é escolha do convidado, não imposição nossa. Um resolvedor, dois chãos: nenhum componente sabe qual está valendo, e a cor do casal manda nos dois."
        >
          <CoverScreen pack={pack} momentos={momentos} fundo="claro" />
        </Aparelho>

        <Aparelho
          titulo="Entrada"
          nota="Uma pergunta por tela. Nome e consentimento, e nada mais entre o QR e a câmera. Não existe senha, e-mail nem conta."
        >
          <EntryScreen pack={pack} />
        </Aparelho>

        <Aparelho
          titulo="Scanner de QR"
          nota="Primeira superfície antes do evento: visor ao vivo, moldura-alvo e fallback 'Já tenho o link'. Sem barra de abas."
        >
          <ScannerScreen pack={pack} />
        </Aparelho>

        <Aparelho
          titulo="Câmera"
          nota="A missão vive em cima do visor, não numa aba. Quem está com uma taça na outra mão não navega até um convite. O lugar é lista fechada, nunca GPS."
        >
          <CameraScreen pack={pack} missao={missao} />
        </Aparelho>

        <Aparelho
          titulo="Fila de envio"
          nota="Caminho crítico offline: pílula no cabeçalho abre sheet com miniatura, estado e banner de sem sinal. Persiste entre recargas; retry com backoff."
        >
          <QueueScreen pack={pack} />
        </Aparelho>

        <Aparelho
          titulo="Missões"
          nota="Card da missão de agora e trilha do progresso. A câmera continua no meio da barra; esta aba só torna visível o que falta, sem placar entre pessoas."
        >
          <MissionsScreen pack={pack} />
        </Aparelho>

        <Aparelho
          titulo="Feed, antes do gate"
          nota="Mesma aba, sem reação e sem comentário. Botão disabled contaria que existe algo trancado; não desenhar conta que ainda não é hora."
        >
          <BeforeGateScreen pack={pack} />
        </Aparelho>

        <Aparelho
          titulo="Feed, depois do gate"
          nota="A trilha de cima são os capítulos da noite, não pessoas: o Instagram põe contas ali porque é rede entre pessoas. A reação é a estrela da marca — coração é anti-padrão listado."
        >
          <FeedScreen pack={pack} momentos={momentos} />
        </Aparelho>

        <Aparelho
          titulo="O álbum"
          nota="Grade de três, filtrada pelos capítulos que o pack define. É a tela que o convidado abre no dia seguinte."
        >
          <AlbumScreen pack={pack} momentos={momentos} />
        </Aparelho>

        <Aparelho
          titulo="Minhas"
          nota="O que este convidado enviou, a cota de vídeo e o remover da própria foto — sem cabeçalho de perfil. Grade de miniaturas arredondadas, uma com selo de vídeo."
        >
          <MyPhotosScreen pack={pack} />
        </Aparelho>

        <Aparelho
          titulo="Foto aberta"
          nota="Tela filled com reação, comentário e compartilhar só na foto do próprio autor. O ✕ remove quando a foto é dela."
        >
          <PhotoDetailScreen pack={pack} />
        </Aparelho>

        <Aparelho
          titulo="Comentar"
          nota="Sheet por baixo da foto aberta: thread + compositor fixo. Só depois do gate."
        >
          <CommentScreen pack={pack} />
        </Aparelho>

        <Aparelho
          titulo="Denúncia"
          nota="Sheet de sinalização: confirma, motivo opcional, bloquear autor. Moderação degrada — nunca trava o upload."
        >
          <ReportScreen pack={pack} />
        </Aparelho>

        <Aparelho
          titulo="Música da festa"
          nota="Trilha escolhida pelos anfitriões — capa, onda decorativa e link pro app. Sem fila colaborativa."
        >
          <MusicScreen pack={pack} />
        </Aparelho>
      </CatalogGroup>

      <CatalogGroup
        titulo="O anfitrião"
        nota="Web e chão claro: lido de manhã no sofá, não no salão. O gate da interação fica na primeira dobra porque é a decisão que o anfitrião mais volta para mexer."
      >
        <Navegador
          titulo="Login"
          nota="Magic link por e-mail. Sem senha, sem cadastro de convidado — só o anfitrião entra por conta."
          altura={520}
          escala={0.58}
        >
          <HostLoginScreen pack={pack} />
        </Navegador>

        <Navegador
          titulo="Login — link enviado"
          nota="Estado após pedir o link. O e-mail real vem do Resend em produção; em dev o link aparece na resposta."
          altura={480}
          escala={0.58}
        >
          <HostLoginScreen pack={pack} enviado />
        </Navegador>

        <Navegador
          titulo="Criar evento — passo 1"
          nota="Wizard multi-passo: nome, data, expected_guests. Uma decisão por tela até o QR pronto."
          altura={620}
          escala={0.58}
        >
          <HostCreateEventScreen pack={pack} passo={1} />
        </Navegador>

        <Navegador
          titulo="Criar evento — peças"
          nota="Último passo antes do painel ao vivo: a placa com QR é a porta física do convidado."
          altura={620}
          escala={0.58}
        >
          <HostCreateEventScreen pack={pack} passo={5} />
        </Navegador>

        <Navegador
          titulo="Identidade"
          nota="Controles à esquerda, preview ao vivo à direita — o mesmo resolverTokens do telão e da peça impressa."
          altura={760}
          escala={0.58}
        >
          <HostIdentityScreen pack={pack} momentos={momentos} />
        </Navegador>

        <Navegador
          titulo="Painel, durante a festa"
          nota="Contadores reais, as últimas fotos chegando, e o horário em que reação e comentário abrem. Sem métrica de vaidade e sem 'aumente suas memórias'."
          altura={760}
          escala={0.58}
        >
          <HostPanelScreen pack={pack} />
        </Navegador>

        <Navegador
          titulo="O mesmo painel, com menores na festa"
          nota="Um interruptor por evento, e nenhuma pergunta de idade — em lugar nenhum do produto. Ligado, ele desliga o compartilhamento para fora, deixa o gate começar fechado e faz uma denúncia segurar em vez de duas. É controle de evento, não de pessoa: ninguém é marcado."
          altura={760}
          escala={0.58}
        >
          <HostPanelScreen pack={pack} haMenores />
        </Navegador>

        <Navegador
          titulo="Os modelos da parede"
          nota="Oito modelos, e o anfitrião marca quais entram no rodízio. Sete aceitam foto em pé; Cheio sangra até a borda e por isso só aceita deitada."
          altura={600}
          escala={0.58}
        >
          <WallModelsScreen pack={pack} escolhidos={["polaroide", "mural", "dump", "cheio"]} />
        </Navegador>

        <Navegador
          titulo="A mesma escolha, recusada"
          nota="Só Cheio marcado. Nenhum modelo restante aceita foto em pé, e três de cada quatro fotos de festa são verticais — a parede rodaria a noite inteira mostrando o quarto deitado do acervo. Quem recusa é problemasDaEscolha, no núcleo: a tela mostra o veredito, não uma cópia da regra."
          altura={790}
          escala={0.58}
        >
          <WallModelsScreen pack={pack} escolhidos={["cheio"]} />
        </Navegador>

        <Navegador
          titulo="O álbum — visão do anfitrião"
          nota="Grade filtrável por capítulo; hover revela ocultar. Curadoria leve, distinta do álbum do convidado."
          altura={680}
          escala={0.58}
        >
          <HostAlbumScreen pack={pack} momentos={momentos} />
        </Navegador>

        <Navegador
          titulo="Peças para imprimir"
          nota="Preview da placa A4 com QR nível H. Download SVG hoje; PDF na fila do CI."
          altura={620}
          escala={0.58}
        >
          <HostPiecesScreen pack={pack} />
        </Navegador>
      </CatalogGroup>

      <CatalogGroup
        titulo="A parede"
        nota="URL fullscreen, sem cromo e sem cursor. Oito modelos que se alternam a noite inteira, e o único deles que recusa foto em pé é Cheio — a fila filtra as verticais antes de sortear, em vez de escolher uma foto e depois descobrir que ela não cabe."
      >
        <Parede titulo="Pânico — telão pausado" nota="Takeover honesto: nome do evento e 'voltamos já'. Nenhuma foto exposta enquanto o pânico está ligado.">
          <PanicScreen pack={pack} />
        </Parede>

        {MODELOS_DE_TELAO.map((modelo) => (
          <Parede key={modelo} titulo={modelName(modelo)} nota={modelNote(modelo)}>
            <WallScreen pack={pack} modelo={modelo} />
          </Parede>
        ))}
      </CatalogGroup>

      <section className="mt-[clamp(2.5rem,5vw,4rem)] max-w-[44rem]">
        <h2 className="mb-4 font-titulo text-2xl font-normal tracking-titulo">
          O que a referência tem e isto não
        </h2>
        <ul className="m-0 flex list-disc flex-col gap-2.5 pl-[1.125rem] text-ink-2">
          <li>
            <strong className="text-ink">Aba de planejamento.</strong> Cronograma, local
            e traje são fase 4, com condições de entrada explícitas. Desenhar agora seria vender o
            que não existe.
          </li>
          <li>
            <strong className="text-ink">Aba de conversa.</strong> Comentário mora na
            foto. Uma caixa de mensagens paralela é outro produto, com outra superfície de
            moderação.
          </li>
          <li>
            <strong className="text-ink">Selo de plano na tela do convidado.</strong>{" "}
            Quem paga é o anfitrião. Vender para quem não compra rouba espaço do que decide a
            participação.
          </li>
          <li>
            <strong className="text-ink">Notificação.</strong> Fica desligada até ter
            decisão própria, por ADR.
          </li>
        </ul>
      </section>
    </div>
  );
}
