import { Audio } from "expo-av";

export type PlayerState = "idle" | "playing" | "paused" | "erro";

/** Player mínimo de áudio do recado — falha soft (nunca derruba a tela). Injete `createSound` / `setAudioMode` nos testes. */
export async function tocarUrl(
  url: string,
  opts?: {
    createSound?: typeof Audio.Sound.createAsync;
    setAudioMode?: typeof Audio.setAudioModeAsync;
    onStatus?: (s: PlayerState) => void;
  },
): Promise<{ parar: () => Promise<void> } | null> {
  const create = opts?.createSound ?? Audio.Sound.createAsync.bind(Audio.Sound);
  const setMode = opts?.setAudioMode ?? Audio.setAudioModeAsync.bind(Audio);
  try {
    await setMode({
      playsInSilentModeIOS: true,
      allowsRecordingIOS: false,
    });
    const { sound } = await create({ uri: url }, { shouldPlay: true });
    opts?.onStatus?.("playing");
    sound.setOnPlaybackStatusUpdate((status) => {
      if (!status.isLoaded) {
        opts?.onStatus?.("erro");
        return;
      }
      if (status.didJustFinish) opts?.onStatus?.("idle");
      else if (status.isPlaying) opts?.onStatus?.("playing");
      else opts?.onStatus?.("paused");
    });
    return {
      parar: async () => {
        try {
          await sound.stopAsync();
          await sound.unloadAsync();
        } catch {
          /* soft */
        }
        opts?.onStatus?.("idle");
      },
    };
  } catch {
    opts?.onStatus?.("erro");
    return null;
  }
}
