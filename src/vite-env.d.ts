/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_POSTHOG_KEY?: string;
  readonly VITE_POSTHOG_HOST?: string;
  readonly VITE_APP_VERSION?: string;
  readonly VITE_TELEMETRY_ENABLE_IN_TESTS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
