import * as TaskManager from "expo-task-manager";
import { guestQueue } from "./disk";
import { drainGuestQueue } from "./drain-guest";
import { loadSession } from "./feed";
import { GUEST_UPLOAD_TASK } from "./upload-task-id";

export { GUEST_UPLOAD_TASK };

TaskManager.defineTask(GUEST_UPLOAD_TASK, async () => {
  try {
    const session = await loadSession();
    if (!session) return TaskManager.BackgroundFetchResult.NoData;

    const summary = await drainGuestQueue(guestQueue(), "background");
    if (summary.enviados > 0 || summary.retentar > 0) {
      return TaskManager.BackgroundFetchResult.NewData;
    }
    return TaskManager.BackgroundFetchResult.NoData;
  } catch {
    return TaskManager.BackgroundFetchResult.Failed;
  }
});
