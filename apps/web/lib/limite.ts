/**
 * Rate limit no portão, não na saída.
 *
 * Invariante 4 da task 004: o pedido condenado não deve consumir assinatura,
 * nem cota, nem espaço no bucket. Por isso a checagem vem **antes** do
 * presign, e não depois do upload.
 *
 * **Duas camadas, e cada uma faz o que a outra não faz.**
 *
 * A camada grossa é a do Cloudflare, configurada no painel: durável,
 * distribuída, e a única que segura enchente de verdade vinda de fora.
 *
 * Esta é a fina, por instância e em memória. Ela existe porque a do
 * Cloudflare conta **por IP** — e num casamento os 200 convidados estão no
 * mesmo WiFi, atrás de um IP só. Uma regra de borda apertada o bastante para
 * conter um abusador estrangularia a festa inteira como se fosse uma pessoa.
 *
 * Por isso: a regra do Cloudflare fica generosa, dimensionada para o salão
 * inteiro; esta aqui é a que dá justiça **entre convidados**, contando por
 * sessão. Ela não segura ataque distribuído e não precisa — esse é o trabalho
 * da outra.
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
