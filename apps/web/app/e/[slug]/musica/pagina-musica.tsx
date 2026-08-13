"use client";

import { useEffect, useState } from "react";
import { Moldura } from "../../../landing/pecas";
import { BarraDeAbas } from "../barra-de-abas";
import {
  CabecalhoConvidado,
  ChaoConvidado,
  MioloConvidado,
  RecadoErro,
  TextoSecundario,
} from "../../../telas/shell-convidado";
import { Pilula } from "../../../telas/pecas-de-tela";

type Musica = {
  provedor: string;
  rotulo: string;
  url: string;
  capaUrl?: string | null;
} | null;

export function PaginaMusica({ slug }: { slug: string }) {
  const [musica, setMusica] = useState<Musica>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const r = await fetch("/api/musica", { credentials: "same-origin" });
        if (!r.ok) throw new Error("falhou");
        const corpo = (await r.json()) as { musica: Musica };
        setMusica(corpo.musica);
      } catch {
        setErro(true);
      } finally {
        setCarregando(false);
      }
    })();
  }, []);

  return (
    <>
      <ChaoConvidado>
        <style>{ESTILO_PLAYER}</style>
        <MioloConvidado comAbas>
          <CabecalhoConvidado
            titulo="Música da festa"
            hrefInicio={`/e/${encodeURIComponent(slug)}/capa`}
            acao={carregando ? <Pilula>Carregando…</Pilula> : undefined}
          />

          {carregando && <TextoSecundario>Carregando…</TextoSecundario>}

          {!carregando && musica && (
            <section className="mus-player">
              <div className="mus-arte">
                {musica.capaUrl ? (
                  <img src={musica.capaUrl} alt="" className="mus-capa" />
                ) : (
                  <Moldura rotulo="" raio="var(--raio-superficie)" atmosfera variante={3} />
                )}
              </div>

              <p className="mus-rotulo">{musica.rotulo}</p>
              <p className="mus-sub">Escolha do casal</p>

              <OndaAnimada />

              <div className="mus-controles">
                <a href={musica.url} className="mus-play" aria-label="Abrir no app de música">
                  ▶
                </a>
                <span className="mus-tempo">—:——</span>
              </div>

              <a href={musica.url} className="mus-link">
                Abrir no {musica.provedor}
              </a>
            </section>
          )}

          {!carregando && !musica && (
            <TextoSecundario>
              Os anfitriões ainda não escolheram a trilha. Quando escolherem, ela aparece aqui.
            </TextoSecundario>
          )}

          {erro && <RecadoErro>Não deu para carregar agora.</RecadoErro>}
        </MioloConvidado>
      </ChaoConvidado>
      <BarraDeAbas slug={slug} />
    </>
  );
}

function OndaAnimada() {
  return (
    <div className="mus-onda" aria-hidden>
      {Array.from({ length: 24 }, (_, i) => (
        <span key={i} className="mus-barra" style={{ animationDelay: `${i * 0.07}s` }} />
      ))}
    </div>
  );
}

const ESTILO_PLAYER = `
.mus-player {
  display: grid;
  gap: 1rem;
  padding-top: 0.5rem;
}
.mus-arte {
  position: relative;
  aspect-ratio: 1;
  max-width: 16rem;
  margin: 0 auto;
  border-radius: var(--raio-superficie);
  overflow: hidden;
}
.mus-capa {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  filter: saturate(0.92);
}
.mus-rotulo {
  margin: 0;
  font-family: var(--fonte-titulo);
  font-size: 1.25rem;
  line-height: 1.3;
  text-align: center;
  text-wrap: balance;
}
.mus-sub {
  margin: 0;
  font-size: 0.75rem;
  letter-spacing: var(--tracking-rotulo);
  text-transform: uppercase;
  text-align: center;
  color: var(--ink-3);
}
.mus-onda {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 3px;
  height: 2.5rem;
  margin: 0.5rem 0;
}
.mus-barra {
  width: 3px;
  height: 40%;
  border-radius: var(--raio-pilula);
  background: var(--acento);
  animation: mus-pulsar 1.4s var(--curva) infinite alternate;
}
@keyframes mus-pulsar {
  from { transform: scaleY(0.35); opacity: 0.55; }
  to   { transform: scaleY(1); opacity: 1; }
}
@media (prefers-reduced-motion: reduce) {
  .mus-barra { animation: none; }
}
.mus-controles {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
}
.mus-play {
  display: grid;
  place-items: center;
  width: 3.25rem;
  height: 3.25rem;
  border-radius: 50%;
  background: var(--acento);
  color: var(--sobre-acento);
  text-decoration: none;
  font-size: 1rem;
}
.mus-tempo {
  font-size: 0.85rem;
  color: var(--ink-3);
  font-variant-numeric: tabular-nums;
}
.mus-link {
  display: block;
  text-align: center;
  color: var(--acento);
  font-size: 0.9rem;
  text-decoration: none;
}
`;
