import "../landing/landing.css";
import { WEDDING, landingProblems } from "@albora/packs";
import { ALBORA_BRAND, resolveTokens, toVariables } from "@albora/tokens";
import type { CSSProperties, ReactNode } from "react";
import { PhoneFrame } from "../telas/catalog-frames";
import {
  AdminGuestsScreen,
  AdminCreateEventScreen,
  AdminIdentityScreen,
  AdminBookScreen,
  AdminLoginScreen,
  AdminModerationScreen,
  AdminPanelScreen,
  AdminWallScreen,
  AdminRetentionScreen,
  AdminAlbumScreen,
  AdminMissionsScreen,
  AdminGuestbookScreen,
  AdminPiecesScreen,
} from "../telas/admin-screens";

export const metadata = {
  title: "Albora — o anfitrião no app",
  robots: { index: false, follow: false },
};

/** Vitrine mobile-first do admin — `noindex`, peça de trabalho. */
export default function AdminCatalogPage() {
  const pack = WEDDING;
  const problemas = landingProblems(pack);
  if (problemas.length > 0) throw new Error(problemas.join("; "));

  const tokens = resolveTokens({ marca: ALBORA_BRAND, pack: { ...pack.tokens, background: "light" } });

  return (
    <div
      className="min-h-screen bg-bg px-[clamp(1.125rem,4vw,3rem)] pt-[clamp(2rem,5vw,4.5rem)] pb-24 font-corpo text-ink leading-relaxed"
      style={toVariables(tokens) as CSSProperties}
    >
      <header className="mb-[clamp(2rem,4vw,3.5rem)] max-w-3xl">
        <p className="mb-4 text-[0.8125rem] uppercase tracking-rotulo text-acento-texto">
          Anfitrião · no app · mobile-first
        </p>
        <h1 className="font-titulo text-[clamp(2rem,5vw,3.5rem)] font-light leading-tight tracking-titulo">
          O painel do anfitrião cabe no bolso.
        </h1>
        <p className="mt-6 max-w-[52ch] text-ink-2">
          Quem opera a festa — o casal ou a cerimonialista — está de pé, no salão, com o celular.
          Então o admin também nasce app: controlar o gate, segurar uma foto e ver a participação sem
          abrir um notebook. Mesmos primitivos, mesmos tokens do evento.
        </p>
      </header>

      <div className="flex flex-wrap gap-[clamp(1.5rem,3vw,2.75rem)]">
        <Showcase
          title="Ao vivo"
          note="A primeira dobra é o gate — a decisão que o anfitrião mais volta pra mexer. Números reais, e o toque abre reação e comentário na hora que ele escolher."
        >
          <AdminPanelScreen pack={pack} />
        </Showcase>

        <Showcase
          title="Ao vivo — com menores"
          note="Um interruptor por evento, sem perguntar idade de ninguém. Ligado, sobe o piso: gate começa fechado e uma denúncia já segura, em vez de duas."
        >
          <AdminPanelScreen pack={pack} hasMinors />
        </Showcase>

        <Showcase
          title="Moderação"
          note="A fila do que foi segurado — denúncia ou classificador. Nada sai do ar sozinho: a foto fica em espera até o anfitrião manter ou ocultar."
        >
          <AdminModerationScreen pack={pack} />
        </Showcase>

        <Showcase
          title="A parede"
          note="Marcar quais modelos entram no rodízio. Quem recusa a escolha ruim é wallDisplayChoiceProblems, no núcleo — só Cheio deixaria a parede só com deitadas."
        >
          <AdminWallScreen pack={pack} selected={["polaroide", "mural", "dump", "cheio"]} />
        </Showcase>

        <Showcase
          title="A parede — recusada"
          note="Só Cheio marcado. Nenhum modelo restante aceita foto em pé, e três de cada quatro fotos de festa são verticais. A tela mostra o veredito, não repete a regra."
        >
          <AdminWallScreen pack={pack} selected={["cheio"]} />
        </Showcase>

        <Showcase
          title="Convidados"
          note="Participação sobre expected_guests — o número que decide a H1. Agregado: sem lista nominal, sem enviar mensagem. O convidado não recebe e-mail nem SMS."
        >
          <AdminGuestsScreen pack={pack} />
        </Showcase>

        <Showcase
          title="O álbum"
          note="Baixar tudo pede confirmação no e-mail — a sessão aberta não basta. Curadoria leve: ocultar tira do feed, do álbum e do telão."
        >
          <AdminAlbumScreen pack={pack} />
        </Showcase>

        <Showcase
          title="Missões"
          note="Liga e ordena as missões do pack. Sem texto livre — o vocabulário continua no pack."
        >
          <AdminMissionsScreen pack={pack} />
        </Showcase>

        <Showcase
          title="Recado"
          note="Texto e áudio opcional, com consentimento da voz. Gravar ou anexar; cada convidado vê uma vez."
        >
          <AdminGuestbookScreen pack={pack} />
        </Showcase>

        <Showcase
          title="Peças"
          note="ZIP com placa, card de mesa e card de missão. A placa lista as missões do pack."
        >
          <AdminPiecesScreen pack={pack} />
        </Showcase>

        <Showcase
          title="Identidade"
          note="A cor, a fonte e o fuso do salão, com prévia ao vivo pelo resolveTokens real — o que se vê aqui é o que sai no telão e no PDF da placa."
        >
          <AdminIdentityScreen pack={pack} />
        </Showcase>

        <Showcase
          title="O livro"
          note="Curadoria por slots, nunca posição livre — não é editor de canvas. O slot cuida do enquadramento e nada corta na vertical; o vazio é desenhado como vazio."
        >
          <AdminBookScreen pack={pack} />
        </Showcase>

        <Showcase
          title="Retenção & conta"
          note="Export pro drive do casal no dia 330, delete no 365 — por job, não por promessa. Excluir exclui de verdade e rápido, sem dark pattern de retenção."
        >
          <AdminRetentionScreen pack={pack} />
        </Showcase>

        <Showcase
          title="Login"
          note="O anfitrião tem login (o convidado nunca). Magic link, sem senha. Única tela do admin sem barra — antes de entrar não há pra onde navegar."
        >
          <AdminLoginScreen pack={pack} />
        </Showcase>

        <Showcase
          title="Criar evento"
          note="O onboarding: uma coisa por passo (nome e fuso → identidade → missões → parede → peça com QR). Nenhuma pergunta de idade — os menores são um interruptor depois, não um cadastro."
        >
          <AdminCreateEventScreen pack={pack} />
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
