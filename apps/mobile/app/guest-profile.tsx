import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  SafeAreaView,
  StyleSheet,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Text } from "@albora/ui-native";
import { loadSession } from "../src/feed";
import { fetchGuestProfile, type GuestProfilePage } from "../src/guests";
import type { GuestSession } from "../src/session";
import type { FeedItem } from "../src/feed";

const IMG_SIZE = 160;

export default function GuestProfileScreen() {
  const { autorId } = useLocalSearchParams<{ autorId: string }>();
  const router = useRouter();

  const [session, setSession] = useState<GuestSession | null>(null);
  const [nome, setNome] = useState<string | null>(null);
  const [itens, setItens] = useState<FeedItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [carregouUmaVez, setCarregouUmaVez] = useState(false);
  const [erro, setErro] = useState<"not_found" | "rede" | null>(null);

  useEffect(() => {
    loadSession().then((s) => {
      setSession(s);
    });
  }, []);

  const carregar = useCallback(
    async (sess: GuestSession, cur: string | null) => {
      if (!autorId || carregando) return;
      setCarregando(true);
      setErro(null);

      try {
        const pagina: GuestProfilePage = await fetchGuestProfile(sess, autorId, cur);
        setNome(pagina.nome);
        setItens((prev) => (cur === null ? pagina.itens : [...prev, ...pagina.itens]));
        setCursor(pagina.proximoCursor);
      } catch (e: unknown) {
        const code = e instanceof Error && "code" in e ? (e as { code: string }).code : "rede";
        setErro(code === "not_found" ? "not_found" : "rede");
      } finally {
        setCarregando(false);
        setCarregouUmaVez(true);
      }
    },
    [autorId, carregando],
  );

  useEffect(() => {
    if (session && !carregouUmaVez) {
      void carregar(session, null);
    }
  }, [session, carregouUmaVez, carregar]);

  function carregarMais() {
    if (!session || cursor === null || carregando) return;
    void carregar(session, cursor);
  }

  if (!carregouUmaVez) {
    return (
      <SafeAreaView style={styles.centrado}>
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  if (erro === "not_found") {
    return (
      <SafeAreaView style={styles.centrado}>
        <Pressable onPress={() => router.back()} style={styles.botaoVoltar}>
          <Text tone="muted">← Voltar</Text>
        </Pressable>
        <Text title className="text-center text-lg">
          Perfil não disponível
        </Text>
        <Text tone="muted" className="mt-2 text-center">
          Pode ser um link antigo ou alguém fora do seu alcance.
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View className="flex-row items-center gap-3 border-b border-linha px-4 py-3">
        <Pressable onPress={() => router.back()} accessibilityLabel="Voltar" style={styles.botaoVoltar}>
          <Text tone="muted" className="text-base">
            ←
          </Text>
        </Pressable>
        <Text title className="flex-1 text-base">
          {nome ?? "Perfil"}
        </Text>
      </View>

      {erro === "rede" && (
        <Pressable
          onPress={() => session && void carregar(session, null)}
          style={styles.erroRede}
        >
          <Text tone="muted" className="text-center">
            Não consegui carregar. Toque para tentar de novo.
          </Text>
        </Pressable>
      )}

      <FlatList
        data={itens}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.grade}
        columnWrapperStyle={styles.coluna}
        onEndReached={carregarMais}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          carregouUmaVez && itens.length === 0 ? (
            <Text tone="muted" className="mt-8 text-center">
              Nenhuma foto ainda.
            </Text>
          ) : null
        }
        ListFooterComponent={
          carregando && itens.length > 0 ? (
            <View style={styles.rodapeCarregando}>
              <ActivityIndicator />
            </View>
          ) : null
        }
        renderItem={({ item }) => <FotoCard item={item} />}
      />
    </SafeAreaView>
  );
}

function FotoCard({ item }: { item: FeedItem }) {
  const router = useRouter();

  return (
    <Pressable
      style={styles.fotoCard}
      onPress={() =>
        router.push({
          pathname: "/photo-detail",
          params: {
            uploadId: item.id,
            chaveThumb: item.chaveThumb,
            chaveFull: item.chaveFull,
            mime: item.mime,
            autor: item.autor,
            reacoes: String(item.reacoes),
            minhaReacao: item.minhaReacao ?? "",
            minha: item.minha ? "1" : "0",
            sessaoAutor: item.sessaoAutor ?? "",
            interacao: "completo",
          },
        })
      }
      accessibilityLabel={`Foto de ${item.autor}`}
    >
      {item.thumbUrl ? (
        <Image source={{ uri: item.thumbUrl }} style={styles.foto} className="rounded-token" resizeMode="cover" />
      ) : (
        <View style={styles.foto} className="rounded-token bg-superficie-alta" />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centrado: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  cabecalho: {},
  botaoVoltar: { paddingRight: 8, paddingVertical: 4 },
  erroRede: { paddingVertical: 12, paddingHorizontal: 16 },
  grade: { padding: 4 },
  coluna: { gap: 4 },
  fotoCard: { flex: 1, margin: 4 },
  foto: { width: "100%", aspectRatio: 1, height: IMG_SIZE },
  fotoPlaceholder: {},
  rodapeCarregando: { paddingVertical: 16, alignItems: "center" },
});
