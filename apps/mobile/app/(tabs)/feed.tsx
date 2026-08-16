import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Image, Pressable, View } from "react-native";
import { Screen, Text } from "@albora/ui-native";
import { fetchFeedPage, loadSession, type FeedItem } from "../../src/feed";

export default function FeedScreen() {
  const [itens, setItens] = useState<FeedItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(false);
  const [semSessao, setSemSessao] = useState(false);

  const carregar = useCallback(async (mais = false) => {
    setErro(false);
    try {
      const session = await loadSession();
      if (!session) {
        setSemSessao(true);
        setLoading(false);
        return;
      }
      setSemSessao(false);
      const page = await fetchFeedPage(session, mais ? cursor : null);
      setItens((antes) => (mais ? [...antes, ...page.itens] : page.itens));
      setCursor(page.proximoCursor);
    } catch {
      setErro(true);
    } finally {
      setLoading(false);
    }
  }, [cursor]);

  useEffect(() => {
    void carregar(false);
    // só na montagem
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <Screen>
        <ActivityIndicator />
      </Screen>
    );
  }

  if (semSessao) {
    return (
      <Screen>
        <Text title className="text-2xl">
          Feed
        </Text>
        <Text tone="muted" className="mt-3">
          Pareie o app com o QR da mesa para ver o que já está no telão.
        </Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <Text title className="mb-3 text-2xl">
        Feed
      </Text>
      {erro && (
        <Text tone="muted" className="mb-3">
          Não carregou. Puxe para tentar de novo.
        </Text>
      )}
      <FlatList
        data={itens}
        keyExtractor={(item) => item.id}
        onRefresh={() => {
          setLoading(true);
          void carregar(false);
        }}
        refreshing={loading}
        onEndReached={() => {
          if (cursor) void carregar(true);
        }}
        ListEmptyComponent={
          <Text tone="muted" className="mt-6">
            Ainda não tem foto no ar. Seja a primeira.
          </Text>
        }
        renderItem={({ item }) => (
          <View className="mb-4 overflow-hidden rounded-2xl bg-superficie">
            {item.thumbUrl ? (
              <Image source={{ uri: item.thumbUrl }} className="aspect-[4/5] w-full" />
            ) : (
              <View className="aspect-[4/5] w-full bg-superficie-alta" />
            )}
            <Text className="px-3 py-2">{item.autor}</Text>
          </View>
        )}
        ListFooterComponent={
          cursor ? (
            <Pressable onPress={() => void carregar(true)} className="py-4">
              <Text tone="muted" className="text-center">
                Carregar mais
              </Text>
            </Pressable>
          ) : null
        }
      />
    </Screen>
  );
}
