import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";
import * as SecureStore from "expo-secure-store";
import { useRouter } from "expo-router";
import { PACKS, resolvePackText } from "@albora/packs";
import { Screen, Text } from "@albora/ui-native";
import { fetchGuestEventTheme } from "../src/event-theme";
import { parseStoredSession, SESSION_STORE_KEY, type GuestSession } from "../src/session";

type PromptItem = { id: string; chaveTitulo: string; titulo: string };

export default function ConfessionalScreen() {
  const router = useRouter();
  const [session, setSession] = useState<GuestSession | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [titulo, setTitulo] = useState("Confessionário");
  const [lede, setLede] = useState("Escolha uma pergunta e grave um vídeo curto.");
  const [prompts, setPrompts] = useState<PromptItem[]>([]);
  const [erro, setErro] = useState(false);

  const carregar = useCallback(async (sess: GuestSession) => {
    setCarregando(true);
    setErro(false);
    const theme = await fetchGuestEventTheme(sess);
    if (!theme) {
      setErro(true);
      setCarregando(false);
      return;
    }
    const pack = PACKS[theme.packId];
    if (!pack?.confessionario?.length) {
      setPrompts([]);
      setCarregando(false);
      return;
    }
    setTitulo(resolvePackText(pack, "confessionario.titulo"));
    setLede(resolvePackText(pack, "confessionario.lede"));
    setPrompts(
      pack.confessionario.map((p) => ({
        id: p.id,
        chaveTitulo: p.chaveTitulo,
        titulo: resolvePackText(pack, p.chaveTitulo),
      })),
    );
    setCarregando(false);
  }, []);

  useEffect(() => {
    void (async () => {
      const raw = await SecureStore.getItemAsync(SESSION_STORE_KEY);
      const sess = parseStoredSession(raw);
      setSession(sess);
      if (!sess) {
        setCarregando(false);
        return;
      }
      await carregar(sess);
    })();
  }, [carregar]);

  if (carregando) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
      </Screen>
    );
  }

  if (!session) {
    return (
      <Screen>
        <Text title className="text-2xl">
          Confessionário
        </Text>
        <Text tone="muted" className="mt-3">
          Pareie de novo para gravar.
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace("/pair")}
          className="mt-6 items-center rounded-pilula bg-acento px-6 py-3"
        >
          <Text tone="onAccent">Parear</Text>
        </Pressable>
      </Screen>
    );
  }

  if (erro) {
    return (
      <Screen>
        <Text title className="text-2xl">
          Confessionário
        </Text>
        <Text tone="critical" className="mt-3">
          Não deu para carregar as perguntas.
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => void carregar(session)}
          className="mt-6 items-center rounded-pilula bg-acento px-6 py-3"
        >
          <Text tone="onAccent">Tentar de novo</Text>
        </Pressable>
      </Screen>
    );
  }

  if (prompts.length === 0) {
    return (
      <Screen>
        <Text title className="text-2xl">
          {titulo}
        </Text>
        <Text tone="muted" className="mt-3">
          Nenhuma pergunta neste evento.
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace("/(tabs)/missions")}
          className="mt-6 items-center rounded-pilula bg-acento px-6 py-3"
        >
          <Text tone="onAccent">Voltar às Missões</Text>
        </Pressable>
      </Screen>
    );
  }

  return (
    <Screen>
      <Text title className="text-2xl">
        {titulo}
      </Text>
      <Text tone="muted" className="mt-2">
        {lede}
      </Text>
      <ScrollView className="mt-6" showsVerticalScrollIndicator={false}>
        <View className="gap-3">
          {prompts.map((p) => (
            <Pressable
              key={p.id}
              accessibilityRole="button"
              accessibilityLabel={`Gravar: ${p.titulo}`}
              onPress={() =>
                router.push({
                  pathname: "/photo",
                  params: { prompt: p.chaveTitulo, video: "1" },
                })
              }
              className="rounded-superficie border border-linha bg-superficie px-5 py-4"
            >
              <Text className="text-base leading-snug">{p.titulo}</Text>
              <Text tone="muted" className="mt-2 text-xs uppercase tracking-widest">
                Gravar vídeo →
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}
