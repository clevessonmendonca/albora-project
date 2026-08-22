import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { buscarRecapPessoal, textoRecap, type RecapPessoal } from "../../src/recap";
import { idsDoRecap } from "../../src/recap-select";
import type { GuestSession } from "../../src/session";
import { compartilharColagem, compartilharFotoPropria, compartilharRecap, MAX_DA_COLAGEM } from "../../src/share";

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
  compartilhando,
  modoColagem,
  selecionada,
  onRemover,
  onCompartilhar,
  onAbrir,
  onToggleColagem,
}: {
  foto: MinhaFoto;
  removendo: boolean;
  compartilhando: boolean;
  modoColagem: boolean;
  selecionada: boolean;
  onRemover: (foto: MinhaFoto) => void;
  onCompartilhar: (foto: MinhaFoto) => void;
  onAbrir: (foto: MinhaFoto) => void;
  onToggleColagem: (foto: MinhaFoto) => void;
}) {
  const ocupado = removendo || compartilhando;
  const enviada = foto.tipo === "enviada";

  return (
    <View className="mb-4 overflow-hidden rounded-2xl bg-superficie">
      <Pressable
        onPress={() => {
          if (modoColagem && enviada) {
            onToggleColagem(foto);
            return;
          }
          onAbrir(foto);
        }}
        onLongPress={() => {
          if (!modoColagem) onRemover(foto);
        }}
        accessibilityRole="button"
        accessibilityLabel={
          modoColagem && enviada
            ? selecionada
              ? "Tirar da colagem"
              : "Incluir na colagem"
            : enviada
              ? "Ver foto"
              : "Manter pressionado para remover"
        }
        delayLongPress={400}
      >
        <View className="relative aspect-[4/5] w-full">
          {enviada && foto.thumbUrl ? (
            <Image
              source={{ uri: foto.thumbUrl }}
              className="aspect-[4/5] w-full"
              accessibilityLabel="Minha foto"
            />
          ) : (
            <View className="aspect-[4/5] w-full bg-superficie-alta" />
          )}
          <EstadoBadge tipo={foto.tipo} />
          {modoColagem && enviada ? (
            <View
              className={`absolute left-2 top-2 size-6 items-center justify-center rounded-pilula border-2 ${
                selecionada ? "border-acento bg-acento" : "border-ink bg-bg/70"
              }`}
            >
              {selecionada ? (
                <Text tone="onAccent" className="text-xs">
                  ✓
                </Text>
              ) : null}
            </View>
          ) : null}
          {ocupado ? (
            <View className="absolute inset-0 items-center justify-center bg-bg/60">
              <ActivityIndicator />
            </View>
          ) : null}
        </View>
        {enviada && (foto.legenda ?? foto.lugar) ? (
          <Text tone="muted" className="px-3 py-2 text-sm">
            {foto.legenda ?? foto.lugar}
          </Text>
        ) : null}
      </Pressable>

      {!modoColagem ? (
        <View className="flex-row border-t border-linha">
          {enviada ? (
            <Pressable
              onPress={() => onCompartilhar(foto)}
              accessibilityRole="button"
              accessibilityLabel="Compartilhar foto"
              className="flex-1 px-2 py-2"
              disabled={ocupado}
            >
              <Text tone="muted" className="text-center text-xs">
                {compartilhando ? "…" : "↗ Compartilhar"}
              </Text>
            </Pressable>
          ) : null}
          <Pressable
            onPress={() => onRemover(foto)}
            accessibilityRole="button"
            accessibilityLabel="Remover foto"
            className="flex-1 border-l border-linha px-2 py-2"
            disabled={ocupado}
          >
            <Text tone="muted" className="text-center text-xs">
              {removendo ? "Removendo…" : "Remover"}
            </Text>
          </Pressable>
        </View>
      ) : null}
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
  const [compartilhandoId, setCompartilhandoId] = useState<string | null>(null);
  const [recap, setRecap] = useState<RecapPessoal | null>(null);
  const [modoColagem, setModoColagem] = useState(false);
  const [selecionadas, setSelecionadas] = useState<string[]>([]);
  const [colando, setColando] = useState(false);
  const [recapCompartilhando, setRecapCompartilhando] = useState(false);
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
      const r = await buscarRecapPessoal(s);
      setRecap(r);
    } catch {
      setErro(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const confirmarRemocao = useCallback(
    (foto: MinhaFoto) => {
      if (removendoId !== null || modoColagem) return;
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
    [removendoId, session, modoColagem],
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
    if (removendoId !== null || compartilhandoId !== null || colando) return;
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
      setSelecionadas((prev) => prev.filter((id) => id !== foto.id));
    } catch {
      Alert.alert("Erro", "Não foi possível remover a foto. Tente de novo.");
    } finally {
      setRemovendoId(null);
    }
  }

  const compartilhar = useCallback(
    async (foto: MinhaFoto) => {
      if (foto.tipo !== "enviada" || !session || compartilhandoId !== null) return;
      setCompartilhandoId(foto.id);
      try {
        const r = await compartilharFotoPropria({
          session,
          uploadId: foto.id,
          chaveFull: foto.chaveFull,
        });
        if (!r.ok) {
          Alert.alert("Compartilhar", r.erro);
        }
      } catch {
        Alert.alert("Compartilhar", "Não deu para compartilhar agora.");
      } finally {
        setCompartilhandoId(null);
      }
    },
    [session, compartilhandoId],
  );

  const toggleColagem = useCallback((foto: MinhaFoto) => {
    if (foto.tipo !== "enviada") return;
    setSelecionadas((prev) => {
      if (prev.includes(foto.id)) return prev.filter((id) => id !== foto.id);
      if (prev.length >= MAX_DA_COLAGEM) {
        Alert.alert("Colagem", "A colagem leva no máximo quatro fotos.");
        return prev;
      }
      return [...prev, foto.id];
    });
  }, []);

  const enviarColagem = useCallback(async () => {
    if (!session || colando) return;
    if (selecionadas.length < 2) {
      Alert.alert("Colagem", "Escolha pelo menos 2 fotos.");
      return;
    }
    setColando(true);
    try {
      const r = await compartilharColagem({ session, uploadIds: selecionadas });
      if (!r.ok) {
        Alert.alert("Colagem", r.erro);
        return;
      }
      setModoColagem(false);
      setSelecionadas([]);
    } catch {
      Alert.alert("Colagem", "Não deu para compartilhar a colagem agora.");
    } finally {
      setColando(false);
    }
  }, [session, selecionadas, colando]);

  const enviadasCount = fotos.filter((f) => f.tipo === "enviada").length;
  const enviadas = fotos.filter((f): f is MinhaFotoEnviada => f.tipo === "enviada");
  const idsRecap = useMemo(
    () => (session ? idsDoRecap(enviadas, session.eventoId) : []),
    [session, enviadas],
  );
  const recapTexto = recap ? textoRecap(recap) : null;

  const compartilharRecapDaNoite = useCallback(async () => {
    if (!session || recapCompartilhando || idsRecap.length === 0) return;
    setRecapCompartilhando(true);
    try {
      const r = await compartilharRecap({ session, uploadIds: idsRecap });
      if (!r.ok) {
        Alert.alert("Recap", r.erro);
      }
    } catch {
      Alert.alert("Recap", "Não deu para compartilhar o recap agora.");
    } finally {
      setRecapCompartilhando(false);
    }
  }, [session, idsRecap, recapCompartilhando]);

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
      <View className="mb-3 flex-row items-center justify-between gap-2">
        <Text title className="flex-1 text-2xl">
          Minhas fotos
        </Text>
        {enviadasCount >= 2 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={modoColagem ? "Cancelar colagem" : "Montar colagem"}
            onPress={() => {
              setModoColagem((v) => !v);
              setSelecionadas([]);
            }}
            disabled={colando}
            className="rounded-pilula border border-linha px-3 py-1.5"
          >
            <Text tone="muted" className="text-xs">
              {modoColagem ? "Cancelar" : "Colagem"}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {recapTexto ? (
        <View className="mb-3 rounded-token border border-linha bg-superficie px-4 py-3">
          <Text className="text-sm leading-relaxed">{recapTexto}</Text>
          {idsRecap.length > 0 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Compartilhar recap da noite"
              onPress={() => void compartilharRecapDaNoite()}
              disabled={recapCompartilhando || modoColagem}
              className={`mt-3 items-center rounded-pilula bg-acento px-4 py-2 ${
                recapCompartilhando ? "opacity-55" : ""
              }`}
            >
              <Text tone="onAccent" className="text-xs">
                {recapCompartilhando ? "…" : `↗ Recap (${idsRecap.length} fotos)`}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {modoColagem ? (
        <View className="mb-3 flex-row items-center justify-between gap-2">
          <Text tone="muted" className="flex-1 text-xs">
            {selecionadas.length}/{MAX_DA_COLAGEM} selecionadas · toque para marcar
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Compartilhar colagem"
            onPress={() => void enviarColagem()}
            disabled={colando || selecionadas.length < 2}
            className={`rounded-pilula bg-acento px-4 py-2 ${
              colando || selecionadas.length < 2 ? "opacity-55" : ""
            }`}
          >
            <Text tone="onAccent" className="text-xs">
              {colando ? "…" : "↗ Colagem"}
            </Text>
          </Pressable>
        </View>
      ) : null}

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
              compartilhando={compartilhandoId === item.id}
              modoColagem={modoColagem}
              selecionada={selecionadas.includes(item.id)}
              onRemover={confirmarRemocao}
              onCompartilhar={(f) => void compartilhar(f)}
              onAbrir={abrirDetalhe}
              onToggleColagem={toggleColagem}
            />
          </View>
        )}
      />
    </Screen>
  );
}
