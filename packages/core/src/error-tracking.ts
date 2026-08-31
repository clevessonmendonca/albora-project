/**
 * Error Tracking Infrastructure
 * 
 * Infraestrutura preparada para integração com Sentry ou similar.
 * Captura erros, stack traces e contexto (sem PII).
 */

export type ErrorSeverity = "fatal" | "error" | "warning" | "info" | "debug";

export type ErrorContext = {
  eventId?: string;
  sessionId?: string;
  uploadId?: string;
  route?: string;
  action?: string;
  [key: string]: unknown;
};

export type CapturedError = {
  message: string;
  stack?: string;
  severity: ErrorSeverity;
  context: ErrorContext;
  timestamp: number;
  fingerprint?: string[];
};

/**
 * Interface para provider de error tracking (Sentry, etc)
 */
export interface ErrorTrackingProvider {
  captureException(error: Error, context?: ErrorContext): void;
  captureMessage(message: string, severity: ErrorSeverity, context?: ErrorContext): void;
  setUser(userId: string | null): void;
  setContext(key: string, data: Record<string, unknown>): void;
}

/**
 * Provider padrão (apenas logs)
 */
class ConsoleErrorProvider implements ErrorTrackingProvider {
  captureException(error: Error, context?: ErrorContext): void {
    console.error("error.captured", {
      message: error.message,
      stack: error.stack,
      context,
      timestamp: Date.now(),
    });
  }

  captureMessage(message: string, severity: ErrorSeverity, context?: ErrorContext): void {
    const logger = severity === "error" || severity === "fatal" ? console.error : console.warn;
    logger(`error.${severity}`, { message, context, timestamp: Date.now() });
  }

  setUser(_userId: string | null): void {}
  setContext(_key: string, _data: Record<string, unknown>): void {}
}

/**
 * Configuração global do error tracking
 */
let errorProvider: ErrorTrackingProvider = new ConsoleErrorProvider();

/**
 * Configura o provider de error tracking
 */
export function configureErrorTracking(provider: ErrorTrackingProvider): void {
  errorProvider = provider;
}

/**
 * Captura exception com contexto
 * 
 * @example
 * try {
 *   await uploadPhoto();
 * } catch (e) {
 *   captureException(e, { eventId, uploadId, action: 'upload_photo' });
 *   throw e;
 * }
 */
export function captureException(error: unknown, context?: ErrorContext): void {
  if (error instanceof Error) {
    errorProvider.captureException(error, context);
  } else {
    errorProvider.captureMessage(
      typeof error === "string" ? error : "Unknown error",
      "error",
      context,
    );
  }
}

/**
 * Captura mensagem estruturada
 * 
 * @example
 * captureMessage('Upload falhou após 3 tentativas', 'warning', { eventId, uploadId });
 */
export function captureMessage(
  message: string,
  severity: ErrorSeverity = "info",
  context?: ErrorContext,
): void {
  errorProvider.captureMessage(message, severity, context);
}

/**
 * Define contexto do usuário (sem PII)
 * Apenas IDs, nunca nome/email/telefone
 */
export function setUserContext(userId: string | null): void {
  errorProvider.setUser(userId);
}

/**
 * Define contexto adicional
 */
export function setErrorContext(key: string, data: Record<string, unknown>): void {
  errorProvider.setContext(key, data);
}

/**
 * Wrapper para capturar erros async com contexto
 */
export function withErrorTracking<T>(
  fn: () => Promise<T>,
  context?: ErrorContext,
): Promise<T> {
  return fn().catch((error) => {
    captureException(error, context);
    throw error;
  });
}
