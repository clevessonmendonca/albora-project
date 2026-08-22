import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";
import * as SecureStore from "expo-secure-store";
import { useFocusEffect, useRouter } from "expo-router";
import { Screen, Text } from "@albora/ui-native";
import { fetchMissoes, type MissaoItem } from "../../src/missions";
import { parseStoredSession, SESSION_STORE_KEY, type GuestSession } from "../../src/session";

type Estado =
  | { tipo: "carregando" }
  | { tipo: "semSessao" }
  | { tipo: "erro"; mensagem: string }
  | { tipo: "pronto"; missoes: MissaoItem[] };

export default function MissionsScreen() {
  const router = useRouter();
  const [session, setSession] = useState<GuestSession | null>(null);
  const [estado, setEstado] = useState<Estado>({ tipo: "carregando" });

  const carregar = useCallback(async (sess: GuestSession) => {
    setEstado({ tipo: "carregando" });
    try {
      const { missoes } = await fetchMissoes(sess);
      setEstado({ tipo: "pronto", missoes });
    } catch {
      setEstado({ tipo: "erro", mensagem: "Não consegui carregar as missões. Tente de novo." });
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
          Missões
        </Text>
        <Text tone="muted" className="mt-3">
          Pareie de novo para ver as missões do evento.
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
          Missões
        </Text>
        <Text tone="critical" className="mt-3">
          {estado.mensagem}
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

  const { missoes } = estado;

  if (missoes.length === 0) {
    return (
      <Screen>
        <Text title className="text-2xl">
          Missões
        </Text>
        <Text tone="muted" className="mt-3">
          Nenhuma missão por enquanto. Fique à vontade para fotografar o que quiser.
        </Text>
        <View className="mt-6">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Abrir câmera"
            onPress={() => router.push("/photo")}
            className="items-center rounded-pilula bg-acento px-6 py-3"
          >
            <Text tone="onAccent">Abrir câmera</Text>
          </Pressable>
        </View>
        <MusicaLink onPress={() => router.push("/music")} />
      </Screen>
    );
  }

  return (
    <Screen>
      <Text title className="text-2xl">
        Missões
      </Text>
      <Text tone="muted" className="mt-1">
        {missoes.filter((m) => m.feito).length}/{missoes.length} concluídas
      </Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Ver recado dos anfitriões"
        onPress={() => router.push("/recado")}
        className="mt-2 self-start"
      >
        <Text tone="accent" className="text-xs">
          Recado dos anfitriões →
        </Text>
      </Pressable>

      <ScrollView className="mt-4" showsVerticalScrollIndicator={false}>
        <View className="gap-3">
          {missoes.map((missao) => (
            <MissaoCard
              key={missao.id}
              missao={missao}
              onPress={() =>
                router.push({ pathname: "/photo", params: { missao: missao.id } })
              }
            />
          ))}
        </View>
        <MusicaLink onPress={() => router.push("/music")} />
      </ScrollView>
    </Screen>
  );
}

function MissaoCard({
  missao,
  onPress,
}: {
  missao: MissaoItem;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Missão: ${missao.titulo}${missao.feito ? ", concluída" : ""}`}
      onPress={onPress}
      className={`flex-row items-center gap-3 rounded-superficie border border-linha bg-superficie p-4 ${
        missao.feito ? "opacity-60" : ""
      }`}
    >
      <View
        className={`size-5 shrink-0 rounded-full border-2 ${
          missao.feito ? "border-acento bg-acento" : "border-linha"
        }`}
      />
      <Text className="flex-1 text-base leading-snug">{missao.titulo}</Text>
      <Text tone="muted" className="text-sm">
        {missao.feito ? "Feita" : "Fotografar →"}
      </Text>
    </Pressable>
  );
}

function MusicaLink({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel="Música do casal"
      onPress={onPress}
      className="mt-4 items-center py-2"
    >
      <Text tone="accent" className="text-sm">
        Música do casal →
      </Text>
    </Pressable>
  );
}
