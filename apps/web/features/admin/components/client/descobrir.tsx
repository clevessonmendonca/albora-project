"use client";

import Link from "next/link";
import { AdminCard } from "@/features/admin/components/server/admin-shell";

/**
 * Comunidade e Inspiração — os dois destinos do grupo "Descobrir".
 *
 * O protótipo mostra as duas telas povoadas: feed de anfitriões com dúvidas e
 * respostas, ideias por tema com "salvar". Nada disso tem tabela ainda, e o
 * briefing é explícito: não inventar recurso que o sistema não oferece. Então
 * a composição vem inteira e o conteúdo diz a verdade — o que a tela vai ser,
 * e que ainda não está aberta.
 *
 * Quando o backend existir, o que muda aqui é a lista; a moldura fica.
 */

type Tema = { rotulo: string; descricao: string };

function Chips({ temas }: { temas: readonly Tema[] }) {
  return (
    <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
      {temas.map((t) => (
        <li key={t.rotulo}>
          <span
            className="inline-flex min-h-11 items-center rounded-pilula border border-linha px-4 tipo-label text-ink-3"
            title={t.descricao}
          >
            {t.rotulo}
          </span>
        </li>
      ))}
    </ul>
  );
}

function AindaNaoAbriu({
  titulo,
  explicacao,
  acao,
}: {
  titulo: string;
  explicacao: string;
  acao: { rotulo: string; href: string };
}) {
  return (
    <AdminCard>
      <h2 className="tipo-subtitle m-0 text-ink">{titulo}</h2>
      <p className="tipo-body mt-2 mb-0 max-w-[52ch] text-ink-2">{explicacao}</p>
      <Link
        href={acao.href}
        className="mt-5 inline-flex min-h-12 items-center rounded-pilula border border-linha px-5 tipo-label text-ink-2 no-underline transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:border-acento-texto hover:text-ink"
      >
        {acao.rotulo}
      </Link>
    </AdminCard>
  );
}

const TEMAS_DA_COMUNIDADE: readonly Tema[] = [
  { rotulo: "Dúvidas", descricao: "Perguntas de quem está preparando" },
  { rotulo: "Ideias", descricao: "O que deu certo na festa de alguém" },
  { rotulo: "Experiências", descricao: "Relatos depois do evento" },
  { rotulo: "Indicações", descricao: "Fornecedores e achados" },
];

export function Comunidade({ eventId }: { eventId: string }) {
  return (
    <div className="flex flex-col gap-6">
      <section>
        <h2 className="tipo-label m-0 mb-3 text-ink-3">Entre anfitriões</h2>
        <p className="tipo-body m-0 max-w-[52ch] text-ink-2">
          Um lugar para trocar ideia com quem está organizando uma festa — antes e depois dela.
        </p>
      </section>

      <Chips temas={TEMAS_DA_COMUNIDADE} />

      <AindaNaoAbriu
        titulo="A comunidade ainda não abriu"
        explicacao="Ela vai reunir dúvidas, ideias e relatos de outros anfitriões. Enquanto não abre, o glossário no menu da conta explica cada palavra do painel, e o guia de preparo mostra o que fazer agora."
        acao={{ rotulo: "Ver o preparo do evento", href: `/admin/e/${eventId}/pre-event` }}
      />
    </div>
  );
}

const TEMAS_DA_INSPIRACAO: readonly Tema[] = [
  { rotulo: "Fotos", descricao: "Como as fotos acontecem sem interromper a festa" },
  { rotulo: "Decoração", descricao: "Onde o QR fica visível sem virar cartaz" },
  { rotulo: "Experiência", descricao: "Missões que fazem as pessoas fotografarem" },
];

export function Inspiracao({ eventId }: { eventId: string }) {
  return (
    <div className="flex flex-col gap-6">
      <section>
        <h2 className="tipo-label m-0 mb-3 text-ink-3">Para se inspirar</h2>
        <p className="tipo-body m-0 max-w-[52ch] text-ink-2">
          Pequenas escolhas mudam o jeito como vocês vão lembrar do dia. Aqui ficam as ideias
          que ajudam as fotos a acontecerem sozinhas.
        </p>
      </section>

      <Chips temas={TEMAS_DA_INSPIRACAO} />

      <AindaNaoAbriu
        titulo="As ideias ainda não estão publicadas"
        explicacao="Esta tela vai trazer ideias curtas por tema, para salvar e usar na hora de montar o evento. Por enquanto, as missões são o caminho mais direto: elas pedem a foto que vocês querem ver no álbum."
        acao={{ rotulo: "Criar uma missão", href: `/admin/e/${eventId}/missions` }}
      />
    </div>
  );
}
