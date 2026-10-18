// Substitui @sentry/nextjs no build enxuto do Worker (CF_SEM_SENTRY=1): mesma superfície que o app usa, sem efeito.
const noop = () => undefined;

export const init = noop;
export const captureException = noop;
export const captureRequestError = noop;
export const setTag = noop;
export const replayIntegration = () => ({});
export const withScope = (callback: (scope: unknown) => unknown) => callback({});
