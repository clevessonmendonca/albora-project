/// <reference types="@cloudflare/workers-types" />

declare global {
  interface CloudflareEnv {
    DRIVE_EXPORT_QUEUE?: Queue;
    JOB_RUNNER_SECRET?: string;
    APP_URL?: string;
    WORKER_SELF_REFERENCE?: Fetcher;
  }
}

export {};
