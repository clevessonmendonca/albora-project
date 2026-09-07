import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { aceitesDeEntradaPorVersao, aceitesExternosPorVersao } from "./consent-db";
import { comEvento } from "./event";
import { prepararBanco, semear } from "./testes/banco";

let admin: pg.Pool;
let app: pg.Pool;
let dados: Awaited<ReturnType<typeof semear>>;

beforeAll(async () => {
  const pools = await prepararBanco();
  admin = pools.admin;
  app = pools.app;
  dados = await semear(admin);

  // Segunda sessão do evento A numa versão de entrada diferente, para provar
  // que a contagem agrupa por versão em vez de somar tudo.
  await admin.query(
    `INSERT INTO guest_sessions (event_id, display_name, consent_version, consented_at)
     VALUES ($1, 'convidado-v2', 'v2', now())`,
    [dados.a.eventoId],
  );

  // Consentimento externo (saída do perímetro): um aceite ativo e um revogado.
  await admin.query(
    `UPDATE guest_sessions
        SET external_consent_version = 'externo-v1', external_consented_at = now(),
            external_name_on_frame = true
      WHERE id = $1`,
    [dados.a.sessaoId],
  );
  await admin.query(
    `INSERT INTO guest_sessions
       (event_id, display_name, consent_version, consented_at,
        external_consent_version, external_consented_at, external_consent_revoked_at)
     VALUES ($1, 'convidado-revogado', 'v1', now(), 'externo-v1', now(), now())`,
    [dados.a.eventoId],
  );
}, 60_000);

afterAll(async () => {
  await Promise.all([admin?.end(), app?.end()]);
});

describe("o anfitrião audita quem aceitou qual versão de consentimento", () => {
  it("agrupa aceites de entrada por versão, só deste evento", async () => {
    const lista = await comEvento(app, dados.a.eventoId, (c) =>
      aceitesDeEntradaPorVersao(c, dados.a.eventoId),
    );

    const v1 = lista.find((l) => l.versao === "v1");
    const v2 = lista.find((l) => l.versao === "v2");
    expect(v1?.aceites).toBe(2); // a sessão original semeada + a "convidado-revogado"
    expect(v2?.aceites).toBe(1);
    expect(v1?.primeiroEm).toBeInstanceOf(Date);
    expect(v1?.ultimoEm).toBeInstanceOf(Date);
  });

  it("não mistura aceites de outro evento", async () => {
    const lista = await comEvento(app, dados.b.eventoId, (c) =>
      aceitesDeEntradaPorVersao(c, dados.b.eventoId),
    );
    expect(lista).toHaveLength(1);
    expect(lista[0]?.versao).toBe("v1");
    expect(lista[0]?.aceites).toBe(1);
  });

  it("conta aceites externos e distingue revogados, sem contar quem nunca aceitou", async () => {
    const lista = await comEvento(app, dados.a.eventoId, (c) =>
      aceitesExternosPorVersao(c, dados.a.eventoId),
    );

    expect(lista).toHaveLength(1);
    const externo = lista[0]!;
    expect(externo.versao).toBe("externo-v1");
    expect(externo.aceites).toBe(2);
    expect(externo.revogados).toBe(1);
  });

  it("evento sem nenhum consentimento externo retorna lista vazia", async () => {
    const lista = await comEvento(app, dados.b.eventoId, (c) =>
      aceitesExternosPorVersao(c, dados.b.eventoId),
    );
    expect(lista).toEqual([]);
  });
});
