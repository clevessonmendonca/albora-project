import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Image, Pressable, View } from "react-native";
import { Screen, Text } from "@albora/ui-native";
import { carregarMinhasFotos, type MinhaFoto } from "../../src/my-photos";
import { guestQueue } from "../../src/disk";
import { loadSession } from "../../src/feed";

function EstadoBadge({ tipo }: { tipo: MinhaFoto["tipo"] }) {
  if (tipo === "enviada") return null;

  const rotulo = tipo === "pendente" ? "Enviando…" : "Falhou";
  const estilo =
    tipo === "pendente"
      ? "bg-acento px-2 py-1 rounded-pilula"
      : "bg-alerta px-2 py-1 rounded-pilula";

  return (
    <View className={`absolute right-2 top-2 ${estilo}`}>
      <Text tone={tipo === "pendente" ? "onAccent" : "ink"} className="text-xs">
        {rotulo}
      </Text>
    </View>
  );
}

function ItemFoto({ foto }: { foto: MinhaFoto }) {
  return (
    <View className="mb-4 overflow-hidden rounded-2xl bg-superficie">
      <View className="relative aspect-[4/5] w-full">
        {foto.tipo === "enviada" && foto.thumbUrl ? (
          <Image
            source={{ uri: foto.thumbUrl }}
            className="aspect-[4/5] w-full"
            accessibilityLabel="Minha foto"
          />
        ) : (
          <View className="aspect-[4/5] w-full bg-superficie-alta" />
        )}
        <EstadoBadge tipo={foto.tipo} />
      </View>
      {foto.tipo === "enviada" && (foto.legenda ?? foto.lugar) ? (
        <Text tone="muted" className="px-3 py-2 text-sm">
          {foto.legenda ?? foto.lugar}
        </Text>
      ) : null}
    </View>
  );
}

export default function MineScreen() {
  const [fotos, setFotos] = useState<MinhaFoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(false);
  const [semSessao, setSemSessao] = useState(false);

  const carregar = useCallback(async () => {
    setErro(false);
    try {
      const session = await loadSession();
      if (!session) {
        setSemSessao(true);
        setLoading(false);
        return;
      }
      setSemSessao(false);
      const resultado = await carregarMinhasFotos(session, guestQueue());
      setFotos(resultado.fotos);
    } catch {
      setErro(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void carregar();
    // só na montagem — AppState drain (outro agente) recarrega ao voltar ao foreground
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
          Minhas fotos
        </Text>
        <Text tone="muted" className="mt-3">
          Pareie o app com o QR da mesa para ver as fotos que você enviou.
        </Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <Text title className="mb-3 text-2xl">
        Minhas fotos
      </Text>
      {erro && (
        <Text tone="muted" className="mb-3">
          Não carregou. Puxe para tentar de novo.
        </Text>
      )}
      <FlatList
        data={fotos}
        keyExtractor={(foto) => foto.id}
        onRefresh={() => {
          setLoading(true);
          void carregar();
        }}
        refreshing={loading}
        numColumns={2}
        columnWrapperStyle={{ gap: 8 }}
        ListEmptyComponent={
          <Text tone="muted" className="mt-6 text-center">
            Você ainda não enviou nenhuma foto.
          </Text>
        }
        renderItem={({ item }) => (
          <View className="flex-1">
            <ItemFoto foto={item} />
          </View>
        )}
      />
    </Screen>
  );
}
