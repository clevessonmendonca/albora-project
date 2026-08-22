import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";
import * as SecureStore from "expo-secure-store";
import { useFocusEffect, useRouter } from "expo-router";
import { Screen, Text } from "@albora/ui-native";
import {
  buscarRecado,
  marcarRecadoLido,
  recortarTexto,
  type AudioRecado,
} from "../src/recado";
import { parseStoredSession, SESSION_STORE_KEY, type GuestSession } from "../src/session";

type Estado =
  | { tipo: "carregando" }
  | { tipo: "semSessao" }
  | { tipo: "erro" }
  | { tipo: "vazio" }
  | { tipo: "pronto"; texto: string; audio: AudioRecado | null; expandido: boolean };

export default function RecadoScreen() {
  const router = useRouter();
  const [session, setSession] = useState<GuestSession | null>(null);
  const [estado, setEstado] = useState<Estado>({ tipo: "carregando" });

  const carregar = useCallback(async (sess: GuestSession) => {
    setEstado({ tipo: "carregando" });
    const r = await buscarRecado(sess);
    if (!r.ok) {
      setEstado(r.falha === "sessao" ? { tipo: "semSessao" } : { tipo: "erro" });
      return;
    }
    if (!r.mostrar || r.texto === null) {
      setEstado({ tipo: "vazio" });
      return;
    }
    setEstado({ tipo: "pronto", texto: r.texto, audio: r.audio, expandido: false });
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

  const dispensar = useCallback(async () => {
    if (session) await marcarRecadoLido(session);
    router.back();
  }, [session, router]);

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
        <Text title className="text-2xl">
          Recado
        </Text>
        <Text tone="muted" className="mt-3">
          Pareie de novo para ver o recado do evento.
        </Text>
        <View className="mt-6">
          <Pressable
            accessibilityRole="button"
            onPress={() => router.replace("/pair")}
            className="items-center rounded-pilula bg-acento px-6 py-3"
          >
            <Text tone="onAccent">Parear</Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  if (estado.tipo === "erro") {
    return (
      <Screen>
        <Text title className="text-2xl">
          Recado
        </Text>
        <Text tone="critical" className="mt-3">
          Não consegui carregar o recado. Tente de novo.
        </Text>
        <View className="mt-6">
          <Pressable
            accessibilityRole="button"
            onPress={() => session && void carregar(session)}
            className="items-center rounded-pilula bg-acento px-6 py-3"
          >
            <Text tone="onAccent">Tentar de novo</Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  if (estado.tipo === "vazio") {
    return (
      <Screen>
        <Text title className="text-2xl">
          Recado
        </Text>
        <Text tone="muted" className="mt-3">
          Nenhum recado por enquanto.
        </Text>
        <View className="mt-6">
          <Pressable
            accessibilityRole="button"
            onPress={() => router.back()}
            className="items-center rounded-pilula bg-acento px-6 py-3"
          >
            <Text tone="onAccent">Voltar</Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  const { texto, audio, expandido } = estado;
  const { visivel, cortado } = recortarTexto(texto);
  const corpo = expandido ? texto : visivel;

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
        <Text title className="text-2xl">
          Recado
        </Text>
        <Text tone="muted" className="mb-4 mt-1 text-xs uppercase tracking-widest">
          dos anfitriões
        </Text>

        <View className="rounded-superficie border border-linha bg-superficie p-4">
          {audio !== null ? (
            <View className="mb-3 flex-row items-center gap-2">
              <View className="size-8 shrink-0 rounded-full bg-acento" />
              <Text tone="muted" className="text-xs">
                Áudio disponível ({Math.round(audio.duracaoSegundos)}s)
              </Text>
            </View>
          ) : null}

          <Text className="text-base leading-relaxed">{corpo}</Text>

          {cortado && !expandido ? (
            <Pressable
              accessibilityRole="button"
              onPress={() =>
                setEstado((e) => (e.tipo === "pronto" ? { ...e, expandido: true } : e))
              }
              className="mt-2"
            >
              <Text tone="accent" className="text-sm">
                ver inteiro
              </Text>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>

      <View className="mt-4 pb-6">
        <Pressable
          accessibilityRole="button"
          onPress={() => void dispensar()}
          className="items-center rounded-pilula bg-acento px-6 py-3"
        >
          <Text tone="onAccent">Entendi, obrigado</Text>
        </Pressable>
      </View>
    </Screen>
  );
}
