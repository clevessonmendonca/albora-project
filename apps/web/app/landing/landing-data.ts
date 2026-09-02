export const WIDTH = "max-w-[78rem]";
export const SIDE_PADDING = "px-[clamp(1.125rem,4vw,2.75rem)]";
export const SECTION_PADDING = `py-[clamp(2.5rem,6vw,5.5rem)] ${SIDE_PADDING}`;

export const HREF_CRIAR_ALBUM = "/admin/new";
export const HREF_CRIAR_GRATIS = "/admin/new?plano=free";
export const HREF_CRIAR_COMPLETO = "/admin/new?plano=celebration";
export const HREF_FORNECEDOR =
  "mailto:ola@albora.app?subject=Albora%20Fornecedor&body=Quero%20saber%20do%20plano%20Fornecedor.";
export const HREF_DEMO = "/e/festa-demo?via=link";

export type LiveStats = { fotos: number; eventos: number };

export const STEPS = [
  {
    title: "Ele aponta a câmera, e pronto",
    desc: "A placa já está na mesa. Aponta, toca no link e cai direto na tela de fotografar. Nada para baixar, nada para preencher.",
  },
  {
    title: "Escolhe as fotos e manda",
    desc: "No próprio celular ele marca as que já tirou e envia. Leva segundos, e funciona igual para quem tem 15 anos e para quem tem 80.",
  },
  {
    title: "O álbum já está lá",
    desc: "As fotos entram enquanto a festa acontece. No fim ele é seu, em resolução original, sem ninguém precisar mandar nada no dia seguinte.",
  },
] as const;

export const NUMBERS = [
  { n: "4", o: "toques do QR até a primeira foto" },
  { n: "0", o: "downloads até a primeira foto" },
  { n: "48h", o: "de envio aberto depois da festa" },
  { n: "∞", o: "convidados e fotos, em todos os planos" },
] as const;

export const SURFACES = [
  {
    label: "Feed ao vivo",
    caption: "A foto que alguém tirou há um minuto, do outro lado do salão.",
  },
  {
    label: "Missões",
    caption: "Um convite por vez, para quem nunca sabe o que fotografar.",
  },
  {
    label: "Galeria de cada um",
    caption: "Cada convidado vai embora com as próprias fotos no celular.",
  },
  {
    label: "O álbum inteiro",
    caption: "Tudo junto, em resolução original, no dia seguinte de manhã.",
  },
] as const;

export const FACTS = [
  "Convidados e fotos sem limite, em todos os planos",
  "QR na mesa: nenhum download e nenhum cadastro até a primeira foto",
  "Fila offline: a foto sobe sozinha quando o sinal voltar",
  "Localização e dados do aparelho apagados no celular, antes de subir",
  "Feed, stories e reações liberados na hora que você escolher",
  "Telão em quatro modelos, e foto em pé nunca é cortada",
  "Envio aberto por 48 horas depois da festa",
  "Exportação para a sua nuvem no dia 330, e apagamos tudo no 365",
] as const;

export const QUESTIONS = [
  {
    q: "Meus convidados vão baixar um aplicativo?",
    a: "Não para a primeira foto. Escaneiam o QR e já fotografam pelo navegador. O aplicativo é convidado depois do primeiro envio, para quem quiser feed, stories e a própria galeria.",
  },
  {
    q: "Quanto tempo leva para montar?",
    a: "Cerca de três minutos: nome do evento, data e a identidade visual. O QR e as placas saem prontos para impressão no fim.",
  },
  {
    q: "E se a internet do salão for ruim?",
    a: "As fotos entram numa fila dentro do celular e sobem sozinhas quando o sinal voltar. Vale mesmo se a pessoa fechar a tela ou for embora no meio do envio.",
  },
  {
    q: "Quem consegue ver as fotos do meu evento?",
    a: "Só quem escaneia o seu QR. A sessão do convidado vale para um evento e não passa para nenhum outro. Nada disso aparece em busca ou em página pública.",
  },
  {
    q: "E se alguém mandar uma foto inadequada?",
    a: "Por padrão tudo aparece, porque no dia da festa ninguém vai ficar aprovando foto numa fila. O que protege roda sozinho: um filtro checa cada foto antes de ela subir, qualquer convidado pode denunciar, e você tira do ar em um toque.",
  },
  {
    q: "As fotos ficam com vocês?",
    a: "São suas. No plano pago, a exportação para a sua nuvem roda sozinha no dia 330, e no dia 365 apagamos o que estiver conosco.",
  },
] as const;
