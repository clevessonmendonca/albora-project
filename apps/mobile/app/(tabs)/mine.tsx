import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Image, Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { Screen, Text } from "@albora/ui-native";
import {
  carregarMinhasFotos,
  deletarFotoEnviada,
  type MinhaFoto,
  type MinhaFotoEnviada,
} from "../../src/my-photos";
import { guestQueue } from "../../src/disk";
import { loadSession, type ModoInteracao } from "../../src/feed";
import type { GuestSession } from "../../src/session";

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

function ItemFoto({
  foto,
  removendo,
  onRemover,
  onAbrir,
}: {
  foto: MinhaFoto;
  removendo: boolean;
  onRemover: (foto: MinhaFoto) => void;
  onAbrir: (foto: MinhaFoto) => void;
}) {
  return (
    <View className="mb-4 overflow-hidden rounded-2xl bg-superficie">
      <Pressable
        onPress={() => onAbrir(foto)}
        onLongPress={() => onRemover(foto)}
        accessibilityRole="button"
        accessibilityLabel={foto.tipo === "enviada" ? "Ver foto" : "Manter pressionado para remover"}
        delayLongPress={400}
      >
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
          {removendo ? (
            <View className="absolute inset-0 items-center justify-center bg-bg/60">
              <ActivityIndicator />
            </View>
          ) : null}
        </View>
        {foto.tipo === "enviada" && (foto.legenda ?? foto.lugar) ? (
          <Text tone="muted" className="px-3 py-2 text-sm">
            {foto.legenda ?? foto.lugar}
          </Text>
        ) : null}
      </Pressable>

      <Pressable
        onPress={() => onRemover(foto)}
        accessibilityRole="button"
        accessibilityLabel="Remover foto"
        className="border-t border-linha px-3 py-2"
        disabled={removendo}
      >
        <Text tone="muted" className="text-center text-xs">
          {removendo ? "Removendo…" : "Remover"}
        </Text>
      </Pressable>
    </View>
  );
}

export default function MineScreen() {
  const router = useRouter();
  const [fotos, setFotos] = useState<MinhaFoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(false);
  const [semSessao, setSemSessao] = useState(false);
  const [session, setSession] = useState<GuestSession | null>(null);
  const [removendoId, setRemovendoId] = useState<string | null>(null);
  const interacaoRef = useRef<ModoInteracao>("espelho");

  const carregar = useCallback(async () => {
    setErro(false);
    try {
      const s = await loadSession();
      if (!s) {
        setSemSessao(true);
        setLoading(false);
        return;
      }
      setSession(s);
      setSemSessao(false);
      const resultado = await carregarMinhasFotos(s, guestQueue());
      setFotos(resultado.fotos);
      interacaoRef.current = resultado.interacao === "completo" ? "completo" : "espelho";
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

  const confirmarRemocao = useCallback(
    (foto: MinhaFoto) => {
      if (removendoId !== null) return;
      Alert.alert(
        "Remover foto",
        foto.tipo === "enviada"
          ? "Quer remover esta foto do evento?"
          : "Quer cancelar o envio desta foto?",
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Remover",
            style: "destructive",
            onPress: () => void remover(foto),
          },
        ],
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [removendoId, session],
  );

  const abrirDetalhe = useCallback(
    (foto: MinhaFoto) => {
      if (foto.tipo !== "enviada") {
        Alert.alert("Foto em processamento", "Esta foto ainda está sendo enviada.");
        return;
      }
      const enviada = foto as MinhaFotoEnviada;
      router.push({
        pathname: "/photo-detail",
        params: {
          uploadId: enviada.id,
          chaveFull: enviada.chaveFull,
          interacao: interacaoRef.current,
          minha: "1",
          autor: enviada.autor,
          reacoes: String(enviada.reacoes ?? 0),
          minhaReacao: "",
        },
      });
    },
    [router],
  );

  async function remover(foto: MinhaFoto) {
    if (removendoId !== null) return;
    setRemovendoId(foto.id);
    try {
      if (foto.tipo === "enviada") {
        if (!session) return;
        const { ok } = await deletarFotoEnviada(session, foto.id);
        if (!ok) {
          Alert.alert("Erro", "Não foi possível remover a foto. Tente de novo.");
          return;
        }
      } else {
        await guestQueue().remove(foto.id);
      }
      setFotos((prev) => prev.filter((f) => f.id !== foto.id));
    } catch {
      Alert.alert("Erro", "Não foi possível remover a foto. Tente de novo.");
    } finally {
      setRemovendoId(null);
    }
  }

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
            <ItemFoto
              foto={item}
              removendo={removendoId === item.id}
              onRemover={confirmarRemocao}
              onAbrir={abrirDetalhe}
            />
          </View>
        )}
      />
    </Screen>
  );
}
