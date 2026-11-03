// Firebase wrapper. Nothing is collected until the player consents (firebase.json disables auto collection).
// Every call is a no-op when consent is missing or when Firebase is not configured (no google-services.json).
import { getAnalytics, logEvent, setAnalyticsCollectionEnabled, setConsent } from '@react-native-firebase/analytics';
import {
  getCrashlytics,
  log as crashlyticsLog,
  recordError,
  setCrashlyticsCollectionEnabled,
} from '@react-native-firebase/crashlytics';

import { EventName, TelemetryEvents, sanitizeParams } from './events';

let enabled = false;
let warned = false;

function warn(error: unknown) {
  if (__DEV__ && !warned) {
    warned = true;
    console.warn('[telemetry] Firebase unavailable, telemetry disabled:', String(error));
  }
}

export function isTelemetryEnabled(): boolean {
  return enabled;
}

export async function applyConsent(granted: boolean): Promise<void> {
  enabled = granted;
  try {
    const analytics = getAnalytics();
    await setConsent(analytics, {
      analytics_storage: granted,
      ad_storage: false,
      ad_user_data: false,
      ad_personalization: false,
    });
    await setAnalyticsCollectionEnabled(analytics, granted);
    await setCrashlyticsCollectionEnabled(getCrashlytics(), granted);
  } catch (error) {
    warn(error);
  }
}

export function track<N extends EventName>(name: N, params: TelemetryEvents[N]): void {
  if (!enabled) return;
  try {
    Promise.resolve(logEvent(getAnalytics(), name, sanitizeParams(params))).catch(warn);
  } catch (error) {
    warn(error);
  }
}

// Non-fatal error with a short, non-personal context label (e.g. "load_best_score").
export function reportError(error: unknown, context: string): void {
  if (!enabled) return;
  try {
    const crashlytics = getCrashlytics();
    crashlyticsLog(crashlytics, context);
    recordError(crashlytics, error instanceof Error ? error : new Error(String(error)));
  } catch (err) {
    warn(err);
  }
}
