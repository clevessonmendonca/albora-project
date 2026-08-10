export function ruim(token: string, cpf: string) {
  console.log("sessao", token);
  const url = `/e/festa?token=${token}`;
  console.error("cpf do convidado", cpf);
  return url;
}
