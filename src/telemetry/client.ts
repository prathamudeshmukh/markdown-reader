import { getSlugFromPath } from '../utils/route';
import { getSessionId } from './utils';
import type { RouteKind, TelemetryEventName, TelemetryPropsByEvent } from './types';

interface TelemetryState {
  enabled: boolean;
  key: string;
  host: string;
  appVersion: string;
}

const DEFAULT_HOST = 'https://us.i.posthog.com';

let state: TelemetryState = {
  enabled: false,
  key: '',
  host: DEFAULT_HOST,
  appVersion: 'unknown',
};

function normalizeHost(host: string): string {
  return host.endsWith('/') ? host.slice(0, -1) : host;
}

function isDoNotTrackEnabled(): boolean {
  if (typeof navigator === 'undefined') return false;
  return navigator.doNotTrack === '1' || navigator.doNotTrack === 'yes';
}

function getRouteKind(): RouteKind {
  try {
    return getSlugFromPath() ? 'doc' : 'root';
  } catch {
    return 'root';
  }
}

export function initTelemetry(): void {
  const key = import.meta.env.VITE_POSTHOG_KEY ?? '';
  const host = import.meta.env.VITE_POSTHOG_HOST ?? DEFAULT_HOST;
  const appVersion = import.meta.env.VITE_APP_VERSION ?? 'unknown';
  const enableInTests = import.meta.env.VITE_TELEMETRY_ENABLE_IN_TESTS === 'true';
  const isTest = import.meta.env.MODE === 'test';

  state = {
    enabled: Boolean(key) && !isDoNotTrackEnabled() && (!isTest || enableInTests),
    key,
    host: normalizeHost(host),
    appVersion,
  };
}

export function isTelemetryEnabled(): boolean {
  return state.enabled;
}

export function track<E extends TelemetryEventName>(
  event: E,
  props: TelemetryPropsByEvent[E],
): void {
  if (!state.enabled) return;

  const sessionId = getSessionId();
  const payload = {
    api_key: state.key,
    event,
    distinct_id: sessionId,
    properties: {
      ...props,
      session_id: sessionId,
      app_version: state.appVersion,
      route_kind: getRouteKind(),
    },
  };

  void fetch(`${state.host}/capture/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => {
    // Telemetry must never break product flows.
  });
}
