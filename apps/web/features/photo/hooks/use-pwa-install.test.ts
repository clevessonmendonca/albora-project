import { describe, expect, it } from "vitest";
import {
  CHAVE_CTA_PWA_DISPENSADO,
  COPY_CTA_PWA,
  COPY_DISPENSAR_CTA,
  COPY_IOS_COMPARTILHAR,
  COPY_IOS_TELA_INICIO,
  ctaDispensadoNestaSessao,
  deveMostrarCtaPwa,
  marcarCtaDispensado,
  precisaInstrucaoIos,
  primeiraFotoConfirmada,
  pwaJaInstalado,
  type SinaisDePwaInstalado,
} from "./use-pwa-install";

function sinais(opts: {
  displayMode?: SinaisDePwaInstalado["displayMode"];
  safariStandalone?: boolean;
} = {}): SinaisDePwaInstalado {
  return {
    displayMode: opts.displayMode ?? null,
    safariStandalone: opts.safariStandalone === true,
  };
}

describe("a primeira foto confirmada, não a enfileirada", () => {
  it("espera enquanto a fila tem item", () => {
    expect(primeiraFotoConfirmada(1, 1)).toBe(false);
    expect(primeiraFotoConfirmada(1, 0)).toBe(true);
  });

  it("não é a segunda foto, mesmo com a fila vazia", () => {
    expect(primeiraFotoConfirmada(2, 0)).toBe(false);
    expect(primeiraFotoConfirmada(0, 0)).toBe(false);
  });
});

describe("já instalado nunca vê o CTA", () => {
  it("some no display-mode standalone, fullscreen e minimal-ui", () => {
    expect(pwaJaInstalado(sinais({ displayMode: "standalone" }))).toBe(true);
    expect(pwaJaInstalado(sinais({ displayMode: "fullscreen" }))).toBe(true);
    expect(pwaJaInstalado(sinais({ displayMode: "minimal-ui" }))).toBe(true);
    expect(pwaJaInstalado(sinais())).toBe(false);
  });

  it("o Safari antigo denuncia pelo navigator.standalone", () => {
    expect(pwaJaInstalado(sinais({ safariStandalone: true }))).toBe(true);
  });
});

describe("iOS não tem prompt nativo", () => {
  it("iPhone, iPad e iPadOS disfarçado de Mac pedem a instrução", () => {
    expect(
      precisaInstrucaoIos({
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
        platform: "iPhone",
        maxTouchPoints: 5,
      }),
    ).toBe(true);
    expect(
      precisaInstrucaoIos({
        userAgent: "Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X)",
        platform: "iPad",
        maxTouchPoints: 5,
      }),
    ).toBe(true);
    expect(
      precisaInstrucaoIos({
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
        platform: "MacIntel",
        maxTouchPoints: 5,
      }),
    ).toBe(true);
  });

  it("Android e desktop sem toque não pedem Compartilhar", () => {
    expect(
      precisaInstrucaoIos({
        userAgent: "Mozilla/5.0 (Linux; Android 14) Chrome/120.0.0.0 Mobile",
        platform: "Linux armv8l",
        maxTouchPoints: 5,
      }),
    ).toBe(false);
    expect(
      precisaInstrucaoIos({
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
        platform: "MacIntel",
        maxTouchPoints: 0,
      }),
    ).toBe(false);
  });
});

function memoria() {
  const dados = new Map<string, string>();
  return {
    getItem: (chave: string) => dados.get(chave) ?? null,
    setItem: (chave: string, valor: string) => {
      dados.set(chave, valor);
    },
  };
}

describe("dispensa vale a sessão, não a festa inteira", () => {
  it("grava e lê o recado", () => {
    const storage = memoria();
    expect(ctaDispensadoNestaSessao(storage)).toBe(false);
    marcarCtaDispensado(storage);
    expect(ctaDispensadoNestaSessao(storage)).toBe(true);
    expect(storage.getItem(CHAVE_CTA_PWA_DISPENSADO)).toBe("1");
  });

  it("storage que atira não derruba o convidado", () => {
    const quebrado = {
      getItem: () => {
        throw new Error("private");
      },
      setItem: () => {
        throw new Error("private");
      },
    };
    expect(ctaDispensadoNestaSessao(quebrado)).toBe(false);
    expect(() => marcarCtaDispensado(quebrado)).not.toThrow();
  });
});

describe("quando o CTA aparece", () => {
  const base = {
    enviadas: 1,
    pendentes: 0,
    jaInstalado: false,
    dispensado: false,
    promptNativo: false,
    precisaInstrucaoIos: false,
  };

  it("Android com prompt, depois do confirm", () => {
    expect(deveMostrarCtaPwa({ ...base, promptNativo: true })).toBe(true);
  });

  it("iOS com a instrução, depois do confirm", () => {
    expect(deveMostrarCtaPwa({ ...base, precisaInstrucaoIos: true })).toBe(true);
  });

  it("some se a foto ainda está na fila", () => {
    expect(deveMostrarCtaPwa({ ...base, pendentes: 1, precisaInstrucaoIos: true })).toBe(false);
  });

  it("some se já está instalado ou se dispensou nesta sessão", () => {
    expect(deveMostrarCtaPwa({ ...base, jaInstalado: true, precisaInstrucaoIos: true })).toBe(false);
    expect(deveMostrarCtaPwa({ ...base, dispensado: true, promptNativo: true })).toBe(false);
  });

  it("sem caminho de instalar, não inventa CTA", () => {
    expect(deveMostrarCtaPwa(base)).toBe(false);
  });
});

describe("a promessa é receber as fotos", () => {
  it("nunca fala de stories", () => {
    const textos = [COPY_CTA_PWA, COPY_IOS_COMPARTILHAR, COPY_IOS_TELA_INICIO, COPY_DISPENSAR_CTA];
    for (const texto of textos) {
      expect(texto.toLowerCase()).not.toMatch(/stor/i);
    }
    expect(COPY_CTA_PWA).toBe("Instale e receba suas fotos depois da festa");
    expect(COPY_IOS_COMPARTILHAR).toMatch(/Compartilhar/);
    expect(COPY_IOS_TELA_INICIO).toBe("Adicionar à Tela de Início");
  });
});
