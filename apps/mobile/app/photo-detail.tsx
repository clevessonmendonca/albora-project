import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text as RNText,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Text } from "@albora/ui-native";
import { loadSession } from "../src/feed";
import { signMediaUrls } from "../src/sign-urls";
import { toggleReaction } from "../src/reaction";
import { deleteComment, listComments, postComment, type ComentarioItem } from "../src/comments";
import { reportMedia, type MotivoDenuncia } from "../src/report";
import type { GuestSession } from "../src/session";
import type { ModoInteracao } from "../src/feed";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

// ─── Estrela SVG via texto Unicode ────────────────────────────────────────────
function Estrela({ preenchida }: { preenchida: boolean }) {
  return (
    <Text className={`text-2xl leading-none ${preenchida ? "text-acento" : "text-ink-2"}`}>
      {preenchida ? "★" : "☆"}
    </Text>
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
                  <View
                    key={r.id}
                    className="ml-6 mt-2 rounded-2xl bg-superficie px-3 py-2.5"
                  >
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
  minha: boolean;
  session: GuestSession;
  onFechar: () => void;
}) {
  const [kind, setKind] = useState<MotivoDenuncia>("ofensivo");
  const [enviando, setEnviando] = useState(false);
  const [confirmado, setConfirmado] = useState(false);

  const opcoes = minha
    ? OPCOES_DENUNCIA.filter((o) => o.kind !== "aparece_na_foto")
    : OPCOES_DENUNCIA;

  const enviar = async () => {
    setEnviando(true);
    const ok = await reportMedia(session, uploadId, kind);
    if (ok) setConfirmado(true);
    setEnviando(false);
  };

  return (
    <Modal
      visible
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onFechar}
    >
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

// ─── Tela de detalhe ──────────────────────────────────────────────────────────
/**
 * Rota de detalhe / lightbox de uma foto.
 *
 * Parâmetros (todos strings, convertidos internamente):
 * - uploadId       — ID do upload (para reações, comentários, denúncia)
 * - chaveFull      — chave de storage da versão full (assina via POST /api/media/urls)
 * - fullUrl        — URL já assinada (álbum já resolve as URLs; omitir chaveFull)
 * - interacao      — "espelho" | "completo"
 * - minha          — "1" se a foto é do próprio convidado
 * - autor          — nome do autor
 * - reacoes        — contagem inicial (string numérica)
 * - minhaReacao    — emoji/tipo da reação atual ou "" (vazio = sem reação)
 */
export default function PhotoDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    uploadId: string;
    chaveFull?: string;
    fullUrl?: string;
    interacao?: string;
    minha?: string;
    autor?: string;
    reacoes?: string;
    minhaReacao?: string;
  }>();

  const {
    uploadId,
    chaveFull,
    fullUrl: fullUrlParam,
    interacao: interacaoParam = "espelho",
    minha: minhaParam = "0",
    autor = "",
    reacoes: reacoesParam = "0",
    minhaReacao: minhaReacaoParam = "",
  } = params;

  const interacao: ModoInteracao = interacaoParam === "completo" ? "completo" : "espelho";
  const minha = minhaParam === "1";
  const completo = interacao === "completo";

  const [fullUrl, setFullUrl] = useState<string | null>(fullUrlParam ?? null);
  const [assindo, setAssindo] = useState(!fullUrlParam && !!chaveFull);
  const [reacoes, setReacoes] = useState(parseInt(reacoesParam, 10) || 0);
  const [minhaReacao, setMinhaReacao] = useState<string | null>(
    minhaReacaoParam.length > 0 ? minhaReacaoParam : null,
  );
  const [alternando, setAlternando] = useState(false);
  const [comentariosAbertos, setComentariosAbertos] = useState(false);
  const [denunciaAberta, setDenunciaAberta] = useState(false);
  const sessionRef = useRef<GuestSession | null>(null);

  // Assinar URL full via POST /api/media/urls (reutiliza o mesmo mecanismo do feed)
  useEffect(() => {
    if (fullUrlParam) return;
    if (!chaveFull) return;

    let cancelado = false;
    void (async () => {
      const session = await loadSession();
      if (cancelado || !session) return;
      sessionRef.current = session;
      const urls = await signMediaUrls(session, [chaveFull]);
      if (cancelado) return;
      const assinada = urls[0]?.url;
      if (assinada) setFullUrl(assinada);
      setAssindo(false);
    })();

    return () => {
      cancelado = true;
    };
  }, [chaveFull, fullUrlParam]);

  // Carrega sessão quando já temos a URL (caminho do álbum)
  useEffect(() => {
    if (sessionRef.current) return;
    void (async () => {
      const session = await loadSession();
      if (session) sessionRef.current = session;
    })();
  }, []);

  const alternarReacao = async () => {
    if (alternando || !sessionRef.current) return;
    setAlternando(true);
    const resultado = await toggleReaction(sessionRef.current, uploadId, minhaReacao);
    if (resultado !== null) {
      setReacoes(resultado.reacoes);
      setMinhaReacao(resultado.minha);
    }
    setAlternando(false);
  };

  const session = sessionRef.current;

  return (
    <View className="flex-1 bg-ink">
      <SafeAreaView className="flex-1">
        {/* Barra superior */}
        <View className="flex-row items-center px-4 py-3">
          <Pressable
            onPress={() => router.back()}
            accessibilityLabel="Fechar foto"
            className="mr-4 min-h-11 min-w-11 items-center justify-center"
          >
            <Text className="text-2xl leading-none text-sobre-acento">✕</Text>
          </Pressable>
          {autor.length > 0 && (
            <RNText
              numberOfLines={1}
              className="flex-1 text-sm font-corpo text-sobre-acento"
            >
              {autor}
            </RNText>
          )}
        </View>

        {/* Foto full-screen */}
        <View
          className="flex-1 items-center justify-center"
          style={{ width: SCREEN_W }}
        >
          {assindo ? (
            <ActivityIndicator color="white" size="large" />
          ) : fullUrl ? (
            <Image
              source={{ uri: fullUrl }}
              style={{ width: SCREEN_W, height: SCREEN_H * 0.75 }}
              resizeMode="contain"
              accessibilityLabel={autor.length > 0 ? `Foto de ${autor}` : "Foto"}
            />
          ) : (
            <View
              style={{ width: SCREEN_W, height: SCREEN_H * 0.75 }}
              className="items-center justify-center"
            >
              <Text tone="muted" className="text-center">
                Foto indisponível
              </Text>
            </View>
          )}
        </View>

        {/* Barra de ações sociais */}
        <View className="flex-row items-center gap-6 px-5 py-4">
          {/* Estrela — sempre disponível (ADR 0009) */}
          <Pressable
            onPress={() => void alternarReacao()}
            disabled={alternando || !session}
            accessibilityRole="button"
            accessibilityLabel={minhaReacao ? "Remover curtida" : "Curtir"}
            className="flex-row items-center gap-2"
          >
            <Estrela preenchida={minhaReacao !== null} />
            {reacoes > 0 && (
              <Text className="text-sm text-sobre-acento">{reacoes}</Text>
            )}
          </Pressable>

          {/* Comentários — só no modo completo */}
          {completo && session && (
            <Pressable
              onPress={() => setComentariosAbertos(true)}
              accessibilityRole="button"
              accessibilityLabel="Comentários"
              className="flex-row items-center gap-2"
            >
              <Text className="text-2xl leading-none text-sobre-acento">💬</Text>
            </Pressable>
          )}

          {/* Denunciar — só no modo completo */}
          {completo && session && (
            <Pressable
              onPress={() => setDenunciaAberta(true)}
              accessibilityRole="button"
              accessibilityLabel="Mais opções"
              className="ml-auto"
            >
              <Text className="text-2xl leading-none text-sobre-acento">···</Text>
            </Pressable>
          )}
        </View>
      </SafeAreaView>

      {comentariosAbertos && session && (
        <ComentariosSheet
          uploadId={uploadId}
          session={session}
          onFechar={() => setComentariosAbertos(false)}
        />
      )}

      {denunciaAberta && session && (
        <DenunciaSheet
          uploadId={uploadId}
          minha={minha}
          session={session}
          onFechar={() => setDenunciaAberta(false)}
        />
      )}
    </View>
  );
}
