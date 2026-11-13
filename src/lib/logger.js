/**
 * Single place errors and warnings go through. Arguments always reach the
 * console; if a reporter has been registered with setErrorReporter() (Sentry,
 * LogRocket, a webhook...) errors are forwarded to it as well, so production
 * reporting can be switched on here without touching any caller.
 */
let reporter = null;

/** Register a function `(error, context) => void` that receives every reported error, or null to clear it. */
export function setErrorReporter(fn) {
  reporter = typeof fn === 'function' ? fn : null;
}

export function reportError(...args) {
  console.error(...args);
  try {
    reporter?.(args[0], args.slice(1));
  } catch {
    // A failing reporter must never break the app it is reporting on.
  }
}

export function reportWarning(...args) {
  console.warn(...args);
}

/** Send uncaught exceptions and unhandled promise rejections through reportError. */
export function installGlobalErrorHandlers(target = window) {
  const onError = event => reportError(event.error ?? event.message, { source: 'window.onerror' });
  const onRejection = event => reportError(event.reason, { source: 'unhandledrejection' });
  target.addEventListener('error', onError);
  target.addEventListener('unhandledrejection', onRejection);
  return () => {
    target.removeEventListener('error', onError);
    target.removeEventListener('unhandledrejection', onRejection);
  };
}
