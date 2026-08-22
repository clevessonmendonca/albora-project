import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text as RNText,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { Screen, Text } from "@albora/ui-native";
import {
  fetchFeedPage,
  loadSession,
  type FeedItem,
  type ModoInteracao,
} from "../../src/feed";
import { toggleReaction } from "../../src/reaction";
import {
  deleteComment,
  listComments,
  postComment,
  type ComentarioItem,
} from "../../src/comments";
import { reportMedia, type MotivoDenuncia } from "../../src/report";
import { fetchStories, type StoryItem } from "../../src/stories";
import type { GuestSession } from "../../src/session";

// ─── Estrela SVG via texto Unicode ────────────────────────────────────────────
function Estrela({ preenchida }: { preenchida: boolean }) {
  return (
    <Text className={`text-xl leading-none ${preenchida ? "text-acento" : "text-ink-2"}`}>
      {preenchida ? "★" : "☆"}
    </Text>
  );
}

// ─── Tira de stories ──────────────────────────────────────────────────────────
function StoriesRail({
  itens,
  onAdicionar,
}: {
  itens: StoryItem[];
  onAdicionar: () => void;
}) {
  if (itens.length === 0) return null;

  return (
    <View className="mb-4">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="gap-3 px-1 py-1"
      >
        {/* CTA para adicionar nova foto */}
        <Pressable
          onPress={onAdicionar}
          accessibilityRole="button"
          accessibilityLabel="Adicionar foto"
          className="items-center gap-1"
        >
          <View className="h-14 w-14 items-center justify-center rounded-full border-2 border-acento bg-superficie">
            <Text className="text-2xl leading-none text-acento">+</Text>
          </View>
          <RNText numberOfLines={1} className="text-[0.65rem] font-corpo text-ink-2">
            Você
          </RNText>
        </Pressable>

        {itens.map((story) => (
          <View key={story.id} className="items-center gap-1">
            <View className="h-14 w-14 overflow-hidden rounded-full border-2 border-acento">
              {story.thumbUrl ? (
                <Image
                  source={{ uri: story.thumbUrl }}
                  className="h-full w-full"
                  accessibilityLabel={`Story de ${story.autor}`}
                />
              ) : (
                <View className="h-full w-full items-center justify-center bg-superficie-alta">
                  <Text className="text-lg font-medium text-ink-2">
                    {story.autor.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
            </View>
            <RNText numberOfLines={1} className="w-14 text-center text-[0.65rem] font-corpo text-ink-2">
              {story.autor}
            </RNText>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

// ─── Sheet de comentários ─────────────────────────────────────────────────────
function ComentariosSheet({
  uploadId,
  session,
  onFechar,
}: {
  uploadId: string;
  session: GuestSession;
  onFechar: () => void;
}) {
  const [threads, setThreads] = useState<ComentarioItem[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [texto, setTexto] = useState("");
  const [publicando, setPublicando] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    const resultado = await listComments(session, uploadId);
    setThreads(resultado.threads);
    setCarregando(false);
  }, [session, uploadId]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const publicar = async () => {
    const limpo = texto.trim();
    if (!limpo || publicando) return;
    setPublicando(true);
    const resultado = await postComment(session, uploadId, limpo);
    if (resultado !== null) {
      setTexto("");
      await carregar();
    }
    setPublicando(false);
  };

  const remover = async (comentarioId: string) => {
    await deleteComment(session, comentarioId);
    await carregar();
  };

  return (
    <Modal
      visible
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onFechar}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1 bg-fundo"
      >
        <View className="flex-row items-center border-b border-linha px-4 py-3">
          <Text title className="flex-1 text-base">
            Comentários
          </Text>
          <Pressable
            onPress={onFechar}
            accessibilityLabel="Fechar comentários"
            className="px-2 py-1"
          >
            <Text tone="muted">Fechar</Text>
          </Pressable>
        </View>

        <ScrollView className="flex-1 px-4" contentContainerClassName="py-3">
          {carregando ? (
            <ActivityIndicator className="my-6" />
          ) : threads.length === 0 ? (
            <Text tone="muted" className="mt-4 text-center">
              Nenhum comentário ainda. Seja o primeiro!
            </Text>
          ) : (
            threads.map((t) => (
              <View key={t.id} className="mb-4">
                <View className="rounded-2xl bg-superficie px-3 py-2.5">
                  <Text className="text-[0.8rem] font-medium">{t.autor}</Text>
                  <Text className="mt-0.5 text-sm">{t.texto}</Text>
                  {t.meu && (
                    <Pressable
                      onPress={() => void remover(t.id)}
                      accessibilityLabel="Remover comentário"
                      className="mt-1.5"
                    >
                      <Text tone="muted" className="text-xs">
                        Remover
                      </Text>
                    </Pressable>
                  )}
                </View>
                {t.respostas.map((r) => (
                  <View key={r.id} className="ml-6 mt-2 rounded-2xl bg-superficie px-3 py-2.5">
                    <Text className="text-[0.8rem] font-medium">{r.autor}</Text>
                    <Text className="mt-0.5 text-sm">{r.texto}</Text>
                  </View>
                ))}
              </View>
            ))
          )}
        </ScrollView>

        <View className="flex-row items-center gap-2 border-t border-linha px-4 py-3">
          <TextInput
            value={texto}
            onChangeText={setTexto}
            placeholder="Escreva um comentário…"
            maxLength={500}
            multiline
            className="flex-1 rounded-2xl bg-superficie px-3 py-2.5 font-corpo text-sm text-ink"
          />
          <Pressable
            onPress={() => void publicar()}
            disabled={publicando || texto.trim().length === 0}
            accessibilityLabel="Enviar comentário"
            className="min-h-11 items-center justify-center rounded-pilula bg-acento px-4 disabled:opacity-55"
          >
            <Text tone="onAccent" className="text-sm font-medium">
              {publicando ? "…" : "Enviar"}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Sheet de denúncia ────────────────────────────────────────────────────────
const OPCOES_DENUNCIA: { kind: MotivoDenuncia; rotulo: string; ajuda: string }[] = [
  {
    kind: "ofensivo",
    rotulo: "Esta foto não deveria estar no evento",
    ajuda: "Conteúdo ofensivo ou que não combina com a festa.",
  },
  {
    kind: "aparece_na_foto",
    rotulo: "Sou eu nessa foto — tire do telão e do álbum",
    ajuda: "Você não enviou, mas aparece nela. O anfitrião decide.",
  },
];

function DenunciaSheet({
  uploadId,
  minha,
  session,
  onFechar,
}: {
  uploadId: string;
  minha?: boolean;
  session: GuestSession;
  onFechar: () => void;
}) {
  const [kind, setKind] = useState<MotivoDenuncia>("ofensivo");
  const [enviando, setEnviando] = useState(false);
  const [confirmado, setConfirmado] = useState(false);

  const opcoes = minha ? OPCOES_DENUNCIA.filter((o) => o.kind !== "aparece_na_foto") : OPCOES_DENUNCIA;

  const enviar = async () => {
    setEnviando(true);
    const ok = await reportMedia(session, uploadId, kind);
    if (ok) setConfirmado(true);
    setEnviando(false);
  };

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onFechar}>
      <View className="flex-1 bg-fundo">
        <View className="flex-row items-center border-b border-linha px-4 py-3">
          <Text title className="flex-1 text-base">
            Esta foto
          </Text>
          <Pressable onPress={onFechar} accessibilityLabel="Fechar" className="px-2 py-1">
            <Text tone="muted">Fechar</Text>
          </Pressable>
        </View>

        <View className="px-4 py-4">
          {confirmado ? (
            <Text tone="muted" className="leading-normal">
              Recebido. O anfitrião vai revisar.
            </Text>
          ) : (
            <>
              <Text tone="muted" className="mb-4 leading-normal text-sm">
                O anfitrião decide o que fazer. Nada some sozinho.
              </Text>
              {opcoes.map((o) => (
                <Pressable
                  key={o.kind}
                  onPress={() => setKind(o.kind)}
                  className={`mb-3 rounded-2xl border px-3 py-3 ${
                    kind === o.kind ? "border-acento" : "border-linha"
                  }`}
                >
                  <Text className="text-sm font-medium">{o.rotulo}</Text>
                  <Text tone="muted" className="mt-1 text-xs leading-snug">
                    {o.ajuda}
                  </Text>
                </Pressable>
              ))}
              <Pressable
                onPress={() => void enviar()}
                disabled={enviando}
                className="mt-2 min-h-11 items-center justify-center rounded-pilula bg-acento disabled:opacity-55"
              >
                <Text tone="onAccent" className="font-medium">
                  {enviando ? "Enviando…" : "Enviar"}
                </Text>
              </Pressable>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ─── Card de item do feed ─────────────────────────────────────────────────────
function FeedCard({
  item: inicial,
  interacao,
  session,
  onAtualizarItem,
  onAbrirDetalhe,
}: {
  item: FeedItem;
  interacao: ModoInteracao;
  session: GuestSession;
  onAtualizarItem: (id: string, reacoes: number, minhaReacao: string | null) => void;
  onAbrirDetalhe: (item: FeedItem) => void;
}) {
  const completo = interacao === "completo";
  const [alternando, setAlternando] = useState(false);
  const [comentariosAbertos, setComentariosAbertos] = useState(false);
  const [denunciaAberta, setDenunciaAberta] = useState(false);

  const alternarReacao = async () => {
    if (alternando) return;
    setAlternando(true);
    const resultado = await toggleReaction(session, inicial.id, inicial.minhaReacao);
    if (resultado !== null) {
      onAtualizarItem(inicial.id, resultado.reacoes, resultado.minha);
    }
    setAlternando(false);
  };

  return (
    <View className="mb-4 overflow-hidden rounded-2xl bg-superficie">
      <Pressable
        onPress={() => onAbrirDetalhe(inicial)}
        accessibilityRole="button"
        accessibilityLabel={`Ver foto de ${inicial.autor}`}
      >
        {inicial.thumbUrl ? (
          <Image source={{ uri: inicial.thumbUrl }} className="aspect-[4/5] w-full" />
        ) : (
          <View className="aspect-[4/5] w-full bg-superficie-alta" />
        )}
      </Pressable>

      <View className="px-3 pb-3 pt-2">
        <Text className="mb-2">{inicial.autor}</Text>

        <View className="flex-row items-center gap-4">
          {/* Estrela — sempre disponível (ADR 0009) */}
          <Pressable
            onPress={() => void alternarReacao()}
            disabled={alternando}
            accessibilityRole="button"
            accessibilityLabel={inicial.minhaReacao ? "Remover curtida" : "Curtir"}
            className="flex-row items-center gap-1.5"
          >
            <Estrela preenchida={inicial.minhaReacao !== null} />
            {inicial.reacoes > 0 && (
              <Text tone="muted" className="text-sm">
                {inicial.reacoes}
              </Text>
            )}
          </Pressable>

          {/* Comentários — só no modo completo */}
          {completo && (
            <Pressable
              onPress={() => setComentariosAbertos(true)}
              accessibilityRole="button"
              accessibilityLabel="Comentários"
              className="flex-row items-center gap-1.5"
            >
              <Text tone="muted" className="text-base leading-none">
                💬
              </Text>
            </Pressable>
          )}

          {/* Denunciar — só no modo completo */}
          {completo && (
            <Pressable
              onPress={() => setDenunciaAberta(true)}
              accessibilityRole="button"
              accessibilityLabel="Mais opções"
              className="ml-auto"
            >
              <Text tone="muted" className="text-base leading-none">
                ···
              </Text>
            </Pressable>
          )}
        </View>
      </View>

      {comentariosAbertos && (
        <ComentariosSheet
          uploadId={inicial.id}
          session={session}
          onFechar={() => setComentariosAbertos(false)}
        />
      )}

      {denunciaAberta && (
        <DenunciaSheet
          uploadId={inicial.id}
          minha={!!inicial.minha}
          session={session}
          onFechar={() => setDenunciaAberta(false)}
        />
      )}
    </View>
  );
}

// ─── Tela principal ───────────────────────────────────────────────────────────
export default function FeedScreen() {
  const router = useRouter();
  const [itens, setItens] = useState<FeedItem[]>([]);
  const [interacao, setInteracao] = useState<ModoInteracao>("espelho");
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(false);
  const [semSessao, setSemSessao] = useState(false);
  const [stories, setStories] = useState<StoryItem[]>([]);
  const sessionRef = useRef<GuestSession | null>(null);
  const interacaoRef = useRef<ModoInteracao>("espelho");

  const carregar = useCallback(async (mais = false) => {
    setErro(false);
    try {
      const session = await loadSession();
      if (!session) {
        setSemSessao(true);
        setLoading(false);
        return;
      }
      sessionRef.current = session;
      setSemSessao(false);
      const page = await fetchFeedPage(session, mais ? cursor : null);
      setItens((antes) => (mais ? [...antes, ...page.itens] : page.itens));
      setCursor(page.proximoCursor);
      setInteracao(page.interacao);
      interacaoRef.current = page.interacao;

      // Carrega stories em paralelo só na primeira carga (não em "mais")
      if (!mais) {
        fetchStories(session).then(setStories).catch(() => {
          // degrada silenciosamente
        });
      }
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

  const atualizarItem = useCallback(
    (id: string, reacoes: number, minhaReacao: string | null) => {
      setItens((lista) =>
        lista.map((item) => (item.id === id ? { ...item, reacoes, minhaReacao } : item)),
      );
    },
    [],
  );

  const abrirDetalhe = useCallback((item: FeedItem) => {
    router.push({
      pathname: "/photo-detail",
      params: {
        uploadId: item.id,
        chaveFull: item.chaveFull,
        interacao: interacaoRef.current,
        minha: item.minha ? "1" : "0",
        autor: item.autor,
        reacoes: String(item.reacoes),
        minhaReacao: item.minhaReacao ?? "",
        mime: item.mime,
      },
    });
  }, [router]);

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

  const session = sessionRef.current;

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
      {session && (
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
          ListHeaderComponent={
            <StoriesRail
              itens={stories}
              onAdicionar={() => router.push("/photo")}
            />
          }
          ListEmptyComponent={
            <Text tone="muted" className="mt-6">
              Ainda não tem foto no ar. Seja a primeira.
            </Text>
          }
          renderItem={({ item }) => (
            <FeedCard
              item={item}
              interacao={interacao}
              session={session}
              onAtualizarItem={atualizarItem}
              onAbrirDetalhe={abrirDetalhe}
            />
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
      )}
    </Screen>
  );
}
