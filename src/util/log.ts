// The app sends nothing anywhere (factory-app.json firebase "none"): errors only go to the device log (logcat),
// where verification looks for them. No personal data: callers pass a short context, never user content.
export function logError(error: unknown, context: string): void {
  const message = error instanceof Error ? error.message : String(error);
  console.warn(`[error] ${context}: ${message}`);
}
