import { ALBORA_BRAND, toVariables, resolveTokens } from "@albora/tokens";
import type { Metadata } from "next";
import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacidade — Albora",
  description:
    "Como a Albora trata fotos, sessão e dados dos convidados e dos anfitriões.",
};

const ATUALIZADO_EM = "22 de agosto de 2026";

/**
 * Página pública exigida pelas lojas (App Store / Play) e pelo convite do app.
 * Texto alinhado ao ADR 0004, retenção D365 e ao consentimento v1 da entrada.
 */
export default function PrivacidadePage() {
  const vars = toVariables(resolveTokens({ marca: ALBORA_BRAND })) as CSSProperties;

  return (
    <main
      style={vars}
      className="min-h-dvh bg-bg px-6 py-12 font-corpo text-ink"
    >
      <article className="mx-auto flex w-full max-w-2xl flex-col gap-8">
        <header className="flex flex-col gap-3">
          <p className="m-0 text-[0.75rem] uppercase tracking-[0.2em] text-ink-3">Albora</p>
          <h1 className="m-0 font-titulo text-3xl [text-wrap:balance]">Privacidade</h1>
          <p className="m-0 text-[0.9rem] text-ink-3">Atualizado em {ATUALIZADO_EM}</p>
        </header>

        <section className="flex flex-col gap-3 leading-relaxed text-ink-2">
          <p className="m-0">
            A Albora é o álbum coletivo da festa. Quem paga é o casal (ou o fornecedor); o
            convidado entra pelo QR, sem criar conta. Esta página resume o que coletamos, por
            quê, e por quanto tempo — em linguagem que cabe na porta do salão.
          </p>
        </section>

        <Secao titulo="Quem controla o quê">
          <p>
            O <strong className="text-ink">casal (anfitrião)</strong> é o controlador dos dados
            do evento: decide o que fica no álbum, no telão e no Drive. A{" "}
            <strong className="text-ink">Albora</strong> opera a plataforma (hospedagem, sessão,
            upload, moderação técnica) sob instrução do anfitrião.
          </p>
        </Secao>

        <Secao titulo="O que o convidado envia">
          <ul className="m-0 list-disc space-y-2 pl-5">
            <li>
              <strong className="text-ink">Primeiro nome</strong> — obrigatório para atribuição no
              feed/telão e para “suas fotos”.
            </li>
            <li>
              <strong className="text-ink">Fotos e vídeos</strong> — visíveis para quem participa
              do mesmo evento, conforme o casal liberar (álbum, feed, telão).
            </li>
            <li>
              <strong className="text-ink">Legenda e lugar</strong> — opcionais; nunca bloqueiam o
              envio.
            </li>
            <li>
              <strong className="text-ink">Reações e comentários</strong> — quando a interação do
              evento estiver aberta.
            </li>
          </ul>
          <p>
            Não pedimos e-mail, telefone nem senha do convidado. Não existe conta Albora de
            convidado: a identidade mora só dentro daquele evento.
          </p>
        </Secao>

        <Secao titulo="Sessão e aparelho">
          <p>
            Depois do consentimento, emitimos um <strong className="text-ink">token opaco</strong>{" "}
            (cookie na web; SecureStore no app). Ele autoriza subir mídia, reagir e remover as
            próprias fotos <em>naquele</em> evento — nada além. O token não vai na URL.
          </p>
          <p>
            A passagem web→app usa um código de 4 dígitos ou um token de uso único (passagem) de
            vida curta. Os dois ligam a mesma sessão; nenhum cria conta nova.
          </p>
        </Secao>

        <Secao titulo="O que removemos na origem">
          <ul className="m-0 list-disc space-y-2 pl-5">
            <li>
              <strong className="text-ink">EXIF/GPS</strong> — reencode antes do armazenamento;
              localização da festa não viaja com o arquivo.
            </li>
            <li>
              Metadado de câmera que não precisa ficar no álbum.
            </li>
          </ul>
        </Secao>

        <Secao titulo="Consentimento">
          <p>
            Na entrada, o convidado marca um consentimento <strong className="text-ink">versionado e
            datado</strong> (hoje: v1). Sem consentimento não há sessão; sem sessão não há upload.
            Compartilhar fora do evento (Stories etc.) pede consentimento externo separado, quando
            aplicável.
          </p>
        </Secao>

        <Secao titulo="Remoção">
          <ul className="m-0 list-disc space-y-2 pl-5">
            <li>
              O convidado remove as próprias fotos em <strong className="text-ink">Minhas</strong>{" "}
              (web e app).
            </li>
            <li>
              O anfitrião pode ocultar mídia e renomear/ocultar sessões no painel.
            </li>
            <li>
              Pedidos de titular sobre foto em que a pessoa <em>aparece</em> (mas não enviou)
              passam pelo anfitrião e, se necessário, pelo suporte:{" "}
              <a className="text-acento-texto underline" href="mailto:ola@albora.app">
                ola@albora.app
              </a>
              .
            </li>
          </ul>
        </Secao>

        <Secao titulo="Retenção">
          <p>
            Depois do evento, o casal pode exportar o acervo (ex.: Google Drive). Em torno do{" "}
            <strong className="text-ink">dia 365</strong>, a Albora apaga a mídia do evento nos
            nossos servidores — a nuvem do casal é a política de retenção de longo prazo. Jobs de
            aviso (D330 / D358) existem para o anfitrião não ser pego de surpresa.
          </p>
        </Secao>

        <Secao titulo="App do convidado">
          <p>
            O app (iOS/Android) usa câmera e galeria só para enviar mídia ao álbum do evento.
            Upload pode continuar em segundo plano enquanto houver itens na fila local. Não há
            compra in-app, anúncios nem push de engajamento no escopo atual.
          </p>
        </Secao>

        <Secao titulo="Anfitrião e fornecedor">
          <p>
            O anfitrião entra por magic link (e-mail). Dados de conta, billing e equipe ficam
            separados do grafo do convidado. Fornecedores veem apenas os eventos aos quais têm
            acesso.
          </p>
        </Secao>

        <Secao titulo="Contato">
          <p>
            Dúvidas sobre privacidade ou pedidos de titular:{" "}
            <a className="text-acento-texto underline" href="mailto:ola@albora.app">
              ola@albora.app
            </a>
            .
          </p>
        </Secao>

        <p className="m-0 text-[0.9rem] text-ink-3">
          <Link href="/" className="underline decoration-ink-3/40 underline-offset-2">
            Voltar à Albora
          </Link>
        </p>
      </article>
    </main>
  );
}

function Secao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 leading-relaxed text-ink-2">
      <h2 className="m-0 font-titulo text-xl text-ink">{titulo}</h2>
      {children}
    </section>
  );
}
