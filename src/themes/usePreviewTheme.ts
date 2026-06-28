import { useState } from 'react';
import { isValidThemeId, type PreviewThemeId } from './previewThemes';
import { track } from '../telemetry';

const STORAGE_KEY = 'openmark:preview-theme';

function readStoredTheme(): PreviewThemeId {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return isValidThemeId(stored) ? stored : 'default';
  } catch {
    return 'default';
  }
}

export function usePreviewTheme(): [PreviewThemeId, (id: PreviewThemeId) => void] {
  const [theme, setThemeState] = useState<PreviewThemeId>(readStoredTheme);

  function setTheme(id: PreviewThemeId): void {
    localStorage.setItem(STORAGE_KEY, id);
    setThemeState(id);
    track('theme_changed', { theme_id: id });
  }

  return [theme, setTheme];
}
