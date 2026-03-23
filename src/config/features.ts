export interface FeatureFlags {
  usePdfApi: boolean;
}

export function readFeatureFlags(): FeatureFlags {
  return { usePdfApi: import.meta.env.VITE_USE_PDF_API === 'true' };
}
