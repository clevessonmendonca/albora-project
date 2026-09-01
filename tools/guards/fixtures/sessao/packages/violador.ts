export function ruim(token: string, cpf: string) {
  console.log("upload", token);
  const url = `/e/festa?token=${token}`;
  console.error("contato do convidado", cpf);
  return url;
}
// Nao deve reprovar: id de sessao nao e credencial, e o nome do evento de log nao e o dado. Sao justamente os logs que se quer ter.
export function ok(sessaoId: string, eventoId: string) {
  console.log("sessao.criada", { sessaoId, eventoId });
}
