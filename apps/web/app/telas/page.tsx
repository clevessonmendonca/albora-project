import "../landing/landing.css";
import { landingProblems, resolvePackText, WEDDING } from "@albora/packs";
import { ALBORA_BRAND, resolveTokens, toVariables } from "@albora/tokens";
import type { CSSProperties, ReactNode } from "react";
import { PhoneFrame } from "./catalog-frames";
import {
  AlbumScreen,
  BeforeGateScreen,
  CameraScreen,
  CommentScreen,
  ConfirmScreen,
  CoverScreen,
  EntryScreen,
  FeedScreen,
  HostMessageScreen,
  MissionsScreen,
  MusicScreen,
  MyPhotosScreen,
  PhotoDetailScreen,
  QueueScreen,
  ReportScreen,
  ScannerScreen,
  ShareConsentScreen,
} from "./guest-screens";

export const metadata = {
  title: "Albora — telas do convidado",
  robots: { index: false, follow: false },
};

export default function GuestCatalogPage() {
  const pack = WEDDING;
  const problemas = landingProblems(pack);
  if (problemas.length > 0) throw new Error(problemas.join("; "));

  const tokens = resolveTokens({ marca: ALBORA_BRAND, pack: { ...pack.tokens, background: "light" } });
  const mission = resolvePackText(pack, pack.missoes[1]?.chaveTitulo ?? "missao.livre");
  const moments = ["A cerimônia", "A festa", "O amanhecer", "A saída"];

  return (
    <div
      className="min-h-screen bg-bg px-[clamp(1.125rem,4vw,3rem)] pt-[clamp(2rem,5vw,4.5rem)] pb-24 font-corpo text-ink leading-relaxed"
      style={toVariables(tokens) as CSSProperties}
    >
      <header className="mb-[clamp(2rem,4vw,3.5rem)] max-w-3xl">
        <p className="mb-4 text-[0.8125rem] uppercase tracking-rotulo text-acento-texto">
          Convidado · sem login · PWA
        </p>
        <h1 className="font-titulo text-[clamp(2rem,5vw,3.5rem)] font-light leading-tight tracking-titulo">
          A primeira foto nunca passa por loja de aplicativos.
        </h1>
        <p className="mt-6 max-w-[52ch] text-ink-2">
          QR → nome → câmera. Três toques, sem cadastro, sem senha. A participação decide se o
          negócio existe.
        </p>
      </header>

      <div className="flex flex-wrap gap-[clamp(1.5rem,3vw,2.75rem)]">
        <Showcase
          title="Scanner"
          note="A porta de entrada: escaneie o QR da mesa ou do convite. Sem app, sem cadastro."
        >
          <ScannerScreen pack={pack} />
        </Showcase>

        <Showcase
          title="Capa"
          note="Reconhecimento imediato — o evento antes de qualquer ação do convidado."
        >
          <CoverScreen pack={pack} moments={moments} background="light" />
        </Showcase>

        <Showcase
          title="Entrada"
          note="Nome + consentimento. Uma coisa só. O botão destrava quando o nome tem dois caracteres."
        >
          <EntryScreen pack={pack} />
        </Showcase>

        <Showcase
          title="Câmera — missão ativa"
          note="A missão do momento aparece antes do disparador. O contexto informa a foto."
        >
          <CameraScreen pack={pack} mission={mission} />
        </Showcase>

        <Showcase
          title="Câmera — fila offline"
          note="Sem sinal: as fotos ficam na fila local. O retry acontece sozinho quando o sinal volta."
        >
          <QueueScreen pack={pack} />
        </Showcase>

        <Showcase
          title="Confirmação — Android"
          note="Foto enviada: já está no telão. CTA pra instalar o PWA."
        >
          <ConfirmScreen pack={pack} />
        </Showcase>

        <Showcase
          title="Confirmação — iOS"
          note="iOS não tem install prompt: mostra os dois passos do Add to Home Screen."
        >
          <ConfirmScreen pack={pack} ios />
        </Showcase>

        <Showcase
          title="Recado dos anfitriões"
          note="Áudio + texto. O anfitrião fala antes da festa abrir — quem tem fone ouve, os outros leem."
        >
          <HostMessageScreen pack={pack} />
        </Showcase>

        <Showcase
          title="Feed"
          note="Capítulos (cerimônia, festa) e o recado dos anfitriões no topo. Reações e comentários abertos."
        >
          <FeedScreen pack={pack} moments={moments} />
        </Showcase>

        <Showcase
          title="Antes do gate"
          note="Gate fechado: as fotos chegam, reações e comentários ainda não. Mensagem honesta, sem botão desabilitado."
        >
          <BeforeGateScreen pack={pack} />
        </Showcase>

        <Showcase
          title="Detalhe — foto de outro"
          note="Estrela, comentário. Foto alheia: sem botão de remover."
        >
          <PhotoDetailScreen pack={pack} />
        </Showcase>

        <Showcase
          title="Detalhe — foto própria"
          note="Foto sua: aparece o botão de remover e o de compartilhar nos Stories."
        >
          <PhotoDetailScreen pack={pack} own />
        </Showcase>

        <Showcase
          title="Comentários"
          note="Thread de comentários de uma foto, com campo de resposta no rodapé."
        >
          <CommentScreen pack={pack} />
        </Showcase>

        <Showcase
          title="Sinalizar"
          note="Denúncia com motivo opcional. A moderação revisa depois — o upload não trava."
        >
          <ReportScreen pack={pack} />
        </Showcase>

        <Showcase
          title="Postar fora da festa"
          note="Consentimento explícito antes de sair do contexto. A moldura inclui nomes e data."
        >
          <ShareConsentScreen pack={pack} />
        </Showcase>

        <Showcase
          title="Álbum"
          note="Por capítulos — cerimônia, festa, amanhecer. Filtros por missão. Nada de scroll infinito."
        >
          <AlbumScreen pack={pack} moments={moments} />
        </Showcase>

        <Showcase
          title="Missões"
          note="A missão do momento em destaque. Lista com estados: feita, agora, aberta."
        >
          <MissionsScreen pack={pack} />
        </Showcase>

        <Showcase
          title="Minhas fotos"
          note="As fotos que você enviou + CTA pra colagem e vídeo automático."
        >
          <MyPhotosScreen pack={pack} />
        </Showcase>

        <Showcase
          title="Música"
          note="A faixa atual + pedidos: cola o link do Spotify. Teto de sugestões por sessão."
        >
          <MusicScreen pack={pack} />
        </Showcase>
      </div>
    </div>
  );
}

function Showcase({ title, note, children }: { title: string; note: string; children: ReactNode }) {
  return (
    <PhoneFrame title={title} note={note}>
      {children}
    </PhoneFrame>
  );
}
