import * as BackgroundFetch from "expo-background-fetch";
import * as TaskManager from "expo-task-manager";
import { GUEST_UPLOAD_TASK } from "./upload-task-id";

const INTERVALO_MIN = 15;

let registrado = false;

/** Só testes — reinicia o guard de registro idempotente. */
export function resetGuestUploadBackgroundForTests(): void {
  registrado = false;
}

/** Registra fetch em background para drenar a fila (iOS URLSession / Android WorkManager). */
export async function ensureGuestUploadBackgroundTask(): Promise<void> {
  if (registrado) return;

  const disponivel = await TaskManager.isAvailableAsync();
  if (!disponivel) return;

  const status = await BackgroundFetch.getStatusAsync();
  if (status === BackgroundFetch.BackgroundFetchStatus.Denied) return;

  const ja = await TaskManager.isTaskRegisteredAsync(GUEST_UPLOAD_TASK);
  if (!ja) {
    await BackgroundFetch.registerTaskAsync(GUEST_UPLOAD_TASK, {
      minimumInterval: INTERVALO_MIN * 60,
      stopOnTerminate: false,
      startOnBoot: true,
    });
  }

  registrado = true;
}
