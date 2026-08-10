/**
 * Rate limit no portão, não na saída.
 *
 * Invariante 4 da task 004: o pedido condenado não deve consumir assinatura,
 * nem cota, nem espaço no bucket. Por isso a checagem vem **antes** do
 * presign, e não depois do upload.
 *
 * ⚠️ **Contrato desta implementação: a janela é por instância, em memória.**
 * Ela segura o convidado que segura o botão, e não segura um ataque
 * distribuído — cada isolate do Worker tem a sua contagem. Antes do primeiro
 * evento real isto precisa de um backend durável (Durable Object ou KV);
 * está registrado na spec da task 004 como pendência, não como pronto.
 */

type Janela = { ate: number; usos: number };

const janelas = new Map<string, Janela>();

export type Limite = { permitido: boolean; restam: number; resetEmSegundos: number };

export function consumir(chave: string, teto: number, janelaSegundos: number, agora: number): Limite {
  const atual = janelas.get(chave);

  if (!atual || agora >= atual.ate) {
    const nova = { ate: agora + janelaSegundos * 1000, usos: 1 };
    janelas.set(chave, nova);
    podar(agora);
    return { permitido: true, restam: teto - 1, resetEmSegundos: janelaSegundos };
  }

  atual.usos += 1;
  const resetEmSegundos = Math.ceil((atual.ate - agora) / 1000);

  return {
    permitido: atual.usos <= teto,
    restam: Math.max(0, teto - atual.usos),
    resetEmSegundos,
  };
}

/**
 * Sem poda, o Map cresce com a cardinalidade de sessões e IPs — que num
 * evento com 200 convidados e a noite inteira não é pequena.
 */
function podar(agora: number): void {
  if (janelas.size < 5_000) return;
  for (const [chave, j] of janelas) {
    if (agora >= j.ate) janelas.delete(chave);
  }
}

export function zerar(): void {
  janelas.clear();
}
