import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import * as SecureStore from "expo-secure-store";
import { useFocusEffect, useRouter } from "expo-router";
import { Button, Screen, Text } from "@albora/ui-native";
import {
  fetchMusica,
  sugerirMusica,
  type FaixaDoCasal,
  type ModoInteracao,
  type Sugestao,
} from "../src/music";
import { parseStoredSession, SESSION_STORE_KEY, type GuestSession } from "../src/session";

type Estado =
  | { tipo: "carregando" }
  | { tipo: "semSessao" }
  | { tipo: "erro"; mensagem: string }
  | { tipo: "pronto"; faixa: FaixaDoCasal | null; sugestoes: Sugestao[]; interacao: ModoInteracao };

const PROVEDOR_ROTULO: Record<string, string> = {
  spotify: "Spotify",
  "youtube-music": "YouTube Music",
  youtube: "YouTube",
  "apple-music": "Apple Music",
  deezer: "Deezer",
};

function rotuloProvedor(provedor: string): string {
  return PROVEDOR_ROTULO[provedor] ?? provedor;
}

function rotuloSugestao(s: Sugestao): string {
  const titulo = s.titulo?.trim() ?? "";
  if (titulo === "") return `${rotuloProvedor(s.provedor)}`;
  const artista = s.artista?.trim() ?? "";
  return artista === "" ? titulo : `${titulo} — ${artista}`;
}

