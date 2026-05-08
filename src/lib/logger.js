/**
 * Single place errors and warnings go through, so production error reporting
 * (Sentry or similar) can be added here without touching every caller.
 */
export function reportError(error, context) {
  console.error(error, context ?? '');
}

export function reportWarning(message, detail) {
  console.warn(message, detail ?? '');
}
