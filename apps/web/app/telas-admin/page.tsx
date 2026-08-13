import "../landing/landing.css";
import { CASAMENTO, problemasDaLanding } from "@albora/packs";
import { MARCA_ALBORA, paraVariaveis, resolverTokens } from "@albora/tokens";
import type { CSSProperties, ReactNode } from "react";
import { Aparelho } from "../telas/pecas-de-tela";
import {
  TelaAdminConvidados,
  TelaAdminModeracao,
  TelaAdminPainel,
  TelaAdminParede,
} from "../telas/telas-admin";

export const metadata = {
  title: "Albora — o anfitrião no app",
  robots: { index: false, follow: false },
};

/**
 * A vitrine do admin mobile-first. Vive fora do `/telas` (onde o anfitrião é
 * desktop) porque é uma superfície nova: o mesmo anfitrião, agora no bolso, pra
 * a cerimonialista operar de pé no salão. `noindex` — peça de trabalho.
 */
export default function TelasAdmin() {
  const pack = CASAMENTO;
  const problemas = problemasDaLanding(pack);
  if (problemas.length > 0) throw new Error(problemas.join("; "));

  const tokens = resolverTokens({ marca: MARCA_ALBORA, pack: { ...pack.tokens, fundo: "claro" } });

  return (
    <div
      className="min-h-screen px-[clamp(1.125rem,4vw,3rem)] pt-[clamp(2rem,5vw,4.5rem)] pb-24"
      style={{
        ...(paraVariaveis(tokens) as CSSProperties),
        backgroundColor: "var(--bg)",
        color: "var(--ink)",
        fontFamily: "var(--fonte-corpo)",
      }}
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
          abrir um notebook. Mesmos primitivos, mesmos tokens do evento.{" "}
          <a href="/telas" className="text-acento-texto">
            Voltar ao catálogo web
          </a>
          .
        </p>
      </header>

      <div className="flex flex-wrap gap-[clamp(1.5rem,3vw,2.75rem)]">
        <Vitrine
          titulo="Ao vivo"
          nota="A primeira dobra é o gate — a decisão que o anfitrião mais volta pra mexer. Números reais, e o toque abre reação e comentário na hora que ele escolher."
        >
          <TelaAdminPainel pack={pack} />
        </Vitrine>

        <Vitrine
          titulo="Ao vivo — com menores"
          nota="Um interruptor por evento, sem perguntar idade de ninguém. Ligado, sobe o piso: gate começa fechado e uma denúncia já segura, em vez de duas."
        >
          <TelaAdminPainel pack={pack} haMenores />
        </Vitrine>

        <Vitrine
          titulo="Moderação"
          nota="A fila do que foi segurado — denúncia ou classificador. Nada sai do ar sozinho: a foto fica em espera até o anfitrião manter ou ocultar."
        >
          <TelaAdminModeracao pack={pack} />
        </Vitrine>

        <Vitrine
          titulo="A parede"
          nota="Marcar quais modelos entram no rodízio. Quem recusa a escolha ruim é problemasDaEscolha, no núcleo — só Cheio deixaria a parede só com deitadas."
        >
          <TelaAdminParede pack={pack} escolhidos={["polaroide", "mural", "dump", "cheio"]} />
        </Vitrine>

        <Vitrine
          titulo="A parede — recusada"
          nota="Só Cheio marcado. Nenhum modelo restante aceita foto em pé, e três de cada quatro fotos de festa são verticais. A tela mostra o veredito, não repete a regra."
        >
          <TelaAdminParede pack={pack} escolhidos={["cheio"]} />
        </Vitrine>

        <Vitrine
          titulo="Convidados"
          nota="Participação sobre expected_guests — o número que decide a H1. Agregado: sem lista nominal, sem enviar mensagem. O convidado não recebe e-mail nem SMS."
        >
          <TelaAdminConvidados pack={pack} />
        </Vitrine>
      </div>
    </div>
  );
}

function Vitrine({ titulo, nota, children }: { titulo: string; nota: string; children: ReactNode }) {
  return (
    <Aparelho titulo={titulo} nota={nota}>
      {children}
    </Aparelho>
  );
}
