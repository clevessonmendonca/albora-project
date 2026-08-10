import "fake-indexeddb/auto";
import type { ItemFila } from "@albora/core";
import { deveDesistir, esperaAntesDeRetentar, MAX_TENTATIVAS } from "@albora/core";
import { beforeEach, describe, expect, it } from "vitest";
import { filaWeb, limparFila, resumoDaFila } from "./fila";

/**
 * Contra IndexedDB de verdade, não contra um dublê escrito à mão.
 *
 * A fila é o que decide se a foto do convidado sobrevive ao sinal cair, e
 * testá-la contra um mock provaria que o mock funciona. `fake-indexeddb` é a
 * implementação real da especificação rodando em memória — a mesma classe de
 * escolha da suíte de isolamento contra Postgres.
 */

const item = (id: string, criadoEm: number, bytes = 800_000): ItemFila => ({
  id,
  eventoId: "11111111-1111-1111-1111-111111111111",
  corpo: { tipo: "arquivo", caminho: `/tmp/${id}`, bytes },
  mime: "image/jpeg",
  criadoEm,
  tentativas: 0,
});

beforeEach(limparFila);

describe("enfileirar, listar, remover", () => {
  it("guarda e devolve o item inteiro", async () => {
    await filaWeb.enfileirar(item("a", 1000));
    const [guardado] = await filaWeb.listar();

    expect(guardado?.id).toBe("a");
    expect(guardado?.corpo).toEqual({ tipo: "arquivo", caminho: "/tmp/a", bytes: 800_000 });
  });

  it("a foto mais antiga sobe primeiro", async () => {
    await filaWeb.enfileirar(item("c", 3000));
    await filaWeb.enfileirar(item("a", 1000));
    await filaWeb.enfileirar(item("b", 2000));

    // Sem ordem, o convidado que tira dez fotos vê a primeira ficar para trás.
    expect((await filaWeb.listar()).map((i) => i.id)).toEqual(["a", "b", "c"]);
  });

  it("remover tira só o item pedido", async () => {
    await filaWeb.enfileirar(item("a", 1000));
    await filaWeb.enfileirar(item("b", 2000));
    await filaWeb.remover("a");

    expect((await filaWeb.listar()).map((i) => i.id)).toEqual(["b"]);
  });

  it("remover id inexistente não estoura", async () => {
    await expect(filaWeb.remover("nao-existe")).resolves.toBeUndefined();
  });

  it("recusa item sem id e sem eventoId", async () => {
    await expect(filaWeb.enfileirar({ ...item("", 1) })).rejects.toThrow(/id/);
    await expect(filaWeb.enfileirar({ ...item("x", 1), eventoId: "" })).rejects.toThrow(/eventoId/);
  });
});

describe("reenfileirar é o caminho normal", () => {
  it("o mesmo id sobrescreve em vez de estourar", async () => {
    await filaWeb.enfileirar(item("a", 1000));
    // `add` daria ConstraintError aqui; o convidado perderia a foto por causa
    // de um retry.
    await filaWeb.enfileirar({ ...item("a", 1000), tentativas: 2 });

    const itens = await filaWeb.listar();
    expect(itens).toHaveLength(1);
    expect(itens[0]?.tentativas).toBe(2);
  });
});

describe("contagem de tentativas", () => {
  it("incrementa e persiste", async () => {
    await filaWeb.enfileirar(item("a", 1000));
    await filaWeb.marcarTentativa("a");
    await filaWeb.marcarTentativa("a");

    expect((await filaWeb.listar())[0]?.tentativas).toBe(2);
  });

  it("marcar item inexistente não cria linha", async () => {
    await filaWeb.marcarTentativa("fantasma");

    expect(await filaWeb.listar()).toHaveLength(0);
  });

  it("alcança o teto e o item vira falha visível", async () => {
    await filaWeb.enfileirar(item("a", 1000));
    for (let i = 0; i < MAX_TENTATIVAS; i += 1) await filaWeb.marcarTentativa("a");

    const [guardado] = await filaWeb.listar();
    expect(deveDesistir(guardado!)).toBe(true);
  });

  it("o backoff cresce e tem teto", async () => {
    // Sem teto, a sexta tentativa esperaria mais que a festa inteira dura.
    expect(esperaAntesDeRetentar(0)).toBe(1);
    expect(esperaAntesDeRetentar(3)).toBe(8);
    expect(esperaAntesDeRetentar(10)).toBe(60);
  });
});

describe("resumo para a tela", () => {
  it("conta itens e bytes pendentes", async () => {
    await filaWeb.enfileirar(item("a", 1000, 800_000));
    await filaWeb.enfileirar(item("b", 2000, 200_000));

    // É o que responde "as suas oito estão aqui" — sem isso o convidado para
    // de mandar por dúvida, não por desinteresse.
    expect(await resumoDaFila()).toEqual({ itens: 2, bytes: 1_000_000 });
  });

  it("fila vazia é zero, não erro", async () => {
    expect(await resumoDaFila()).toEqual({ itens: 0, bytes: 0 });
  });
});