export default function MusicScreen() {
  const router = useRouter();
  const [session, setSession] = useState<GuestSession | null>(null);
  const [estado, setEstado] = useState<Estado>({ tipo: "carregando" });
  const [urlInput, setUrlInput] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erroSugestao, setErroSugestao] = useState<string | null>(null);
  const [confirmacao, setConfirmacao] = useState<string | null>(null);

  const carregar = useCallback(async (sess: GuestSession) => {
    setEstado({ tipo: "carregando" });
    try {
      const data = await fetchMusica(sess);
      setEstado({
        tipo: "pronto",
        faixa: data.faixa,
        sugestoes: data.sugestoes,
        interacao: data.interacao,
      });
    } catch {
      setEstado({ tipo: "erro", mensagem: "Não consegui carregar a música. Tente de novo." });
    }
  }, []);

  useEffect(() => {
    void (async () => {
      const raw = await SecureStore.getItemAsync(SESSION_STORE_KEY);
      const sess = parseStoredSession(raw);
      setSession(sess);
      if (!sess) {
        setEstado({ tipo: "semSessao" });
        return;
      }
      await carregar(sess);
    })();
  }, [carregar]);

  useFocusEffect(
    useCallback(() => {
      if (session) void carregar(session);
    }, [session, carregar]),
  );

  async function handleSugerir() {
    if (!session || estado.tipo !== "pronto") return;
    const url = urlInput.trim();
    if (url === "") {
      setErroSugestao("Cole o link da faixa.");
      return;
    }
    setEnviando(true);
    setErroSugestao(null);
    setConfirmacao(null);

    const resultado = await sugerirMusica(session, url);

    if (resultado.ok) {
      setEstado((s) =>
        s.tipo === "pronto" ? { ...s, sugestoes: resultado.sugestoes } : s,
      );
      setUrlInput("");
      setConfirmacao("Sugestão enviada!");
    } else if (resultado.erro.tipo === "sessao") {
      setEstado({ tipo: "semSessao" });
    } else if (resultado.erro.tipo === "rede") {
      setErroSugestao("Sem conexão. Tente de novo.");
    } else {
      setErroSugestao(resultado.erro.mensagem);
    }
    setEnviando(false);
  }

  if (estado.tipo === "carregando") {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
      </Screen>
    );
  }

  if (estado.tipo === "semSessao") {
    return (
      <Screen>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Voltar"
          onPress={() => router.back()}
          className="mb-4"
        >
          <Text tone="accent">← Voltar</Text>
        </Pressable>
        <Text title className="text-2xl">
          Música do casal
        </Text>
        <Text tone="muted" className="mt-3">
          Pareie de novo para ver a música escolhida pelo casal e sugerir faixas.
        </Text>
        <View className="mt-6">
          <Button onPress={() => router.replace("/pair")}>Parear</Button>
        </View>
      </Screen>
    );
  }

  if (estado.tipo === "erro") {
    return (
      <Screen>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Voltar"
          onPress={() => router.back()}
          className="mb-4"
        >
          <Text tone="accent">← Voltar</Text>
        </Pressable>
        <Text title className="text-2xl">
          Música do casal
        </Text>
        <Text tone="critical" className="mt-3">
          {estado.mensagem}
        </Text>
        <View className="mt-6">
          <Button
            onPress={() => session && void carregar(session)}
          >
            Tentar de novo
          </Button>
        </View>
      </Screen>
    );
  }

  const { faixa, sugestoes, interacao } = estado;
  const podeInteragir = interacao === "completo";

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Voltar"
          onPress={() => router.back()}
          className="mb-4"
        >
          <Text tone="accent">← Voltar</Text>
        </Pressable>

        <Text title className="text-2xl">
          Música do casal
        </Text>

        {/* Faixa escolhida pelo casal */}
        <View className="mt-4 rounded-superficie border border-linha bg-superficie p-4">
          {faixa ? (
            <View className="gap-3">
              {faixa.capaUrl ? (
                <Image
                  source={{ uri: faixa.capaUrl }}
                  className="h-24 w-24 rounded-superficie"
                  accessibilityLabel="Capa do álbum"
                />
              ) : null}
              <View className="flex-1">
                <Text tone="muted" className="text-xs uppercase tracking-widest">
                  {rotuloProvedor(faixa.provedor)}
                </Text>
                <Text className="mt-1 text-base leading-snug">{faixa.rotulo}</Text>
              </View>
              <Pressable
                accessibilityRole="link"
                accessibilityLabel={`Abrir no ${rotuloProvedor(faixa.provedor)}`}
                onPress={() => void Linking.openURL(faixa.url)}
                className="mt-1 self-start rounded-pilula border border-linha px-4 py-2"
              >
                <Text tone="accent" className="text-sm">
                  Abrir no {rotuloProvedor(faixa.provedor)} →
                </Text>
              </Pressable>
            </View>
          ) : (
            <Text tone="muted">O casal ainda não escolheu a música.</Text>
          )}
        </View>

        {/* Formulário de sugestão */}
        <View className="mt-6">
          <Text className="text-base font-medium">Sugerir uma faixa</Text>

          {!podeInteragir ? (
            <Text tone="muted" className="mt-2 text-sm">
              A interação abre após a cerimônia.
            </Text>
          ) : (
            <View className="mt-3 gap-3">
              <TextInput
                value={urlInput}
                onChangeText={(v) => {
                  setUrlInput(v);
                  setErroSugestao(null);
                  setConfirmacao(null);
                }}
                placeholder="Cole o link do Spotify, YouTube Music, Deezer ou Apple Music"
                placeholderTextColor="var(--color-ink-2)"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                className="rounded-superficie border border-linha bg-superficie px-4 py-3 text-ink"
                accessibilityLabel="Link da faixa"
              />

              {erroSugestao ? (
                <Text tone="critical" className="text-sm">
                  {erroSugestao}
                </Text>
              ) : null}

              {confirmacao ? (
                <Text tone="accent" className="text-sm">
                  {confirmacao}
                </Text>
              ) : null}

              <Button onPress={() => void handleSugerir()} disabled={enviando}>
                {enviando ? "Enviando…" : "Sugerir"}
              </Button>
            </View>
          )}
        </View>

        {/* Fila de sugestões */}
        {sugestoes.length > 0 ? (
          <View className="mt-6">
            <Text className="text-base font-medium">
              Fila de sugestões ({sugestoes.length})
            </Text>
            <View className="mt-3 gap-2">
              {sugestoes.map((s) => (
                <Pressable
                  key={s.id}
                  accessibilityRole="link"
                  accessibilityLabel={`Abrir ${rotuloSugestao(s)} no ${rotuloProvedor(s.provedor)}`}
                  onPress={() => void Linking.openURL(s.url)}
                  className="flex-row items-center gap-3 rounded-superficie border border-linha bg-superficie px-4 py-3"
                >
                  <View className="flex-1">
                    <Text className="text-sm leading-snug">{rotuloSugestao(s)}</Text>
                    <Text tone="muted" className="text-xs">
                      {rotuloProvedor(s.provedor)}
                    </Text>
                  </View>
                  <View className="items-end">
                    <Text tone="muted" className="text-xs">
                      {s.votos} {s.votos === 1 ? "voto" : "votos"}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        <View className="h-8" />
      </ScrollView>
    </Screen>
  );
}
