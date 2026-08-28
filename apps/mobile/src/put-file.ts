import {
  FileSystemSessionType,
  FileSystemUploadType,
  uploadAsync,
} from "expo-file-system";
import type { PutFile } from "./upload";

/** PUT presigned a partir do caminho no disco — o caminho que o `URLSession` (iOS) e o upload nativo (Android) conseguem continuar com o app em segundo plano. */
export const putFileFromDisk: PutFile = async ({ caminho, url, mime }) => {
  const result = await uploadAsync(url, caminho, {
    httpMethod: "PUT",
    uploadType: FileSystemUploadType.BINARY_CONTENT,
    headers: { "Content-Type": mime },
    sessionType: FileSystemSessionType.BACKGROUND,
  });
  return { status: result.status };
};
