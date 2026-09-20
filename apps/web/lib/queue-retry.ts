import type { Queue } from "@albora/core";
import { shouldGiveUp } from "@albora/core";

export async function reiniciarItemFalho(queue: Queue, id: string): Promise<boolean> {
  const itens = await queue.list();
  const item = itens.find((row) => row.id === id);
  if (!item || !shouldGiveUp(item)) return false;
  await queue.remove(id);
  await queue.enqueue({ ...item, tentativas: 0 });
  return true;
}

export async function reiniciarTodosFalhos(queue: Queue): Promise<number> {
  const itens = await queue.list();
  let count = 0;
  for (const item of itens) {
    if (!shouldGiveUp(item)) continue;
    await queue.remove(item.id);
    await queue.enqueue({ ...item, tentativas: 0 });
    count += 1;
  }
  return count;
}
