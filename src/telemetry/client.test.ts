import { beforeEach, describe, expect, it, vi } from 'vitest';
import { initTelemetry, isTelemetryEnabled, track } from './client';

describe('telemetry client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 200 })));
    sessionStorage.clear();
    vi.unstubAllEnvs();
    vi.stubEnv('VITE_POSTHOG_KEY', '');
    vi.stubEnv('VITE_POSTHOG_HOST', '');
    vi.stubEnv('VITE_APP_VERSION', '');
    vi.stubEnv('VITE_TELEMETRY_ENABLE_IN_TESTS', '');
    Object.defineProperty(window.navigator, 'doNotTrack', {
      value: '0',
      configurable: true,
    });
  });

  it('disables telemetry when DNT is enabled', () => {
    vi.stubEnv('VITE_POSTHOG_KEY', 'phc_test');
    vi.stubEnv('VITE_TELEMETRY_ENABLE_IN_TESTS', 'true');
    Object.defineProperty(window.navigator, 'doNotTrack', {
      value: '1',
      configurable: true,
    });

    initTelemetry();
    track('app_opened', { entry: 'new_doc', has_slug: false });

    expect(isTelemetryEnabled()).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('disables telemetry when key is missing', () => {
    vi.stubEnv('VITE_POSTHOG_KEY', '');
    vi.stubEnv('VITE_TELEMETRY_ENABLE_IN_TESTS', 'true');

    initTelemetry();
    track('app_opened', { entry: 'new_doc', has_slug: false });

    expect(isTelemetryEnabled()).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('sends valid payload when enabled', () => {
    vi.stubEnv('VITE_POSTHOG_KEY', 'phc_test');
    vi.stubEnv('VITE_POSTHOG_HOST', 'https://us.i.posthog.com');
    vi.stubEnv('VITE_APP_VERSION', '1.2.3');
    vi.stubEnv('VITE_TELEMETRY_ENABLE_IN_TESTS', 'true');

    initTelemetry();
    track('link_copied', { has_slug: true, source: 'button' });

    expect(isTelemetryEnabled()).toBe(true);
    expect(fetch).toHaveBeenCalledOnce();
    expect(fetch).toHaveBeenCalledWith(
      'https://us.i.posthog.com/capture/',
      expect.objectContaining({
        method: 'POST',
      }),
    );

    const [, options] = vi.mocked(fetch).mock.calls[0];
    const body = JSON.parse((options as RequestInit).body as string) as {
      api_key: string;
      event: string;
      properties: {
        session_id: string;
        app_version: string;
        route_kind: string;
        source: string;
        has_slug: boolean;
      };
      distinct_id: string;
    };

    expect(body.api_key).toBe('phc_test');
    expect(body.event).toBe('link_copied');
    expect(body.properties.app_version).toBe('1.2.3');
    expect(body.properties.route_kind).toBe('root');
    expect(body.properties.source).toBe('button');
    expect(body.properties.has_slug).toBe(true);
    expect(body.properties.session_id).toBe(body.distinct_id);
  });
});
