import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  registerTaskAsync: vi.fn(async () => undefined),
  isTaskRegisteredAsync: vi.fn(async () => false),
  isAvailableAsync: vi.fn(async () => true),
  getStatusAsync: vi.fn(async () => 1),
}));

vi.mock("expo-background-fetch", () => ({
  BackgroundFetchStatus: { Denied: 2 },
  getStatusAsync: mocks.getStatusAsync,
  registerTaskAsync: mocks.registerTaskAsync,
}));

vi.mock("expo-task-manager", () => ({
  isAvailableAsync: mocks.isAvailableAsync,
  isTaskRegisteredAsync: mocks.isTaskRegisteredAsync,
}));

import {
  ensureGuestUploadBackgroundTask,
  resetGuestUploadBackgroundForTests,
} from "./background-drain";

describe("ensureGuestUploadBackgroundTask", () => {
  beforeEach(() => {
    resetGuestUploadBackgroundForTests();
    mocks.registerTaskAsync.mockClear();
    mocks.isTaskRegisteredAsync.mockClear();
    mocks.isAvailableAsync.mockResolvedValue(true);
    mocks.getStatusAsync.mockResolvedValue(1);
    mocks.isTaskRegisteredAsync.mockResolvedValue(false);
  });

  it("registra a task na primeira chamada", async () => {
    await ensureGuestUploadBackgroundTask();
    expect(mocks.registerTaskAsync).toHaveBeenCalledWith(
      "albora-guest-upload-drain",
      expect.objectContaining({
        stopOnTerminate: false,
        startOnBoot: true,
      }),
    );
  });

  it("não registra quando o SO nega background fetch", async () => {
    mocks.getStatusAsync.mockResolvedValue(2);
    await ensureGuestUploadBackgroundTask();
    expect(mocks.registerTaskAsync).not.toHaveBeenCalled();
  });
});
