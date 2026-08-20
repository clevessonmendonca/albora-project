import * as TaskManager from "expo-task-manager";
import { guestQueue } from "./disk";
import { drainGuestQueue } from "./drain-guest";
import { GUEST_UPLOAD_TASK } from "./upload-task-id";

export { GUEST_UPLOAD_TASK };

TaskManager.defineTask(GUEST_UPLOAD_TASK, async () => {
  try {
    await drainGuestQueue(guestQueue());
    return TaskManager.BackgroundFetchResult.NewData;
  } catch {
    return TaskManager.BackgroundFetchResult.Failed;
  }
});
