export type Pessoa = {
  id: string;
  nome: string;
  fotos: number;
  entrouEm: string;
  primeiraFotoEm: string | null;
  ultimaFotoEm: string | null;
};

export type Descoberta = {
  chave: "top" | "primeira" | "fim";
  rotulo: string;
  pessoa: Pessoa;
};

function maisAntiga(a: string | null, b: string | null): boolean {
  if (a === null) return false;
  if (b === null) return true;
  return a < b;
}

/**
 * As três descobertas do protótipo, derivadas da lista — nenhuma consulta a
 * mais. Só aparecem com dado real: sem foto no evento não há "quem mais
 * registrou", e inventar um destaque vazio é pior que não mostrar nada.
 */
export function descobertasDaFesta(pessoas: Pessoa[]): Descoberta[] {
  const comFoto = pessoas.filter((p) => p.fotos > 0);
  if (comFoto.length === 0) return [];

  const top = comFoto.reduce((a, b) => (b.fotos > a.fotos ? b : a));
  const primeira = comFoto.reduce((a, b) =>
    maisAntiga(b.primeiraFotoEm, a.primeiraFotoEm) ? b : a,
  );
  const fim = comFoto.reduce((a, b) => (maisAntiga(a.ultimaFotoEm, b.ultimaFotoEm) ? b : a));

  const candidatas: Descoberta[] = [
    // Uma foto só não é "quem mais registrou" — é a única que existe.
    ...(top.fotos > 1 ? [{ chave: "top" as const, rotulo: "Quem mais registrou", pessoa: top }] : []),
    { chave: "primeira" as const, rotulo: "Primeira foto da festa", pessoa: primeira },
    { chave: "fim" as const, rotulo: "Ficou até o fim", pessoa: fim },
  ];

  // Uma medalha por pessoa. A mesma cara repetida em dois cards seguidos lê
  // como bug, não como elogio.
  const vistas = new Set<string>();
  return candidatas.filter((d) => {
    if (vistas.has(d.pessoa.id)) return false;
    vistas.add(d.pessoa.id);
    return true;
  });
}

/** Sem acento e sem caixa: quem procura "joao" quer achar "João". */
function normalizar(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("pt-BR");
}

export function ordenarPessoas(pessoas: Pessoa[], busca: string, maisFotos: boolean): Pessoa[] {
  const termo = normalizar(busca.trim());
  const filtradas = termo ? pessoas.filter((p) => normalizar(p.nome).includes(termo)) : pessoas;

  return [...filtradas].sort((a, b) =>
    a.fotos === b.fotos ? a.entrouEm.localeCompare(b.entrouEm) : maisFotos ? b.fotos - a.fotos : a.fotos - b.fotos,
  );
}
