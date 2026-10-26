/**
 * Single place errors and warnings go through, so production error reporting
 * (Sentry or similar) can be added here without touching every caller.
 * Arguments pass straight through to the console.
 */
export function reportError(...args) {
  console.error(...args);
}

export function reportWarning(...args) {
  console.warn(...args);
}
