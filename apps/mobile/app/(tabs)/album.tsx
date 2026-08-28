import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Image, Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { Screen, Text } from "@albora/ui-native";
import {
  buscarAlbum,
  thumbDoCaptitulo,
  totalFotosCapitulo,
  type CapituloAlbum,
  type FotoAlbum,
} from "../../src/album";
import { loadSession } from "../../src/feed";
import type { ModoInteracao } from "../../src/feed";

// ─── Grid de fotos de um capítulo ─────────────────────────────────────────────
function GridFotos({
  fotos,
  interacao,
  onAbrirFoto,
}: {
  fotos: FotoAlbum[];
  interacao: ModoInteracao;
  onAbrirFoto: (foto: FotoAlbum, interacao: ModoInteracao) => void;
}) {
  if (fotos.length === 0) return null;

  return (
    <View className="mt-2 flex-row flex-wrap gap-1 px-1 pb-2">
      {fotos.map((foto) => (
        <Pressable
          key={foto.id}
          onPress={() => onAbrirFoto(foto, interacao)}
          accessibilityRole="button"
          accessibilityLabel="Ver foto"
          className="overflow-hidden rounded-lg"
          style={{ width: "31.5%" }}
        >
          {foto.urlThumb ? (
            <Image
              source={{ uri: foto.urlThumb }}
              className="aspect-square w-full"
              resizeMode="cover"
            />
          ) : (
            <View className="aspect-square w-full bg-superficie-alta" />
          )}
        </Pressable>
      ))}
    </View>
  );
}

// ─── Item de capítulo (expansível) ────────────────────────────────────────────
function ItemCapitulo({
  capitulo,
  expandido,
  interacao,
  onToggle,
  onAbrirFoto,
}: {
  capitulo: CapituloAlbum;
  expandido: boolean;
  interacao: ModoInteracao;
  onToggle: () => void;
  onAbrirFoto: (foto: FotoAlbum, interacao: ModoInteracao) => void;
}) {
  const thumb = thumbDoCaptitulo(capitulo);
  const total = totalFotosCapitulo(capitulo);
  const todasAsFotos = capitulo.paginas.flatMap((p) => p.fotos);

  return (
    <View className="mb-3 overflow-hidden rounded-2xl bg-superficie">
      <Pressable
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityLabel={expandido ? `Recolher ${capitulo.titulo}` : `Expandir ${capitulo.titulo}`}
        className="flex-row items-center p-3"
      >
        {/* Thumb do capítulo */}
        {thumb ? (
          <Image
            source={{ uri: thumb }}
            className="mr-3 h-14 w-14 rounded-xl"
            accessibilityLabel="Capa do capítulo"
          />
        ) : (
          <View className="mr-3 h-14 w-14 rounded-xl bg-superficie-alta" />
        )}

        <View className="flex-1">
          <Text title className="text-base">
            {capitulo.titulo}
          </Text>
          <Text tone="muted" className="mt-0.5 text-sm">
            {total === 1 ? "1 foto" : `${total} fotos`}
          </Text>
        </View>

        <Text tone="muted" className="ml-2 text-base leading-none">
          {expandido ? "▲" : "▼"}
        </Text>
      </Pressable>

      {expandido && (
        <GridFotos fotos={todasAsFotos} interacao={interacao} onAbrirFoto={onAbrirFoto} />
      )}
    </View>
  );
}

// ─── Tela de álbum ────────────────────────────────────────────────────────────
export default function AlbumScreen() {
  const router = useRouter();
  const [capitulos, setCapitulos] = useState<CapituloAlbum[]>([]);
  const [interacao, setInteracao] = useState<ModoInteracao>("espelho");
  const [expandidoId, setExpandidoId] = useState<string | null>(null);
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
      const modo: ModoInteracao =
        resultado.album.interacao === "completo" ? "completo" : "espelho";
      setInteracao(modo);

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

  const abrirFoto = useCallback(
    (foto: FotoAlbum, modoInteracao: ModoInteracao) => {
      router.push({
        pathname: "/photo-detail",
        params: {
          uploadId: foto.id,
          fullUrl: foto.url,
          interacao: modoInteracao,
          minha: "0",
          autor: "",
          reacoes: "0",
          minhaReacao: "",
          mime: foto.mime,
        },
      });
    },
    [router],
  );

  const toggleExpandido = useCallback((id: string) => {
    setExpandidoId((atual) => (atual === id ? null : id));
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
        renderItem={({ item }) => (
          <ItemCapitulo
            capitulo={item}
            expandido={expandidoId === item.id}
            interacao={interacao}
            onToggle={() => toggleExpandido(item.id)}
            onAbrirFoto={abrirFoto}
          />
        )}
      />
    </Screen>
  );
}
