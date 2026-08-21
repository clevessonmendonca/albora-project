import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Image, View } from "react-native";
import { Screen, Text } from "@albora/ui-native";
import { buscarAlbum, thumbDoCaptitulo, totalFotosCapitulo, type CapituloAlbum } from "../../src/album";
import { loadSession } from "../../src/feed";

function ThumbCapitulo({ uri }: { uri: string | null }) {
  if (!uri) {
    return <View className="mr-3 h-14 w-14 rounded-xl bg-superficie-alta" />;
  }
  return (
    <Image
      source={{ uri }}
      className="mr-3 h-14 w-14 rounded-xl"
      accessibilityLabel="Capa do capítulo"
    />
  );
}

function ItemCapitulo({ capitulo }: { capitulo: CapituloAlbum }) {
  const thumb = thumbDoCaptitulo(capitulo);
  const total = totalFotosCapitulo(capitulo);

  return (
    <View className="mb-3 flex-row items-center rounded-2xl bg-superficie p-3">
      <ThumbCapitulo uri={thumb} />
      <View className="flex-1">
        <Text title className="text-base">
          {capitulo.titulo}
        </Text>
        <Text tone="muted" className="mt-0.5 text-sm">
          {total === 1 ? "1 foto" : `${total} fotos`}
        </Text>
      </View>
    </View>
  );
}

export default function AlbumScreen() {
  const [capitulos, setCapitulos] = useState<CapituloAlbum[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(false);
  const [semSessao, setSemSessao] = useState(false);
  const renovacaoRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      const resultado = await buscarAlbum(session);
      if (!resultado.ok) {
        setErro(true);
        setLoading(false);
        return;
      }
      setCapitulos(resultado.album.capitulos);

      if (renovacaoRef.current !== null) {
        clearTimeout(renovacaoRef.current);
      }
      const espera = Math.max(0, resultado.album.expiraEm - 60_000 - Date.now());
      renovacaoRef.current = setTimeout(() => {
        void carregar();
      }, espera);
    } catch {
      setErro(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void carregar();
    return () => {
      if (renovacaoRef.current !== null) {
        clearTimeout(renovacaoRef.current);
      }
    };
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
          Álbum
        </Text>
        <Text tone="muted" className="mt-3">
          Pareie o app com o QR da mesa para ver a noite em capítulos.
        </Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <Text title className="mb-3 text-2xl">
        Álbum
      </Text>
      {erro && (
        <Text tone="muted" className="mb-3">
          Não carregou. Puxe para tentar de novo.
        </Text>
      )}
      <FlatList
        data={capitulos}
        keyExtractor={(capitulo) => capitulo.id}
        onRefresh={() => {
          setLoading(true);
          void carregar();
        }}
        refreshing={loading}
        ListEmptyComponent={
          <Text tone="muted" className="mt-6 text-center">
            O álbum ainda está sendo montado. Volte em breve.
          </Text>
        }
        renderItem={({ item }) => <ItemCapitulo capitulo={item} />}
      />
    </Screen>
  );
}
