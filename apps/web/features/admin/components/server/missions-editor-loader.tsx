import { PACKS, type Pack } from "@albora/packs";
import { Sparkles, ListChecks } from "lucide-react";
import Link from "next/link";
import { MissionsEditor } from "@/features/admin/components/client/missions-editor";
import { getEventChallenges } from "@/features/admin/data/get-event-challenges";
import {
  CabecalhoDeCartao,
  Cartao,
  ColunaDeApoio,
  Estatistica,
  Estatisticas,
  GradeDePaineis,
  botaoDoPainel,
} from "@/features/admin/components/server/kit-do-painel";

export async function MissionsEditorLoader({
  eventId,
  packId,
  identityTokens,
}: {
  eventId: string;
  packId: string;
  identityTokens: Record<string, unknown>;
}) {
  const challenges = await getEventChallenges(eventId);
  const pack = PACKS[packId] as Pack | undefined;

  const titleKeys = challenges
    .filter((d) => d.chaveTitulo !== null)
    .map((d) => d.chaveTitulo!);

  const customMissions = challenges
    .filter((d) => d.tituloCustom !== null)
    .map((d) => ({
      id: d.id,
      titulo: d.tituloCustom!,
      posicao: d.ordem,
      emoji: d.emoji,
      deadline: d.deadline,
    }));

  const ativas = titleKeys.length + customMissions.length;
  const noPack = pack?.missoes.length ?? 0;

  return (
    <>
      <Estatisticas>
        <Estatistica
          icone={<ListChecks size={16} aria-hidden />}
          valor={String(ativas)}
          legenda={ativas === 1 ? "missão ativa no evento" : "missões ativas no evento"}
        />
        <Estatistica
          icone={<Sparkles size={16} aria-hidden />}
          valor={String(noPack)}
          legenda="missões disponíveis no pack"
        />
      </Estatisticas>

      <GradeDePaineis>
        <MissionsEditor
          eventId={eventId}
          packId={packId}
          identityTokens={identityTokens}
          initialTitleKeys={titleKeys}
          initialCustomMissions={customMissions}
        />

        <ColunaDeApoio>
          <Cartao>
            <CabecalhoDeCartao
              titulo="Como funciona"
              subtitulo="Um convite criativo para participar."
            />
            <p className="m-0 mb-4 text-[13px] text-ink-2">
              Ative as missões do pack ou escreva as suas. O convidado vê a missão da vez assim
              que abre a câmera — dá pra trocar quantas vezes quiser.
            </p>
            <a
              href="#nova-missao-personalizada"
              className={botaoDoPainel({ variant: "light", width: "full" })}
            >
              Criar missão personalizada
            </a>
          </Cartao>

          <Cartao>
            <CabecalhoDeCartao
              titulo="Recado do evento"
              subtitulo="A mensagem que abre o álbum."
            />
            <p className="m-0 mb-4 text-[13px] text-ink-2">
              Um recado em texto ou áudio, visto uma vez por cada convidado.
            </p>
            <Link
              href={`/admin/e/${eventId}/guestbook`}
              className={botaoDoPainel({ variant: "light", width: "full" })}
            >
              Abrir recado
            </Link>
          </Cartao>
        </ColunaDeApoio>
      </GradeDePaineis>
    </>
  );
}
