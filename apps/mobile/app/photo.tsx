import { useCallback, useEffect, useRef, useState } from "react";
import { Image, Pressable, ScrollView, TextInput, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { randomUUID } from "expo-crypto";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { QUALITY, ordenarComRecomendado } from "@albora/core";
import type { Preset } from "@albora/core";
import { PACKS, resolvePackText } from "@albora/packs";
import { Button, Screen, Text } from "@albora/ui-native";
import { persistCapture } from "../src/capture";
import type { CaptureSource } from "../src/capture";
import { diskFiles, guestQueue, mediaRoot } from "../src/disk";
import { fetchGuestEventTheme } from "../src/event-theme";
import { filtroFromPreset } from "../src/filtro";
import { FilterStrip } from "../src/filter-strip";
import { normalizeSource } from "../src/normalize-source";
import { bytesParaDataUri, previewFiltrado } from "../src/preview-filtro";
import { parseStoredSession, SESSION_STORE_KEY, type GuestSession } from "../src/session";
import { drainGuestQueue } from "../src/drain-guest";
import { skiaDrawer } from "../src/skia-drawer";

const MAX_LEGENDA = 280;

type LugarOpcao = { id: string; titulo: string };

export default function PhotoScreen() {
  const router = useRouter();
  const { missao, prompt, video } = useLocalSearchParams<{
    missao?: string;
    prompt?: string;
    video?: string;
  }>();
  const desafioId = typeof missao === "string" && missao.length > 0 ? missao : null;
  const promptKey = typeof prompt === "string" && prompt.length > 0 ? prompt : null;
  const modoVideo = video === "1" && promptKey !== null;

  const camera = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [session, setSession] = useState<GuestSession | null | undefined>(undefined);
  const [pending, setPending] = useState(0);
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [gravando, setGravando] = useState(false);
  const [segundosRestantes, setSegundosRestantes] = useState(20);

  // Step "review": foto capturada aguardando escolha de filtro e envio.
  const [pendingShot, setPendingShot] = useState<CaptureSource | null>(null);
  const [filtroEscolhido, setFiltroEscolhido] = useState<Preset | null>(null);
  // Intensidade do preset: 0–1. Reseta para 1 ao trocar preset.
  const [intensidade, setIntensidade] = useState(1);

  // Preview ao vivo: data URI do thumb filtrado, ou null para mostrar o original.
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  // Contador de geração: incrementa a cada nova solicitação e cancela
  // in-flight quando o chip muda antes de o processamento terminar.
  const previewGenRef = useRef(0);

  // Legenda e lugar — opcional, nunca bloqueia o envio.
  const [legenda, setLegenda] = useState("");
  const [lugarEscolhido, setLugarEscolhido] = useState<string | null>(null);
  const [lugares, setLugares] = useState<LugarOpcao[]>([]);
  const [perguntaDoLugar, setPerguntaDoLugar] = useState("Onde na festa?");

  // Presets na ordem padrão — sem recomendadoId do servidor nesta fatia.
  const presets = ordenarComRecomendado(null);

  // Carrega os lugares do pack a partir do evento; best-effort (falha silenciosa).
  useEffect(() => {
    if (!session) return;
    void (async () => {
      try {
        const theme = await fetchGuestEventTheme(session);
        if (!theme) return;
        const pack = PACKS[theme.packId];
        if (!pack) return;
        setPerguntaDoLugar(resolvePackText(pack, "lugar.pergunta"));
        setLugares(
          pack.lugares.map((l) => ({
            id: l.id,
            titulo: resolvePackText(pack, l.chaveTitulo),
          })),
        );
      } catch {
        // Soft failure — chips de lugar simplesmente não aparecem.
      }
    })();
  }, [session]);

  // Troca preset: reseta intensidade para 1 (pleno) e atualiza a escolha.
  function handleEscolherFiltro(p: Preset | null) {
    setIntensidade(1);
    setFiltroEscolhido(p);
  }

  // Gera o preview filtrado com debounce de 150 ms.
  // Chip ou intensidade mudou antes de terminar → previewGenRef detecta e descarta.
  useEffect(() => {
    if (!pendingShot || !filtroEscolhido) {
      previewGenRef.current += 1;
      setPreviewUri(null);
      setPreviewLoading(false);
      return;
    }

    const gen = ++previewGenRef.current;
    setPreviewLoading(true);

    const timer = setTimeout(() => {
      void (async () => {
        try {
          const bytes = await diskFiles().readAll(pendingShot.uri);
          const filtro = filtroFromPreset(filtroEscolhido.id, intensidade);
          if (!filtro || gen !== previewGenRef.current) return;

          const resultado = await previewFiltrado(bytes, "image/jpeg", filtro, skiaDrawer);
          if (gen !== previewGenRef.current) return;

          setPreviewUri(bytesParaDataUri(resultado));
        } catch {
          // Erro silencioso: fallback para o URI original — nunca bloqueia o envio.
        } finally {
          if (gen === previewGenRef.current) setPreviewLoading(false);
        }
      })();
    }, 150);

    return () => clearTimeout(timer);
  }, [filtroEscolhido, intensidade, pendingShot]);

  const refreshPending = useCallback(async () => {
    setPending((await guestQueue().list()).length);
  }, []);

  const tryDrain = useCallback(async () => {
    await drainGuestQueue(guestQueue());
    await refreshPending();
  }, [refreshPending]);

  useEffect(() => {
    void (async () => {
      const raw = await SecureStore.getItemAsync(SESSION_STORE_KEY);
      setSession(parseStoredSession(raw));
      await refreshPending();
    })();
  }, [refreshPending]);

  useFocusEffect(
    useCallback(() => {
      void tryDrain();
    }, [tryDrain]),
  );

  if (session === undefined || permission === null) {
    return <View className="flex-1 bg-bg" />;
  }

  if (session === null) {
    return (
      <Screen>
        <Text title className="text-2xl">
          Câmera
        </Text>
        <Text tone="muted" className="mt-3">
          Pareie de novo para tirar foto.
        </Text>
        <View className="mt-6">
          <Button onPress={() => router.replace("/pair")}>Parear</Button>
        </View>
      </Screen>
    );
  }

  if (!permission.granted) {
    return (
      <Screen>
        <Text title className="text-2xl">
          Câmera
        </Text>
        <Text tone="muted" className="mt-3">
          Sem a câmera o app não tem o que enviar.
        </Text>
        <View className="mt-6">
          {permission.canAskAgain ? (
            <Button onPress={() => void requestPermission()}>Permitir câmera</Button>
          ) : (
            <Text tone="muted">Abra Ajustes e permita a câmera.</Text>
          )}
        </View>
        <View className="mt-4">
          <Button variant="secondary" onPress={() => router.back()}>
            Voltar
          </Button>
        </View>
      </Screen>
    );
  }

  // Contagem regressiva do confessionário (máx 20s).
  useEffect(() => {
    if (!gravando) {
      setSegundosRestantes(20);
      return;
    }
    setSegundosRestantes(20);
    const id = setInterval(() => {
      setSegundosRestantes((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [gravando]);

  // Dispara: foto → revisão/filtro; vídeo (confessionário) → grava e enfileira.
  async function shoot() {
    if (session === null || session === undefined) return;

    // Segundo toque durante a gravação: encerra antes dos 20s.
    if (modoVideo && gravando) {
      try {
        camera.current?.stopRecording();
      } catch {
        // soft — recordAsync ainda resolve
      }
      return;
    }

    if (busy) return;
    setBusy(true);
    setErro(null);
    try {
      if (modoVideo && promptKey) {
        setGravando(true);
        const recording = await camera.current?.recordAsync({ maxDuration: 20 });
        setGravando(false);
        if (!recording?.uri) {
          setErro("Não consegui gravar o vídeo. Tente de novo.");
          return;
        }
        const r = await persistCapture({
          source: { uri: recording.uri },
          eventoId: session.eventoId,
          queue: guestQueue(),
          files: diskFiles(),
          destDir: mediaRoot(),
          id: () => randomUUID(),
          promptKey,
          ...(desafioId ? { desafioId } : {}),
        });
        if (!r.ok) {
          setErro(r.erro);
          return;
        }
        await tryDrain();
        router.back();
        return;
      }

      const shot = await camera.current?.takePictureAsync({
        quality: QUALITY.full,
        exif: false,
        skipProcessing: false,
      });
      if (!shot?.uri) {
        setErro("Não consegui tirar a foto. Tente de novo.");
        return;
      }
      setPendingShot({ uri: shot.uri, width: shot.width, height: shot.height });
      setFiltroEscolhido(null);
    } catch {
      setGravando(false);
      setErro(
        modoVideo
          ? "Não consegui gravar o vídeo. Tente de novo."
          : "Não consegui tirar a foto. Tente de novo.",
      );
    } finally {
      setBusy(false);
      setGravando(false);
    }
  }

  // Abre a galeria do dispositivo e normaliza para JPEG (inclusive HEIC).
  async function pickFromGallery() {
    if (busy || session === null || session === undefined) return;
    setBusy(true);
    setErro(null);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        exif: false,
        quality: QUALITY.full,
        allowsEditing: false,
      });

      if (result.canceled || !result.assets[0]) return;

      const asset = result.assets[0];

      // Sempre normaliza para JPEG: ph:// e content:// URIs não são legíveis
      // com readHead, e HEIC é comum em iPhones com Formatos → Alta Eficiência.
      const normalized = await normalizeSource({
        head: new Uint8Array(0),
        uri: asset.uri,
        width: asset.width ?? undefined,
        height: asset.height ?? undefined,
        alwaysConvert: true,
      });

      if (!normalized.ok) {
        setErro(normalized.erro);
        return;
      }

      setPendingShot(normalized.source);
      setFiltroEscolhido(null);
    } catch {
      setErro("Não consegui abrir a galeria. Tente de novo.");
    } finally {
      setBusy(false);
    }
  }

  // Descarta a foto pendente e volta para a câmera.
  function descartarPendente() {
    setPendingShot(null);
    setFiltroEscolhido(null);
    setIntensidade(1);
    setPreviewUri(null);
    setErro(null);
    setLegenda("");
    setLugarEscolhido(null);
  }

  // Enfileira a foto com (ou sem) o filtro escolhido.
  async function enviar() {
    if (!pendingShot || session === null || session === undefined) return;
    setBusy(true);
    setErro(null);
    try {
      const filtro = filtroEscolhido
        ? filtroFromPreset(filtroEscolhido.id, intensidade)
        : undefined;

      const legendaTrimada = legenda.trim() || null;

      const result = await persistCapture({
        source: pendingShot,
        eventoId: session.eventoId,
        queue: guestQueue(),
        files: diskFiles(),
        destDir: mediaRoot(),
        id: () => randomUUID(),
        desenhista: skiaDrawer,
        ...(filtro ? { filtro } : {}),
        ...(desafioId ? { desafioId } : {}),
        ...(legendaTrimada !== null ? { legenda: legendaTrimada } : {}),
        ...(lugarEscolhido !== null ? { lugar: lugarEscolhido } : {}),
      });

      if (!result.ok) {
        setErro(result.erro);
        return;
      }

      setPendingShot(null);
      setFiltroEscolhido(null);
      setIntensidade(1);
      setPreviewUri(null);
      setLegenda("");
      setLugarEscolhido(null);
      await refreshPending();
      void tryDrain();
    } catch {
      setErro("Não consegui guardar a foto. Tente de novo.");
    } finally {
      setBusy(false);
    }
  }

  // ── Tela de revisão: foto capturada + tira de filtros ────────────────────
  if (pendingShot) {
    return (
      <View className="flex-1 bg-bg">
        <View className="flex-row items-center justify-between px-6 pt-12">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Tirar outra foto"
            onPress={descartarPendente}
            disabled={busy}
          >
            <Text tone="muted">Tirar outra</Text>
          </Pressable>
          <Text tone="muted">Escolha um filtro</Text>
          <View className="w-20" />
        </View>

        {/* Preview da foto: original até o primeiro preset ser processado */}
        <View className="mx-3 mt-3 flex-1 overflow-hidden rounded-superficie bg-superficie">
          <Image
            source={{ uri: previewUri ?? pendingShot.uri }}
            style={{ flex: 1, opacity: previewLoading ? 0.6 : 1 }}
            resizeMode="contain"
            accessibilityLabel="Foto capturada"
          />
        </View>

        {erro ? (
          <Text tone="critical" className="mt-3 px-6">
            {erro}
          </Text>
        ) : null}

        {/* Tira de presets */}
        <View className="mt-4">
          <FilterStrip
            presets={presets}
            escolhido={filtroEscolhido}
            onEscolher={handleEscolherFiltro}
          />
        </View>

        {/* Chips de intensidade — visíveis só quando há preset ativo */}
        {filtroEscolhido ? (
          <View className="mt-3 px-4">
            <IntensidadeChips valor={intensidade} onChange={setIntensidade} />
          </View>
        ) : null}

        {/* Legenda e lugar — opcionais, nunca bloqueiam o envio */}
        <View className="mt-4 px-6">
          <TextInput
            value={legenda}
            onChangeText={(v) => setLegenda(v.slice(0, MAX_LEGENDA))}
            placeholder="Legenda (opcional)"
            maxLength={MAX_LEGENDA}
            multiline
            numberOfLines={2}
            className="rounded-2xl bg-superficie px-3 py-2.5 font-corpo text-sm text-ink"
            accessibilityLabel="Legenda da foto"
          />
          {lugares.length > 0 ? (
            <View className="mt-3">
              <Text tone="muted" className="mb-2 text-xs">
                {perguntaDoLugar}
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerClassName="gap-2"
              >
                {lugares.map((l) => (
                  <Pressable
                    key={l.id}
                    accessibilityRole="button"
                    accessibilityState={{ selected: lugarEscolhido === l.id }}
                    onPress={() => setLugarEscolhido(lugarEscolhido === l.id ? null : l.id)}
                    className={`h-8 items-center justify-center rounded-pilula border px-3 ${
                      lugarEscolhido === l.id
                        ? "border-acento bg-acento"
                        : "border-linha bg-superficie"
                    }`}
                  >
                    <Text
                      tone={lugarEscolhido === l.id ? "onAccent" : "muted"}
                      className="text-xs"
                    >
                      {l.titulo}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          ) : null}
        </View>

        {/* Ações */}
        <View className="px-6 pb-9 pt-4">
          <Button onPress={() => void enviar()} disabled={busy}>
            {busy ? "Enviando…" : "Enviar"}
          </Button>
        </View>
      </View>
    );
  }

  // ── Tela da câmera ────────────────────────────────────────────────────────
  return (
    <View className="flex-1 bg-bg">
      <View className="flex-row items-center justify-between px-6 pt-12">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Voltar"
          onPress={() => router.back()}
        >
          <Text tone="muted">Voltar</Text>
        </Pressable>
        <Text tone={pending > 0 ? "accent" : "muted"}>
          {pending === 0 ? "Câmera" : pending === 1 ? "1 na fila" : `${pending} na fila`}
        </Text>
      </View>

      <View className="mx-3 mt-3 min-h-[16rem] flex-1 overflow-hidden rounded-superficie bg-superficie">
        <CameraView
          ref={camera}
          facing="back"
          mode={modoVideo ? "video" : "picture"}
          style={{ flex: 1 }}
        />
        {gravando ? (
          <View className="absolute left-0 right-0 top-3 items-center">
            <View className="rounded-pilula bg-bg/80 px-4 py-2">
              <Text className="text-sm">
                Gravando… {segundosRestantes}s · toque para parar
              </Text>
            </View>
          </View>
        ) : null}
      </View>

      {modoVideo && promptKey ? (
        <Text tone="muted" className="mt-2 px-6 text-center text-xs">
          {gravando
            ? "Confessionário — gravando (máx. 20s)"
            : "Confessionário — toque para gravar (até 20s)"}
        </Text>
      ) : null}

      {erro ? (
        <Text tone="critical" className="mt-3 px-6">
          {erro}
        </Text>
      ) : null}

      <View className="flex-row items-center justify-center gap-8 px-7 pb-9 pt-5">
        {!modoVideo ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Abrir galeria"
            disabled={busy}
            onPress={() => void pickFromGallery()}
            className={`h-12 min-w-20 items-center justify-center rounded-pilula border border-linha bg-superficie px-4 ${
              busy ? "opacity-55" : ""
            }`}
          >
            <Text tone="muted" className="text-sm">
              Galeria
            </Text>
          </Pressable>
        ) : (
          <View className="w-20" />
        )}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            modoVideo ? (gravando ? "Parar gravação" : "Gravar vídeo") : "Fotografar"
          }
          disabled={busy && !gravando}
          onPress={() => void shoot()}
          className={`size-16 items-center justify-center rounded-pilula border-2 border-ink ${
            busy && !gravando ? "opacity-55" : ""
          }`}
        >
          <View
            className={`size-12 bg-acento ${
              modoVideo ? (gravando ? "size-8 rounded-token" : "rounded-token") : "rounded-pilula"
            }`}
          />
        </Pressable>

        <View className="w-20" />
      </View>
    </View>
  );
}

// ── Chips de intensidade ──────────────────────────────────────────────────────

const OPCOES_INTENSIDADE = [0.25, 0.5, 0.75, 1] as const;

function IntensidadeChips({
  valor,
  onChange,
}: {
  valor: number;
  onChange: (v: number) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerClassName="gap-2"
    >
      {OPCOES_INTENSIDADE.map((v) => (
        <Pressable
          key={v}
          accessibilityRole="button"
          accessibilityState={{ selected: valor === v }}
          onPress={() => onChange(v)}
          className={`h-8 min-w-14 items-center justify-center rounded-pilula border px-3 ${
            valor === v ? "border-acento bg-acento" : "border-linha bg-superficie"
          }`}
        >
          <Text
            tone={valor === v ? "onAccent" : "muted"}
            className="text-xs"
          >
            {Math.round(v * 100)}%
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}
